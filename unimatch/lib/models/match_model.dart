class MatchModel {
  final String id;
  final List<String> users; // [uid1, uid2]
  final DateTime createdAt;

  MatchModel({
    required this.id,
    required this.users,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'users': users,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory MatchModel.fromMap(Map<String, dynamic> map, String id) {
    return MatchModel(
      id: id,
      users: List<String>.from(map['users'] ?? []),
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
    );
  }

  String getOtherUserId(String currentUserId) {
    return users.firstWhere((uid) => uid != currentUserId, orElse: () => '');
  }
}
