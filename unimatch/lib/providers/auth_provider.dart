import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/user_model.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  final FirestoreService _firestoreService;

  User? _firebaseUser;
  UserModel? _userModel;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider({
    required AuthService authService,
    required FirestoreService firestoreService,
  })  : _authService = authService,
        _firestoreService = firestoreService {
    // Listen to auth state changes
    _authService.authStateChanges.listen(_onAuthStateChanged);
  }

  // Getters
  User? get firebaseUser => _firebaseUser;
  UserModel? get userModel => _userModel;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _firebaseUser != null;
  bool get hasCompletedProfile => _userModel != null;

  // Sign in with Google
  Future<bool> signInWithGoogle() async {
    _setLoading(true);
    _errorMessage = null;

    try {
      final userCredential = await _authService.signInWithGoogle();
      
      if (userCredential == null) {
        _setLoading(false);
        return false;
      }

      // Check if user profile exists
      final userExists = await _firestoreService.userExists(userCredential.user!.uid);
      
      if (userExists) {
        // Load user profile
        _userModel = await _firestoreService.getUser(userCredential.user!.uid);
      }

      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Sign out
  Future<void> signOut() async {
    _setLoading(true);
    try {
      await _authService.signOut();
      _firebaseUser = null;
      _userModel = null;
      _setLoading(false);
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
    }
  }

  // Create user profile (after onboarding)
  Future<bool> createUserProfile(UserModel user) async {
    _setLoading(true);
    try {
      await _firestoreService.createUser(user);
      _userModel = user;
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Update user profile
  Future<bool> updateUserProfile(Map<String, dynamic> updates) async {
    if (_firebaseUser == null) return false;

    _setLoading(true);
    try {
      await _firestoreService.updateUser(_firebaseUser!.uid, updates);
      
      // Reload user model
      _userModel = await _firestoreService.getUser(_firebaseUser!.uid);
      
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _setLoading(false);
      return false;
    }
  }

  // Load user profile
  Future<void> loadUserProfile() async {
    if (_firebaseUser == null) return;

    try {
      _userModel = await _firestoreService.getUser(_firebaseUser!.uid);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
    }
  }

  // Auth state changed handler
  void _onAuthStateChanged(User? user) {
    _firebaseUser = user;
    if (user == null) {
      _userModel = null;
    } else {
      loadUserProfile();
    }
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
