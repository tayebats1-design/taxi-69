import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/driver_model.dart';
import '../../shared/widgets/custom_button.dart';
import 'navigation_screen.dart';
import 'request_screen.dart';
import 'wallet_screen.dart';

class DriverHome extends StatefulWidget {
  const DriverHome({Key? key}) : super(key: key);

  @override
  State<DriverHome> createState() => _DriverHomeState();
}

class _DriverHomeState extends State<DriverHome> {
  bool _isOnline = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('بوابة سائقي تاكسي الأبيض سيدي الشيخ'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet),
            tooltip: 'المحفظة والأرباح',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DriverWalletScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // Online Toggle Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isOnline ? 'أنت الآن متصل (جاهز للطلب) 🟢' : 'أنت الآن غير متصل 🔴',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _isOnline ? const Color(0xFF15803D) : AppTheme.dangerColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'استقبال طلبات الزبائن فورياً في دائرة الأبيض',
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                    Switch(
                      value: _isOnline,
                      activeColor: AppTheme.primaryDark,
                      onChanged: (val) {
                        setState(() => _isOnline = val);
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Driver Quick Stats
              Row(
                children: [
                  _buildStatCard('أرباح اليوم', '4,200 دج', Icons.attach_money, Colors.green),
                  const SizedBox(width: 12),
                  _buildStatCard('رحلات اليوم', '8 رحلات', Icons.local_taxi, Colors.amber.shade800),
                  const SizedBox(width: 12),
                  _buildStatCard('التقييم', '4.9 ★', Icons.star, Colors.orange),
                ],
              ),

              const SizedBox(height: 30),

              // Simulation Banner for incoming request
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEFCE8),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFEF08A)),
                ),
                child: Column(
                  children: [
                    const Text(
                      '🔔 محاكاة استقبال طلب رحلة جديد',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'يمكنك النقر أدناه لمعاينة شاشة استقبال الطلب بمؤقت 15 ثانية',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryDark,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.notifications_active),
                      label: const Text('معاينة طلب زبون قادم (15 ثانية)'),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const RequestScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Open Navigation Shortcut
              CustomButton(
                text: 'فتح الملاحة والتوجيه (Google Maps) 🗺️',
                backgroundColor: AppTheme.accentColor,
                textColor: Colors.white,
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const NavigationScreen(
                        targetLat: AppConstants.cityLat,
                        targetLng: AppConstants.cityLng,
                        locationName: 'وسط مدينة الأبيض سيدي الشيخ',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
