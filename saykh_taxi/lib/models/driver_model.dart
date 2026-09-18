class DriverModel {
  final String id;
  final String name;
  final String phone;
  final String carModel;
  final String plateNumber;
  final String vehicleType; // 'standard', 'family', 'comfort'
  final double rating;
  final int totalTrips;
  final double currentLat;
  final double currentLng;
  final bool isOnline;
  final String approvalStatus; // 'approved', 'pending', 'rejected'
  final double walletBalance;

  DriverModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.carModel,
    required this.plateNumber,
    this.vehicleType = 'standard',
    this.rating = 5.0,
    this.totalTrips = 0,
    required this.currentLat,
    required this.currentLng,
    this.isOnline = true,
    this.approvalStatus = 'approved',
    this.walletBalance = 0.0,
  });

  factory DriverModel.fromMap(Map<String, dynamic> map, String id) {
    return DriverModel(
      id: id,
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      carModel: map['carModel'] ?? '',
      plateNumber: map['plateNumber'] ?? '',
      vehicleType: map['vehicleType'] ?? 'standard',
      rating: (map['rating'] ?? 5.0).toDouble(),
      totalTrips: map['totalTrips'] ?? 0,
      currentLat: (map['currentLat'] ?? 32.8942).toDouble(),
      currentLng: (map['currentLng'] ?? 0.5489).toDouble(),
      isOnline: map['isOnline'] ?? true,
      approvalStatus: map['approvalStatus'] ?? 'approved',
      walletBalance: (map['walletBalance'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'phone': phone,
      'carModel': carModel,
      'plateNumber': plateNumber,
      'vehicleType': vehicleType,
      'rating': rating,
      'totalTrips': totalTrips,
      'currentLat': currentLat,
      'currentLng': currentLng,
      'isOnline': isOnline,
      'approvalStatus': approvalStatus,
      'walletBalance': walletBalance,
    };
  }
}
