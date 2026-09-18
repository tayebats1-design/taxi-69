import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../constants.dart';

class LocationService {
  /// الحصول على موقع الجهاز الحالي
  static Future<LatLng?> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return const LatLng(AppConstants.cityLat, AppConstants.cityLng);
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return const LatLng(AppConstants.cityLat, AppConstants.cityLng);
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return const LatLng(AppConstants.cityLat, AppConstants.cityLng);
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      return LatLng(position.latitude, position.longitude);
    } catch (e) {
      return const LatLng(AppConstants.cityLat, AppConstants.cityLng);
    }
  }

  /// حساب المسافة بين نقطتين بالكيلومتر
  static double calculateDistanceInKm(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    double distanceInMeters = Geolocator.distanceBetween(
      startLat,
      startLng,
      endLat,
      endLng,
    );
    return distanceInMeters / 1000.0;
  }
}
