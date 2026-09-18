class UserModel {
  final String id;
  final String name;
  final String phone;
  final String role; // 'passenger', 'driver', 'admin'
  final double rating;
  final DateTime createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.phone,
    this.role = 'passenger',
    this.rating = 5.0,
    required this.createdAt,
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String id) {
    return UserModel(
      id: id,
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      role: map['role'] ?? 'passenger',
      rating: (map['rating'] ?? 5.0).toDouble(),
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'phone': phone,
      'role': role,
      'rating': rating,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
