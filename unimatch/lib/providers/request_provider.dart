import 'package:flutter/material.dart';
import '../models/request_model.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';

class RequestProvider with ChangeNotifier {
  final FirestoreService _firestoreService;
  final String currentUserId;

  List<RequestModel> _incomingRequests = [];
  List<RequestModel> _outgoingRequests = [];
  Map<String, UserModel> _requestUsers = {}; // Cache user data
  bool _isLoading = false;
  String? _errorMessage;

  RequestProvider({
    required FirestoreService firestoreService,
    required this.currentUserId,
  }) : _firestoreService = firestoreService {
    _listenToRequests();
  }

  // Getters
  List<RequestModel> get incomingRequests => _incomingRequests;
  List<RequestModel> get outgoingRequests => _outgoingRequests;
  Map<String, UserModel> get requestUsers => _requestUsers;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get incomingRequestCount => _incomingRequests.length;

  // Listen to incoming requests
  void _listenToRequests() {
    // Listen to incoming requests
    _firestoreService.getIncomingRequests(currentUserId).listen((requests) async {
      _incomingRequests = requests;
      
      // Load user data for each request
      for (var request in requests) {
        if (!_requestUsers.containsKey(request.fromUid)) {
          final user = await _firestoreService.getUser(request.fromUid);
          if (user != null) {
            _requestUsers[request.fromUid] = user;
          }
        }
      }
      
      notifyListeners();
    });

    // Listen to outgoing requests
    _firestoreService.getOutgoingRequests(currentUserId).listen((requests) async {
      _outgoingRequests = requests;
      
      // Load user data for each request
      for (var request in requests) {
        if (!_requestUsers.containsKey(request.toUid)) {
          final user = await _firestoreService.getUser(request.toUid);
          if (user != null) {
            _requestUsers[request.toUid] = user;
          }
        }
      }
      
      notifyListeners();
    });
  }

  // Accept request (creates match)
  Future<bool> acceptRequest(RequestModel request) async {
    _setLoading(true);

    try {
      // Update request status
      await _firestoreService.updateRequestStatus(request.id, 'accepted');

      // Create match
      await _firestoreService.createMatch(request.fromUid, request.toUid);

      // Create notification for sender
      await _firestoreService.createNotification(
        request.fromUid,
        'match',
        currentUserId,
        'Your connection request was accepted!',
      );

      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Reject request
  Future<bool> rejectRequest(RequestModel request) async {
    _setLoading(true);

    try {
      // Update request status
      await _firestoreService.updateRequestStatus(request.id, 'rejected');

      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
      return false;
    }
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
