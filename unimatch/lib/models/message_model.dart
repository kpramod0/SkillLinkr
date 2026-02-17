class MessageModel {
  final String id;
  final String senderId;
  final String text;
  final DateTime timestamp;
  final bool read;

  MessageModel({
    required this.id,
    required this.senderId,
    required this.text,
    DateTime? timestamp,
    this.read = false,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'text': text,
      'timestamp': timestamp.toIso8601String(),
      'read': read,
    };
  }

  factory MessageModel.fromMap(Map<String, dynamic> map, String id) {
    return MessageModel(
      id: id,
      senderId: map['senderId'] ?? '',
      text: map['text'] ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
      read: map['read'] ?? false,
    );
  }

  MessageModel copyWith({
    bool? read,
  }) {
    return MessageModel(
      id: id,
      senderId: senderId,
      text: text,
      timestamp: timestamp,
      read: read ?? this.read,
    );
  }
}
