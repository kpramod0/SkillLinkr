import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/request_model.dart';
import '../models/match_model.dart';
import '../models/message_model.dart';
import '../models/notification_model.dart';
import '../models/swipe_action_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ===== USERS =====

  Future<void> createUser(UserModel user) async {
    await _db.collection('users').doc(user.uid).set(user.toMap());
  }

  Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    await _db.collection('users').doc(uid).update({
      ...data,
      'updatedAt': DateTime.now().toIso8601String(),
    });
  }

  Future<UserModel?> getUser(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return UserModel.fromMap(doc.data()!);
  }

  Stream<UserModel?> getUserStream(String uid) {
    return _db.collection('users').doc(uid).snapshots().map((doc) {
      if (!doc.exists) return null;
      return UserModel.fromMap(doc.data()!);
    });
  }

  Future<bool> userExists(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    return doc.exists;
  }

  // ===== SWIPE ACTIONS =====

  Future<void> recordSwipeAction(String uid, String targetUid, String action) async {
    await _db
        .collection('swipes')
        .doc(uid)
        .collection('actions')
        .doc(targetUid)
        .set(SwipeActionModel(targetUid: targetUid, action: action).toMap());
  }

  Future<List<String>> getSwipedUserIds(String uid) async {
    final snapshot = await _db
        .collection('swipes')
        .doc(uid)
        .collection('actions')
        .get();
    
    return snapshot.docs.map((doc) => doc.id).toList();
  }

  Future<List<SwipeActionModel>> getBookmarkedUsers(String uid) async {
    final snapshot = await _db
        .collection('swipes')
        .doc(uid)
        .collection('actions')
        .where('action', isEqualTo: 'bookmark')
        .get();
    
    return snapshot.docs
        .map((doc) => SwipeActionModel.fromMap(doc.data(), doc.id))
        .toList();
  }

  // ===== REQUESTS =====

  Future<String> createRequest(String fromUid, String toUid) async {
    final docRef = await _db.collection('requests').add({
      'fromUid': fromUid,
      'toUid': toUid,
      'status': 'pending',
      'createdAt': DateTime.now().toIso8601String(),
    });
    return docRef.id;
  }

  Future<void> updateRequestStatus(String requestId, String status) async {
    await _db.collection('requests').doc(requestId).update({
      'status': status,
      'respondedAt': DateTime.now().toIso8601String(),
    });
  }

  Stream<List<RequestModel>> getIncomingRequests(String uid) {
    return _db
        .collection('requests')
        .where('toUid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => RequestModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Stream<List<RequestModel>> getOutgoingRequests(String uid) {
    return _db
        .collection('requests')
        .where('fromUid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => RequestModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<List<String>> getRequestedUserIds(String uid) async {
    // Get users to whom current user has sent requests
    final outgoing = await _db
        .collection('requests')
        .where('fromUid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .get();
    
    // Get users from whom current user has received requests
    final incoming = await _db
        .collection('requests')
        .where('toUid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .get();
    
    final outgoingIds = outgoing.docs.map((doc) => doc.data()['toUid'] as String).toList();
    final incomingIds = incoming.docs.map((doc) => doc.data()['fromUid'] as String).toList();
    
    return [...outgoingIds, ...incomingIds];
  }

  // ===== MATCHES =====

  Future<String> createMatch(String uid1, String uid2) async {
    final docRef = await _db.collection('matches').add({
      'users': [uid1, uid2],
      'createdAt': DateTime.now().toIso8601String(),
    });
    return docRef.id;
  }

  Stream<List<MatchModel>> getMatches(String uid) {
    return _db
        .collection('matches')
        .where('users', arrayContains: uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => MatchModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<List<String>> getMatchedUserIds(String uid) async {
    final snapshot = await _db
        .collection('matches')
        .where('users', arrayContains: uid)
        .get();
    
    return snapshot.docs
        .map((doc) {
          final users = List<String>.from(doc.data()['users']);
          return users.firstWhere((u) => u != uid, orElse: () => '');
        })
        .where((id) => id.isNotEmpty)
        .toList();
  }

  // ===== MESSAGES =====

  Future<void> sendMessage(String matchId, MessageModel message) async {
    await _db
        .collection('chats')
        .doc(matchId)
        .collection('messages')
        .add(message.toMap());
  }

  Stream<List<MessageModel>> getMessages(String matchId) {
    return _db
        .collection('chats')
        .doc(matchId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => MessageModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<MessageModel?> getLastMessage(String matchId) async {
    final snapshot = await _db
        .collection('chats')
        .doc(matchId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .limit(1)
        .get();
    
    if (snapshot.docs.isEmpty) return null;
    return MessageModel.fromMap(snapshot.docs.first.data(), snapshot.docs.first.id);
  }

  // ===== NOTIFICATIONS =====

  Future<void> createNotification(
    String uid,
    String type,
    String fromUid,
    String message, {
    Map<String, dynamic>? data,
  }) async {
    await _db
        .collection('notifications')
        .doc(uid)
        .collection('items')
        .add({
      'type': type,
      'fromUid': fromUid,
      'message': message,
      'read': false,
      'timestamp': DateTime.now().toIso8601String(),
      'data': data,
    });
  }

  Stream<List<NotificationModel>> getNotifications(String uid) {
    return _db
        .collection('notifications')
        .doc(uid)
        .collection('items')
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => NotificationModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<void> markNotificationAsRead(String uid, String notificationId) async {
    await _db
        .collection('notifications')
        .doc(uid)
        .collection('items')
        .doc(notificationId)
        .update({'read': true});
  }

  Future<int> getUnreadNotificationCount(String uid) async {
    final snapshot = await _db
        .collection('notifications')
        .doc(uid)
        .collection('items')
        .where('read', isEqualTo: false)
        .get();
    
    return snapshot.docs.length;
  }

  // ===== SEARCH AND FILTERS =====

  Future<List<UserModel>> searchUsers({
    required String currentUid,
    String? query,
    String? gender,
    int? minAge,
    int? maxAge,
    int? year,
    List<String>? skills,
    List<String>? interests,
    List<String>? languages,
    int limit = 50,
  }) async {
    Query<Map<String, dynamic>> queryRef = _db.collection('users');

    // Apply filters
    if (gender != null && gender != 'Both') {
      queryRef = queryRef.where('gender', isEqualTo: gender);
    }
    
    if (year != null) {
      queryRef = queryRef.where('yearOfStudy', isEqualTo: year);
    }

    final snapshot = await queryRef.limit(limit).get();
    
    List<UserModel> users = snapshot.docs
        .where((doc) => doc.id != currentUid) // Exclude self
        .map((doc) => UserModel.fromMap(doc.data()))
        .toList();

    // Apply additional filters in-memory (Firestore has limitations on array-contains queries)
    if (query != null && query.isNotEmpty) {
      users = users.where((user) {
        final lowerQuery = query.toLowerCase();
        return user.fullName.toLowerCase().contains(lowerQuery) ||
            user.skills.any((s) => s.toLowerCase().contains(lowerQuery)) ||
            user.interests.any((i) => i.toLowerCase().contains(lowerQuery));
      }).toList();
    }

    if (minAge != null) {
      users = users.where((user) => user.age >= minAge).toList();
    }

    if (maxAge != null) {
      users = users.where((user) => user.age <= maxAge).toList();
    }

    if (skills != null && skills.isNotEmpty) {
      users = users.where((user) {
        return skills.any((skill) => user.skills.contains(skill));
      }).toList();
    }

    if (interests != null && interests.isNotEmpty) {
      users = users.where((user) {
        return interests.any((interest) => user.interests.contains(interest));
      }).toList();
    }

    if (languages != null && languages.isNotEmpty) {
      users = users.where((user) {
        return languages.any((lang) => user.languages.contains(lang));
      }).toList();
    }

    return users;
  }
}
