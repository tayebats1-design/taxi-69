import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../services/maps_service.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/map_widget.dart';

class NavigationScreen extends StatelessWidget {
  final double targetLat;
  final double targetLng;
  final String locationName;

  const NavigationScreen({
    Key? key,
    required this.targetLat,
    required this.targetLng,
    required this.locationName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('الملاحة نحو: $locationName'),
      ),
      body: Stack(
        children: [
          MapWidget(
            initialPosition: LatLng(targetLat, targetLng),
            markers: {
              Marker(
                markerId: const MarkerId('target'),
                position: LatLng(targetLat, targetLng),
                infoWindow: InfoWindow(title: locationName),
              ),
            },
          ),

          // Bottom Bar
          Positioned(
            bottom: 20,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'المسافة المتبقية',
                            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            '850 متر (دقيقتين)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E293B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        icon: const Icon(Icons.navigation, size: 18),
                        label: const Text('Google Maps'),
                        onPressed: () {
                          MapsService.launchNavigation(
                            targetLat: targetLat,
                            targetLng: targetLng,
                            label: locationName,
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  CustomButton(
                    text: 'تم الوصول إلى الراكب 📍',
                    backgroundColor: const Color(0xFF10B981),
                    textColor: Colors.white,
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('تم إشعار الراكب بوصولك بنجاح!')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
