import 'package:cloud_functions/cloud_functions.dart';

class CloudFunctionsService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Call sendRequest Cloud Function
  Future<Map<String, dynamic>> sendRequest(String toUid) async {
    try {
      final result = await _functions.httpsCallable('sendRequest').call({
        'toUid': toUid,
      });
      
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      rethrow;
    }
  }

  // Call respondRequest Cloud Function
  Future<Map<String, dynamic>> respondRequest(String requestId, bool accepted) async {
    try {
      final result = await _functions.httpsCallable('respondRequest').call({
        'requestId': requestId,
        'accepted': accepted,
      });
      
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      rethrow;
    }
  }
}
