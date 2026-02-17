# Peerzaa

A production-ready Tinder-like Flutter app for Peerzaa students to connect and collaborate on projects.

## Features

✅ **Authentication**
- Google Sign-In with @kiit.ac.in email validation
- Automatic onboarding for new users

✅ **Profile Management**
- Comprehensive profile with skills, interests, and projects
- Profile photo upload
- GitHub and LinkedIn integration

✅ **Discovery**
- Tinder-style card swiper
- Like, reject, and bookmark actions
- Advanced filtering (gender, age, year, skills, interests)
- Search by name, skill, or interest

✅ **Connection Requests**
- Send connection requests
- Accept/reject incoming requests
- View outgoing requests

✅ **Messaging**
- Real-time chat with matched users
- Message notifications
- Beautiful gradient UI

✅ **Security**
- Strict Firestore security rules
- Only @kiit.ac.in emails allowed
- User data privacy protection

## Technology Stack

### Frontend
- **Flutter** - Cross-platform mobile framework
- **Provider** - State management
- **Firebase** - Backend services

### Backend
- **Firebase Authentication** - Google Sign-In
- **Cloud Firestore** - Database
- **Firebase Storage** - Photo storage
- **Cloud Functions** - TypeScript serverless functions
- **Firebase Cloud Messaging** - Push notifications

## Project Structure

```
unimatch/
├── lib/
│   ├── core/
│   │   ├── constants/      # App constants
│   │   ├── theme/          # App theme and styling
│   │   └── widgets/        # Reusable widgets
│   ├── models/             # Data models
│   ├── services/           # Firebase services
│   ├── providers/          # State management
│   ├── screens/            # UI screens
│   │   ├── auth/
│   │   ├── home/
│   │   ├── search/
│   │   ├── requests/
│   │   ├── messages/
│   │   └── profile/
│   └── main.dart           # App entry point
├── firebase/
│   ├── firestore.rules     # Security rules
│   ├── firestore.indexes.json
│   └── functions/          # Cloud Functions
└── assets/                 # Icons and images
```

## Quick Start

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Prerequisites
- Flutter SDK (3.0.0+)
- Firebase CLI
- Node.js (v18+)

### Setup
1. Clone the repository
2. Install dependencies: `flutter pub get`
3. Set up Firebase project
4. Deploy Firestore rules and Cloud Functions
5. Run: `flutter run`

## Screenshots

- Login with Google
- Profile onboarding
- Swipe interface
- Chat messages
- Profile view

## License

MIT License - feel free to use for your own projects!

## Contact

Built for KIIT students by KIIT students 🎓
