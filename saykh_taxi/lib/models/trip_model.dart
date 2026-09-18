import 'package:cloud_firestore/cloud_firestore.dart';

class Trip {
  final String id;
  final String passengerId;
  final String? driverId;
  final GeoPoint pickup;
  final GeoPoint destination;
  final String pickupAddress;
  final String destinationAddress;
  final String category;
  final double estimatedFare;
  final double? finalFare;
  final String status;
  final DateTime createdAt;
  final String paymentMethod;

  Trip({
    required this.id,
    required this.passengerId,
    this.driverId,
    required this.pickup,
    required this.destination,
    required this.pickupAddress,
    required this.destinationAddress,
    required this.category,
    required this.estimatedFare,
    this.finalFare,
    required this.status,
    required this.createdAt,
    this.paymentMethod = 'cash',
  });

  Map<String, dynamic> toMap() {
    return {
      'passengerId': passengerId,
      'driverId': driverId,
      'pickup': pickup,
      'destination': destination,
      'pickupAddress': pickupAddress,
      'destinationAddress': destinationAddress,
      'category': category,
      'estimatedFare': estimatedFare,
      'finalFare': finalFare,
      'status': status,
      'createdAt': Timestamp.fromDate(createdAt),
      'paymentMethod': paymentMethod,
    };
  }

  factory Trip.fromMap(String id, Map<String, dynamic> map) {
    return Trip(
      id: id,
      passengerId: map['passengerId'],
      driverId: map['driverId'],
      pickup: map['pickup'],
      destination: map['destination'],
      pickupAddress: map['pickupAddress'],
      destinationAddress: map['destinationAddress'],
      category: map['category'],
      estimatedFare: (map['estimatedFare'] as num).toDouble(),
      finalFare: map['finalFare'] != null ? (map['finalFare'] as num).toDouble() : null,
      status: map['status'],
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      paymentMethod: map['paymentMethod'] ?? 'cash',
    );
  }
}

typedef TripModel = Trip;
