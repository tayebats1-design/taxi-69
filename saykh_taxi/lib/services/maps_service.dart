import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class MapsService {
  /// فتح الملاحة الخارجية في Google Maps (خاص بالسائق)
  static Future<void> launchNavigation({
    required double targetLat,
    required double targetLng,
    String? label,
  }) async {
    final Uri googleMapsUrl = Uri.parse(
      'google.navigation:q=$targetLat,$targetLng&mode=d',
    );
    final Uri webFallbackUrl = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$targetLat,$targetLng',
    );

    try {
      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl);
      } else {
        await launchUrl(webFallbackUrl, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      await launchUrl(webFallbackUrl, mode: LaunchMode.externalApplication);
    }
  }

  /// إنشاء أيقونة مخصصة للتاكسي على الخارطة
  static Future<BitmapDescriptor> getTaxiMarkerIcon() async {
    try {
      return await BitmapDescriptor.fromAssetImage(
        const ImageConfiguration(size: Size(48, 48)),
        'assets/icons/taxi_marker.png',
      );
    } catch (e) {
      return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow);
    }
  }
}
