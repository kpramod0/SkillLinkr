class UserModel {
  final String uid;
  final String email;
  final String fullName;
  final int age;
  final String gender; // 'Male', 'Female', 'Other'
  final int yearOfStudy; // 1, 2, 3, 4
  final List<String> skills;
  final List<String> interests;
  final List<String> languages;
  final String preferredGender; // 'Male', 'Female', 'Both'
  final String? profilePhotoUrl;
  final String? github;
  final String? linkedin;
  final String? bio;
  final List<Project> projects;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.fullName,
    required this.age,
    required this.gender,
    required this.yearOfStudy,
    required this.skills,
    required this.interests,
    required this.languages,
    required this.preferredGender,
    this.profilePhotoUrl,
    this.github,
    this.linkedin,
    this.bio,
    List<Project>? projects,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : projects = projects ?? [],
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'fullName': fullName,
      'age': age,
      'gender': gender,
      'yearOfStudy': yearOfStudy,
      'skills': skills,
      'interests': interests,
      'languages': languages,
      'preferredGender': preferredGender,
      'profilePhotoUrl': profilePhotoUrl,
      'github': github,
      'linkedin': linkedin,
      'bio': bio,
      'projects': projects.map((p) => p.toMap()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      uid: map['uid'] ?? '',
      email: map['email'] ?? '',
      fullName: map['fullName'] ?? '',
      age: map['age']?.toInt() ?? 0,
      gender: map['gender'] ?? '',
      yearOfStudy: map['yearOfStudy']?.toInt() ?? 1,
      skills: List<String>.from(map['skills'] ?? []),
      interests: List<String>.from(map['interests'] ?? []),
      languages: List<String>.from(map['languages'] ?? []),
      preferredGender: map['preferredGender'] ?? 'Both',
      profilePhotoUrl: map['profilePhotoUrl'],
      github: map['github'],
      linkedin: map['linkedin'],
      bio: map['bio'],
      projects: (map['projects'] as List<dynamic>?)
              ?.map((p) => Project.fromMap(p as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
      updatedAt: map['updatedAt'] != null
          ? DateTime.parse(map['updatedAt'])
          : DateTime.now(),
    );
  }

  UserModel copyWith({
    String? uid,
    String? email,
    String? fullName,
    int? age,
    String? gender,
    int? yearOfStudy,
    List<String>? skills,
    List<String>? interests,
    List<String>? languages,
    String? preferredGender,
    String? profilePhotoUrl,
    String? github,
    String? linkedin,
    String? bio,
    List<Project>? projects,
    DateTime? updatedAt,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      yearOfStudy: yearOfStudy ?? this.yearOfStudy,
      skills: skills ?? this.skills,
      interests: interests ?? this.interests,
      languages: languages ?? this.languages,
      preferredGender: preferredGender ?? this.preferredGender,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      github: github ?? this.github,
      linkedin: linkedin ?? this.linkedin,
      bio: bio ?? this.bio,
      projects: projects ?? this.projects,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
    );
  }
}

class Project {
  final String title;
  final String description;
  final String? link;

  Project({
    required this.title,
    required this.description,
    this.link,
  });

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'link': link,
    };
  }

  factory Project.fromMap(Map<String, dynamic> map) {
    return Project(
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      link: map['link'],
    );
  }
}
