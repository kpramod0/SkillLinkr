import 'package:flutter/material.dart';
import '../models/match_model.dart';
import '../models/message_model.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';
import 'package:uuid/uuid.dart';

class ChatProvider with ChangeNotifier {
  final FirestoreService _firestoreService;
  final String currentUserId;

  List<MatchModel> _matches = [];
  Map<String, UserModel> _matchedUsers = {}; // Cache user data
  Map<String, List<MessageModel>> _messages = {}; // Messages per match
  Map<String, MessageModel?> _lastMessages = {}; // Last message per match
  bool _isLoading = false;
  String? _errorMessage;

  ChatProvider({
    required FirestoreService firestoreService,
    required this.currentUserId,
  }) : _firestoreService = firestoreService {
    _listenToMatches();
  }

  // Getters
  List<MatchModel> get matches => _matches;
  Map<String, UserModel> get matchedUsers => _matchedUsers;
  Map<String, List<MessageModel>> get messages => _messages;
  Map<String, MessageModel?> get lastMessages => _lastMessages;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Listen to matches
  void _listenToMatches() {
    _firestoreService.getMatches(currentUserId).listen((matches) async {
      _matches = matches;

      // Load matched users and last messages
      for (var match in matches) {
        final otherUserId = match.getOtherUserId(currentUserId);
        
        // Load user data
        if (!_matchedUsers.containsKey(otherUserId)) {
          final user = await _firestoreService.getUser(otherUserId);
          if (user != null) {
            _matchedUsers[otherUserId] = user;
          }
        }

        // Load last message
        final lastMsg = await _firestoreService.getLastMessage(match.id);
        _lastMessages[match.id] = lastMsg;
      }

      notifyListeners();
    });
  }

  // Listen to messages for a specific match
  void listenToMessages(String matchId) {
    _firestoreService.getMessages(matchId).listen((messages) {
      _messages[matchId] = messages;
      if (messages.isNotEmpty) {
        _lastMessages[matchId] = messages.last;
      }
      notifyListeners();
    });
  }

  // Send message
  Future<bool> sendMessage(String matchId, String text) async {
    if (text.trim().isEmpty) return false;

    try {
      final message = MessageModel(
        id: const Uuid().v4(),
        senderId: currentUserId,
        text: text.trim(),
      );

      await _firestoreService.sendMessage(matchId, message);

      // Get the match to find the other user
      final match = _matches.firstWhere((m) => m.id == matchId);
      final otherUserId = match.getOtherUserId(currentUserId);

      // Create notification for other user
      await _firestoreService.createNotification(
        otherUserId,
        'message',
        currentUserId,
        'New message from ${_matchedUsers[currentUserId]?.fullName ?? "someone"}',
        data: {'matchId': matchId},
      );

      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Get match by user ID
  MatchModel? getMatchByUserId(String userId) {
    try {
      return _matches.firstWhere(
        (match) => match.users.contains(userId) && match.users.contains(currentUserId),
      );
    } catch (e) {
      return null;
    }
  }

  // Get unread message count (simplified - could be enhanced)
  int getUnreadCount(String matchId) {
    final msgs = _messages[matchId];
    if (msgs == null) return 0;
    
    return msgs.where((msg) => msg.senderId != currentUserId && !msg.read).length;
  }
}
