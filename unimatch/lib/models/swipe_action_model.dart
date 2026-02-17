class SwipeActionModel {
  final String targetUid;
  final String action; // 'like', 'reject', 'bookmark'
  final DateTime timestamp;

  SwipeActionModel({
    required this.targetUid,
    required this.action,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'action': action,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory SwipeActionModel.fromMap(Map<String, dynamic> map, String targetUid) {
    return SwipeActionModel(
      targetUid: targetUid,
      action: map['action'] ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
    );
  }
}
