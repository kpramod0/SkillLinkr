import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../models/swipe_action_model.dart';
import '../services/firestore_service.dart';

class SwipeProvider with ChangeNotifier {
  final FirestoreService _firestoreService;
  final String currentUserId;

  List<UserModel> _swipeFeed = [];
  List<UserModel> _bookmarkedUsers = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Filter variables
  String? filterGender;
  int? filterMinAge;
  int? filterMaxAge;
  int? filterYear;
  List<String>? filterSkills;
  List<String>? filterInterests;
  List<String>? filterLanguages;

  SwipeProvider({
    required FirestoreService firestoreService,
    required this.currentUserId,
  }) : _firestoreService = firestoreService;

  // Getters
  List<UserModel> get swipeFeed => _swipeFeed;
  List<UserModel> get bookmarkedUsers => _bookmarkedUsers;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Load swipe feed
  Future<void> loadSwipeFeed() async {
    _setLoading(true);

    try {
      // Get current user to know their preferred gender
      final currentUser = await _firestoreService.getUser(currentUserId);
      
      // Get list of users to exclude
      final swipedIds = await _firestoreService.getSwipedUserIds(currentUserId);
      final requestedIds = await _firestoreService.getRequestedUserIds(currentUserId);
      final matchedIds = await _firestoreService.getMatchedUserIds(currentUserId);
      
      final excludedIds = {
        ...swipedIds,
        ...requestedIds,
        ...matchedIds,
        currentUserId,
      }.toList();

      // Search users with filters
      List<UserModel> users = await _firestoreService.searchUsers(
        currentUid: currentUserId,
        gender: filterGender ?? currentUser?.preferredGender,
        minAge: filterMinAge,
        maxAge: filterMaxAge,
        year: filterYear,
        skills: filterSkills,
        interests: filterInterests,
        languages: filterLanguages,
      );

      // Remove excluded users
      users = users.where((user) => !excludedIds.contains(user.uid)).toList();

      _swipeFeed = users;
      _setLoading(false);
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
    }
  }

  // Like user (send request)
  Future<bool> likeUser(String targetUid) async {
    try {
      await _firestoreService.recordSwipeAction(
        currentUserId,
        targetUid,
        'like',
      );
      
      // Create request (this should ideally go through Cloud Function)
      await _firestoreService.createRequest(currentUserId, targetUid);
      
      // Create notification
      await _firestoreService.createNotification(
        targetUid,
        'request',
        currentUserId,
        'You have a new connection request!',
      );

      // Remove from feed
      _swipeFeed.removeWhere((user) => user.uid == targetUid);
      notifyListeners();
      
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Reject user
  Future<bool> rejectUser(String targetUid) async {
    try {
      await _firestoreService.recordSwipeAction(
        currentUserId,
        targetUid,
        'reject',
      );

      // Remove from feed
      _swipeFeed.removeWhere((user) => user.uid == targetUid);
      notifyListeners();
      
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Bookmark user
  Future<bool> bookmarkUser(String targetUid) async {
    try {
      await _firestoreService.recordSwipeAction(
        currentUserId,
        targetUid,
        'bookmark',
      );

      // Remove from feed
      _swipeFeed.removeWhere((user) => user.uid == targetUid);
      notifyListeners();
      
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Load bookmarked users
  Future<void> loadBookmarkedUsers() async {
    try {
      final bookmarks = await _firestoreService.getBookmarkedUsers(currentUserId);
      
      List<UserModel> users = [];
      for (var bookmark in bookmarks) {
        final user = await _firestoreService.getUser(bookmark.targetUid);
        if (user != null) {
          users.add(user);
        }
      }
      
      _bookmarkedUsers = users;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
    }
  }

  // Apply filters
  void applyFilters({
    String? gender,
    int? minAge,
    int? maxAge,
    int? year,
    List<String>? skills,
    List<String>? interests,
    List<String>? languages,
  }) {
    filterGender = gender;
    filterMinAge = minAge;
    filterMaxAge = maxAge;
    filterYear = year;
    filterSkills = skills;
    filterInterests = interests;
    filterLanguages = languages;
    notifyListeners();
  }

  // Clear filters
  void clearFilters() {
    filterGender = null;
    filterMinAge = null;
    filterMaxAge = null;
    filterYear = null;
    filterSkills = null;
    filterInterests = null;
    filterLanguages = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
