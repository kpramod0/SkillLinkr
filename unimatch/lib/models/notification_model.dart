class NotificationModel {
  final String id;
  final String type; // 'request', 'match', 'message'
  final String fromUid;
  final String message;
  final bool read;
  final DateTime timestamp;
  final Map<String, dynamic>? data; // Additional data like requestId, matchId, etc.

  NotificationModel({
    required this.id,
    required this.type,
    required this.fromUid,
    required this.message,
    this.read = false,
    DateTime? timestamp,
    this.data,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'fromUid': fromUid,
      'message': message,
      'read': read,
      'timestamp': timestamp.toIso8601String(),
      'data': data,
    };
  }

  factory NotificationModel.fromMap(Map<String, dynamic> map, String id) {
    return NotificationModel(
      id: id,
      type: map['type'] ?? '',
      fromUid: map['fromUid'] ?? '',
      message: map['message'] ?? '',
      read: map['read'] ?? false,
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
      data: map['data'] as Map<String, dynamic>?,
    );
  }

  NotificationModel copyWith({
    bool? read,
  }) {
    return NotificationModel(
      id: id,
      type: type,
      fromUid: fromUid,
      message: message,
      read: read ?? this.read,
      timestamp: timestamp,
      data: data,
    );
  }
}
