class RequestModel {
  final String id;
  final String fromUid;
  final String toUid;
  final String status; // 'pending', 'accepted', 'rejected'
  final DateTime createdAt;
  final DateTime? respondedAt;

  RequestModel({
    required this.id,
    required this.fromUid,
    required this.toUid,
    required this.status,
    DateTime? createdAt,
    this.respondedAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'fromUid': fromUid,
      'toUid': toUid,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'respondedAt': respondedAt?.toIso8601String(),
    };
  }

  factory RequestModel.fromMap(Map<String, dynamic> map, String id) {
    return RequestModel(
      id: id,
      fromUid: map['fromUid'] ?? '',
      toUid: map['toUid'] ?? '',
      status: map['status'] ?? 'pending',
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
      respondedAt: map['respondedAt'] != null
          ? DateTime.parse(map['respondedAt'])
          : null,
    );
  }

  RequestModel copyWith({
    String? status,
    DateTime? respondedAt,
  }) {
    return RequestModel(
      id: id,
      fromUid: fromUid,
      toUid: toUid,
      status: status ?? this.status,
      createdAt: createdAt,
      respondedAt: respondedAt ?? this.respondedAt,
    );
  }
}
