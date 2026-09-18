import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/constants.dart';
import '../models/driver_model.dart';
import '../models/trip_model.dart';
import '../models/pricing_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // 1. مراقبة وإدارة السائقين
  Stream<List<DriverModel>> streamActiveDrivers() {
    return _db
        .collection(AppConstants.driversCollection)
        .where('isOnline', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DriverModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<void> updateDriverLocation(String driverId, double lat, double lng) async {
    await _db.collection(AppConstants.driversCollection).doc(driverId).update({
      'currentLat': lat,
      'currentLng': lng,
      'lastActive': FieldValue.serverTimestamp(),
    });
  }

  Future<void> setDriverOnlineStatus(String driverId, bool isOnline) async {
    await _db.collection(AppConstants.driversCollection).doc(driverId).update({
      'isOnline': isOnline,
    });
  }

  // 2. إدارة الرحلات والطلبات
  Future<String> createTripRequest(TripModel trip) async {
    DocumentReference ref = await _db.collection(AppConstants.tripsCollection).add(trip.toMap());
    return ref.id;
  }

  Stream<TripModel?> streamTrip(String tripId) {
    return _db
        .collection(AppConstants.tripsCollection)
        .doc(tripId)
        .snapshots()
        .map((doc) => doc.exists ? TripModel.fromMap(doc.data()!, doc.id) : null);
  }

  Stream<List<TripModel>> streamPendingTrips() {
    return _db
        .collection(AppConstants.tripsCollection)
        .where('status', isEqualTo: 'pending')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TripModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<void> acceptTrip(String tripId, DriverModel driver) async {
    await _db.collection(AppConstants.tripsCollection).doc(tripId).update({
      'status': 'accepted',
      'driverId': driver.id,
      'driverName': driver.name,
      'driverPhone': driver.phone,
      'carModel': driver.carModel,
      'plateNumber': driver.plateNumber,
    });
  }

  Future<void> updateTripStatus(String tripId, String newStatus, {double? finalFare}) async {
    Map<String, dynamic> data = {'status': newStatus};
    if (newStatus == 'completed') {
      data['completedAt'] = DateTime.now().toIso8601String();
      if (finalFare != null) {
        data['finalFare'] = finalFare;
      }
    }
    await _db.collection(AppConstants.tripsCollection).doc(tripId).update(data);
  }

  // 3. التسعيرة
  Stream<PricingModel> streamPricing() {
    return _db
        .collection(AppConstants.settingsCollection)
        .doc('pricing')
        .snapshots()
        .map((doc) => doc.exists ? PricingModel.fromMap(doc.data()!) : PricingModel());
  }

  Future<void> updatePricing(PricingModel pricing) async {
    await _db
        .collection(AppConstants.settingsCollection)
        .doc('pricing')
        .set(pricing.toMap());
  }

  // 4. حذف السائق بواسطة الإدارة (Admin Delete Driver)
  Future<void> deleteDriver(String driverId) async {
    await _db.collection(AppConstants.driversCollection).doc(driverId).delete();
  }
}
