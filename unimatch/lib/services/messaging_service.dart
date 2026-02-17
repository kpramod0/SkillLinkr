import 'package:firebase_messaging/firebase_messaging.dart';

class MessagingService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  // Initialize FCM
  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    }

    // Get FCM token
    String? token = await _messaging.getToken();
    print('FCM Token: $token');
    
    // TODO: Save token to Firestore user document if needed

    // Listen to foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Received foreground message: ${message.notification?.title}');
      // Handle foreground notification
    });

    // Listen to background messages (when app is opened from notification)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification opened app: ${message.notification?.title}');
      // Handle notification tap
    });
  }

  // Get FCM token
  Future<String?> getToken() async {
    return await _messaging.getToken();
  }
}
