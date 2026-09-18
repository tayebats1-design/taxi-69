import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../services/firestore_service.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/map_widget.dart';

class TrackingScreen extends StatefulWidget {
  final String tripId;

  const TrackingScreen({Key? key, required this.tripId}) : super(key: key);

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final FirestoreService _firestore = FirestoreService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تتبع مسار السائق مباشرة'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // Background Live Map
          MapWidget(
            initialPosition: const LatLng(AppConstants.cityLat, AppConstants.cityLng),
            markers: {
              const Marker(
                markerId: MarkerId('passenger'),
                position: LatLng(AppConstants.cityLat, AppConstants.cityLng),
                infoWindow: InfoWindow(title: 'موقعك (الانطلاق)'),
              ),
              const Marker(
                markerId: MarkerId('driver'),
                position: LatLng(AppConstants.cityLat + 0.005, AppConstants.cityLng + 0.004),
                infoWindow: InfoWindow(title: 'التاكسي القادم'),
              ),
            },
          ),

          // Bottom Floating Driver Info Card
          Positioned(
            bottom: 20,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
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
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'السائق في الطريق إليك (يصل خلال 4 دقائق)',
                      style: TextStyle(
                        color: Color(0xFF15803D),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Driver Details
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: Colors.amber.shade100,
                        child: const Icon(Icons.person, size: 30, color: Color(0xFF854D0E)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'الطيب السايحي (سائق معتمد)',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'رينو سيمبول بيضاء • 04221-118-32',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFDCFCE7),
                          foregroundColor: const Color(0xFF15803D),
                        ),
                        icon: const Icon(Icons.phone),
                        onPressed: () {
                          launchUrl(Uri.parse('tel:0661000000'));
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Cancel or Call Help Button
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.dangerColor,
                            side: const BorderSide(color: Color(0xFFFCA5A5)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () {
                            Navigator.pop(context);
                          },
                          child: const Text('إلغاء الطلب'),
                        ),
                      ),
                    ],
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
