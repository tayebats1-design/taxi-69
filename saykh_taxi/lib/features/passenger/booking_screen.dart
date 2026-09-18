import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../core/utils/fare_calculator.dart';
import '../../core/utils/location_service.dart';
import '../../models/pricing_model.dart';
import '../../models/trip_model.dart';
import '../../services/firestore_service.dart';
import '../../shared/widgets/custom_button.dart';
import 'tracking_screen.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({Key? key}) : super(key: key);

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final FirestoreService _firestore = FirestoreService();

  String _pickupLocation = 'موقعي الحالي (وسط المدينة)';
  String _dropoffLocation = 'حي المجاهدين';
  String _rideType = 'standard';
  double _distanceKm = 3.5;
  bool _isLoading = false;

  final List<String> _districts = [
    'وسط المدينة (الساحة المركزية)',
    'حي المجاهدين',
    'حي الوئام (100 سكن)',
    'حي النصر',
    'حي النخيل',
    'حي 5 جويلية',
    'المستشفى المختلط للأبيض سيدي الشيخ',
    'محطة نقل المسافرين البرية',
    'المنطقة الصناعية والحرفية',
  ];

  @override
  Widget build(BuildContext context) {
    PricingModel pricing = PricingModel(); // Default or streamed from Firestore

    double fare = FareCalculator.calculateFare(
      distanceKm: _distanceKm,
      pricing: pricing,
      rideType: _rideType,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('تحديد مسار الرحلة'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pickup Input
            const Text(
              'نقطة الانطلاق (من أين؟)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _districts.contains(_pickupLocation)
                      ? _pickupLocation
                      : _districts.first,
                  items: _districts.map((d) {
                    return DropdownMenuItem(value: d, child: Text(d));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _pickupLocation = val);
                  },
                ),
              ),
            ),

            const SizedBox(height: 18),

            // Dropoff Input
            const Text(
              'وجهة الوصول (إلى أين؟)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _districts.contains(_dropoffLocation)
                      ? _dropoffLocation
                      : _districts[1],
                  items: _districts.map((d) {
                    return DropdownMenuItem(value: d, child: Text(d));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _dropoffLocation = val);
                  },
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Car Type Selection
            const Text(
              'اختر نوع الخدمة',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildVehicleOption('standard', 'اقتصادية', '1-4 ركاب', Icons.directions_car),
                const SizedBox(width: 10),
                _buildVehicleOption('family', 'عائلية', 'مساحة رحبة', Icons.airport_shuttle),
                const SizedBox(width: 10),
                _buildVehicleOption('comfort', 'مريحة', 'تكييف وهدوء', Icons.star),
              ],
            ),

            const SizedBox(height: 24),

            // Price Estimation Box
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFFEFCE8),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFEF08A)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'التكلفة المقدرة للرحلة',
                        style: TextStyle(fontSize: 13, color: Color(0xFF854D0E)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${fare.toStringAsFixed(0)} ${AppConstants.currency}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF713F12),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'الدفع نقداً عند الوصول 💵',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),

            // Submit Button
            CustomButton(
              text: 'تأكيد وحجز التاكسي 🚕',
              isLoading: _isLoading,
              onPressed: () async {
                setState(() => _isLoading = true);

                TripModel newTrip = TripModel(
                  id: 'trip-${DateTime.now().millisecondsSinceEpoch}',
                  passengerId: 'demo-user',
                  passengerName: 'الراكب',
                  passengerPhone: '0655000000',
                  pickupLocationName: _pickupLocation,
                  pickupLat: AppConstants.cityLat,
                  pickupLng: AppConstants.cityLng,
                  dropoffLocationName: _dropoffLocation,
                  dropoffLat: AppConstants.cityLat + 0.015,
                  dropoffLng: AppConstants.cityLng + 0.012,
                  distanceKm: _distanceKm,
                  estimatedFare: fare,
                  vehicleType: _rideType,
                  createdAt: DateTime.now(),
                );

                try {
                  String tripId = await _firestore.createTripRequest(newTrip);
                  if (mounted) {
                    setState(() => _isLoading = false);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => TrackingScreen(tripId: tripId),
                      ),
                    );
                  }
                } catch (e) {
                  setState(() => _isLoading = false);
                  // الانتقال إلى شاشة التتبع للاختبار
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (_) => TrackingScreen(tripId: newTrip.id),
                    ),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleOption(String type, String title, String subtitle, IconData icon) {
    bool isSelected = _rideType == type;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _rideType = type),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFFEF9C3) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primaryDark : const Color(0xFFE2E8F0),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? AppTheme.primaryDark : Colors.grey, size: 28),
              const SizedBox(height: 6),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isSelected ? AppTheme.primaryDark : AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
