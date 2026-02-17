# Peerzaa - Deployment Guide

Complete guide for deploying the Peerzaa Flutter app with Firebase backend.

---

## Prerequisites

- **Flutter SDK** (3.0.0 or higher)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Node.js** (v18 or higher)
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds - macOS only)
- **Firebase Project** (create at https://console.firebase.google.com)

---

## 1. Firebase Project Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: **unimatch-kiit** (or your choice)
4. Follow the setup wizard
5. Create project

### Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Google** sign-in provider
4. Add your support email
5. Save

### Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll deploy rules later)
4. Select your preferred region
5. Enable

### Enable Firebase Storage

1. Go to **Storage**
2. Click "Get started"
3. Use default security rules (we're not using complex storage rules)
4. Choose same region as Firestore
5. Done

---

## 2. Add Firebase to Your Flutter App

### Android Setup

1. In Firebase Console, click "Add app" and select Android
2. **Android package name**: `com.kiit.unimatch` (or your choice)
3. Download `google-services.json`
4. Place it in: `android/app/google-services.json`

5. Edit `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

6. Edit `android/app/build.gradle`:
```gradle
plugins {
    id 'com.android.application'
    id 'kotlin-android'
    id 'com.google.gms.google-services'  // Add this line
}

android {
    defaultConfig {
        applicationId "com.kiit.unimatch"
        minSdkVersion 21  // Firebase requires min 21
        targetSdkVersion 33
    }
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
}
```

### iOS Setup

1. In Firebase Console, click "Add app" and select iOS
2. **iOS bundle ID**: `com.kiit.unimatch`
3. Download `GoogleService-Info.plist`
4. Open `ios/Runner.xcworkspace` in Xcode
5. Drag `GoogleService-Info.plist` into Runner folder in Xcode
6. Ensure "Copy items if needed" is checked

7. Edit `ios/Podfile`:
```ruby
platform :ios, '13.0'  # Minimum iOS 13
```

8. Run in ios directory:
```bash
cd ios
pod install
cd ..
```

---

## 3. Deploy Firebase Backend

### Login to Firebase

```bash
firebase login
```

### Initialize Firebase in Project

```bash
cd c:\UNIQUE\Work\annnn\anti\unimatch
firebase init
```

Select:
- **Firestore** (press Space to select)
- **Functions** (press Space to select)

Configuration:
- Use an existing project: Select your project
- Firestore rules file: `firebase/firestore.rules`
- Firestore indexes file: `firebase/firestore.indexes.json`
- Functions language: **TypeScript**
- ESLint: **No**
- Install dependencies: **Yes**

### Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Deploy Cloud Functions

```bash
cd firebase/functions
npm install
npm run build
cd ../..
firebase deploy --only functions
```

Verify functions are deployed:
- `blockNonKIITUsers`
- `sendRequest`
- `respondRequest`
- `onNewMessage`

---

## 4. Install Flutter Dependencies

```bash
cd c:\UNIQUE\Work\annnn\anti\unimatch
flutter pub get
```

---

## 5. Add Required Assets

Ensure all generated icons are in place:
- `assets/logo/unimatch_logo.png`
- `assets/icons/like.png`
- `assets/icons/reject.png`
- `assets/icons/bookmark.png`
- `assets/icons/filter.png`
- `assets/icons/notification.png`
- `assets/icons/chat.png`
- `assets/icons/profile.png`

These were already generated and copied during setup.

---

## 6. Run the App Locally

### Android

Connect Android device or start emulator, then:

```bash
flutter run
```

### iOS (macOS only)

Start iOS simulator:

```bash
open -a Simulator
flutter run
```

---

## 7. Build Release APK (Android)

```bash
flutter build apk --release
```

Output location: `build/app/outputs/flutter-apk/app-release.apk`

### Build App Bundle for Play Store

```bash
flutter build appbundle --release
```

Output location: `build/app/outputs/bundle/release/app-release.aab`

---

## 8. Build iOS Release (macOS only)

```bash
flutter build ios --release
```

Then open Xcode:

```bash
open ios/Runner.xcworkspace
```

1. Select "Runner" in Xcode
2. Go to "Signing & Capabilities"
3. Add your Apple Developer account
4. Select your Team
5. Archive the app (Product → Archive)
6. Upload to App Store Connect

---

## 9. Testing the App

### Test Authentication Flow

1. Launch app
2. Tap "Sign in with Google"
3. **Test with non-KIIT email**: Should show error "Only KIIT email accounts are allowed"
4. **Test with @kiit.ac.in email**: Should proceed to onboarding

### Test Onboarding

1. Fill all required fields:
   - Full Name
   - Age
   - Gender
   - Year of Study
   - Select at least one skill
   - Select at least one interest
   - Preferred match gender
   - Add at least one programming language

2. Tap "Complete Profile"
3. Should navigate to Home screen

### Test Swipe Feature

1. View profile cards
2. Swipe right (like) or left (reject)
3. Or tap action buttons below
4. Verify card disappears after action

### Test Requests

1. Have another test user (@kiit.ac.in) like you
2. Navigate to **Requests** tab
3. See incoming request
4. Tap **Accept**
5. Verify match is created

### Test Chat

1. After accepting a request
2. Navigate to **Messages** tab
3. Tap on the matched user
4. Send a message
5. Verify message appears in chat
6. Check on other device/account for real-time update

### Test Search

1. Navigate to **Search** tab
2. Search for a name, skill, or interest
3. View results
4. Tap on a user to see profile details

### Test Profile

1. Navigate to **Profile** tab
2. View your profile information
3. Tap **Logout**
4. Confirm logout
5. Verify you're returned to login screen

---

## 10. Troubleshooting

### Common Issues

**Issue**: "KIIT email accounts are allowed" error persists
- **Solution**: Ensure Cloud Function `blockNonKIITUsers` is deployed correctly

**Issue**: No profiles showing in swipe feed
- **Solution**: Manually create test users in Firestore Console with @kiit.ac.in emails

**Issue**: Messages not sending
- **Solution**: Verify Firestore rules are deployed and match ID is valid

**Issue**: Google Sign-In not working on Android
- **Solution**: Ensure `google-services.json` is in correct location and SHA-1 fingerprint is added in Firebase Console

**Issue**: Build fails with "Minimum SDK version" error
- **Solution**: Set `minSdkVersion` to 21 in `android/app/build.gradle`

### View Firebase Logs

```bash
firebase functions:log
```

### Test Functions Locally

```bash
cd firebase/functions
npm run serve
```

---

## 11. Production Checklist

Before releasing to production:

- [ ] Test all features thoroughly
- [ ] Verify Firestore rules are strict and secure
- [ ] Ensure Cloud Functions are working correctly
- [ ] Test with multiple @kiit.ac.in accounts
- [ ] Verify non-KIIT emails are blocked
- [ ] Check app performance and loading times
- [ ] Test on different Android/iOS devices
- [ ] Review and update privacy policy
- [ ] Prepare app store listings
- [ ] Set up Firebase Analytics (optional)
- [ ] Configure FCM for push notifications
- [ ] Test notification delivery
- [ ] Set up Firebase Crashlytics (recommended)

---

## 12. Maintenance

### Update Firestore Rules

After making changes to `firebase/firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

### Update Cloud Functions

After modifying `firebase/functions/src/index.ts`:

```bash
cd firebase/functions
npm run build
cd ../..
firebase deploy --only functions
```

### Update Flutter App

After code changes:

```bash
flutter pub get
flutter build apk --release  # For Android
```

---

## Support

For issues or questions:
- Check Firebase Console logs
- Review Flutter doctor: `flutter doctor`
- Test in debug mode: `flutter run`
- Enable verbose logging: `flutter run --verbose`

---

**Congratulations! Your Unimatch app is now deployed** 🎉
