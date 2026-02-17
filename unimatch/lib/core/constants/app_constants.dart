// App-wide constants

class AppConstants {
  // Skills options
  static const List<String> skills = [
    'Frontend',
    'Backend',
    'Database',
    'DevOps',
    'AI/ML',
    'Android',
    'iOS',
    'UI/UX',
  ];

  // Interests options
  static const List<String> interests = [
    'Startup',
    'Research',
    'Hackathons',
    'Projects',
    'Collaboration',
  ];

  // Gender options
  static const List<String> genders = [
    'Male',
    'Female',
    'Other',
  ];

  // Preferred gender options
  static const List<String> preferredGenders = [
    'Male',
    'Female',
    'Both',
  ];

  // Year of study options
  static const List<int> years = [1, 2, 3, 4];

  // Common programming languages
  static const List<String> commonLanguages = [
    'Python',
    'JavaScript',
    'Java',
    'C++',
    'C',
    'Dart',
    'Go',
    'Rust',
    'TypeScript',
    'Kotlin',
    'Swift',
    'PHP',
    'Ruby',
  ];

  // Swipe actions
  static const String actionLike = 'like';
  static const String actionReject = 'reject';
  static const String actionBookmark = 'bookmark';

  // Request status
  static const String statusPending = 'pending';
  static const String statusAccepted = 'accepted';
  static const String statusRejected = 'rejected';

  // Notification types
  static const String notifTypeRequest = 'request';
  static const String notifTypeMatch = 'match';
  static const String notifTypeMessage = 'message';

  // Error messages
  static const String errorKIITEmail = 'Only KIIT email accounts are allowed.';
  static const String errorGeneric = 'An error occurred. Please try again.';
}
