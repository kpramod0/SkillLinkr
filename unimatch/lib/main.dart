// Flutter core imports
import 'package:flutter/material.dart';
// Firebase core for initialization
import 'package:firebase_core/firebase_core.dart';
// Provider package for state management
import 'package:provider/provider.dart';

// App theme configuration
import 'core/theme/app_theme.dart';

// Service layer - handles Firebase operations
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'services/messaging_service.dart';

// State management providers
import 'providers/auth_provider.dart';
import 'providers/swipe_provider.dart';
import 'providers/request_provider.dart';
import 'providers/chat_provider.dart';

// Screen imports
import 'screens/auth/login_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/main_navigation.dart';

/// Main entry point of the application
void main() async {
  // Ensure Flutter binding is initialized before Firebase
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase with error handling
  try {
    await Firebase.initializeApp();
  } catch (e) {
    // Log error if Firebase initialization fails
    print('Firebase initialization error: $e');
    print('Please run: flutterfire configure');
  }

  // Start the Flutter app
  runApp(const MyApp());
}

/// Root application widget
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Wrap entire app with MultiProvider for state management
    return MultiProvider(
      providers: [
        // === Service Providers (Singletons) ===
        
        // Authentication service - handles Google Sign-In
        Provider<AuthService>(
          create: (_) => AuthService(),
        ),
        
        // Firestore service - handles all database operations
        Provider<FirestoreService>(
          create: (_) => FirestoreService(),
        ),
        
        // Messaging service - handles push notifications
        Provider<MessagingService>(
          create: (_) => MessagingService(),
        ),

        // === State Management Providers ===
        
        // Auth Provider - manages authentication state and user profile
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            authService: context.read<AuthService>(),
            firestoreService: context.read<FirestoreService>(),
          ),
        ),

        // Swipe Provider - manages swipe feed and user actions
        // Depends on AuthProvider, so uses ProxyProvider
        ChangeNotifierProxyProvider<AuthProvider, SwipeProvider?>(
          create: (context) => null, // Initially null
          update: (context, authProvider, previous) {
            // Only create if user is authenticated
            if (authProvider.firebaseUser == null) return null;
            
            // Create SwipeProvider with current user ID
            return SwipeProvider(
              firestoreService: context.read<FirestoreService>(),
              currentUserId: authProvider.firebaseUser!.uid,
            );
          },
        ),

        // Request Provider - manages connection requests
        // Depends on AuthProvider for current user
        ChangeNotifierProxyProvider<AuthProvider, RequestProvider?>(
          create: (context) => null, // Initially null
          update: (context, authProvider, previous) {
            // Only create if user is authenticated
            if (authProvider.firebaseUser == null) return null;
            
            // Create RequestProvider with current user ID
            return RequestProvider(
              firestoreService: context.read<FirestoreService>(),
              currentUserId: authProvider.firebaseUser!.uid,
            );
          },
        ),

        // Chat Provider - manages matches and messages
        // Depends on AuthProvider for current user
        ChangeNotifierProxyProvider<AuthProvider, ChatProvider?>(
          create: (context) => null, // Initially null
          update: (context, authProvider, previous) {
            // Only create if user is authenticated
            if (authProvider.firebaseUser == null) return null;
            
            // Create ChatProvider with current user ID
            return ChatProvider(
              firestoreService: context.read<FirestoreService>(),
              currentUserId: authProvider.firebaseUser!.uid,
            );
          },
        ),
      ],
      
      // MaterialApp configuration
      child: MaterialApp(
        title: 'Peerzaa', // App title
        debugShowCheckedModeBanner: false, // Hide debug banner
        theme: AppTheme.lightTheme, // Apply custom theme
        initialRoute: '/', // Start at root route
        
        // Define all app routes
        routes: {
          '/': (context) => const AuthWrapper(), // Root - determines where to go
          '/login': (context) => const LoginScreen(), // Login screen
          '/onboarding': (context) => const OnboardingScreen(), // Profile setup
          '/home': (context) => const MainNavigation(), // Main app
        },
      ),
    );
  }
}

/// AuthWrapper - Determines initial route based on authentication state
/// This widget listens to auth changes and routes user accordingly
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Listen to AuthProvider state changes
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        // Show loading indicator while checking auth state
        if (authProvider.isLoading) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // User not authenticated -> show login screen
        if (!authProvider.isAuthenticated) {
          return const LoginScreen();
        }

        // User authenticated but profile not completed -> show onboarding
        if (!authProvider.hasCompletedProfile) {
          return const OnboardingScreen();
        }

        // User authenticated and profile complete -> show main app
        return const MainNavigation();
      },
    );
  }
}
