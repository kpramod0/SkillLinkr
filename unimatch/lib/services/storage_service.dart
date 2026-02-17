import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Upload profile photo
  Future<String> uploadProfilePhoto(String uid, File file) async {
    try {
      final ref = _storage.ref().child('profile_photos').child('$uid.jpg');
      
      final uploadTask = ref.putFile(
        file,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      final snapshot = await uploadTask.whenComplete(() {});
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      return downloadUrl;
    } catch (e) {
      rethrow;
    }
  }

  // Delete profile photo
  Future<void> deleteProfilePhoto(String uid) async {
    try {
      final ref = _storage.ref().child('profile_photos').child('$uid.jpg');
      await ref.delete();
    } catch (e) {
      // Ignore if file doesn't exist
      if (!e.toString().contains('object-not-found')) {
        rethrow;
      }
    }
  }
}
