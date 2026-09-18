import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/pricing_model.dart';
import '../../services/firestore_service.dart';
import '../../shared/widgets/custom_button.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({Key? key}) : super(key: key);

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  final FirestoreService _firestore = FirestoreService();

  double _baseFare = 100.0;
  double _perKmRate = 35.0;
  double _surgeMultiplier = 1.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('لوحة تحكم إدارة المنظومة ⚙️'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // KPI Summary Cards
            Row(
              children: [
                _buildKpiCard('السائقين النشطين', '12 سائق', Icons.directions_car, Colors.blue),
                const SizedBox(width: 12),
                _buildKpiCard('رحلات اليوم', '48 رحلة', Icons.route, Colors.green),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildKpiCard('إجمالي المعاملات', '14,200 دج', Icons.payments, Colors.amber.shade800),
                const SizedBox(width: 12),
                _buildKpiCard('عمولة المنصة (15%)', '2,130 دج', Icons.account_balance, Colors.purple),
              ],
            ),

            const SizedBox(height: 28),

            const Text(
              'ضبط تسعيرة بلدية الأبيض سيدي الشيخ',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 14),

            // Base Fare Slider
            Text('فتح العداد الأساسي: ${_baseFare.toInt()} دج'),
            Slider(
              value: _baseFare,
              min: 50,
              max: 250,
              divisions: 20,
              activeColor: AppTheme.primaryDark,
              onChanged: (val) => setState(() => _baseFare = val),
            ),

            // Per Km Slider
            Text('سعر الكيلومتر الواحد: ${_perKmRate.toInt()} دج/كم'),
            Slider(
              value: _perKmRate,
              min: 20,
              max: 80,
              divisions: 12,
              activeColor: AppTheme.primaryDark,
              onChanged: (val) => setState(() => _perKmRate = val),
            ),

            // Surge Multiplier
            Text('معامل ذروة الطلب (Surge): ${_surgeMultiplier.toStringAsFixed(1)}x'),
            Slider(
              value: _surgeMultiplier,
              min: 1.0,
              max: 2.5,
              divisions: 15,
              activeColor: Colors.orange,
              onChanged: (val) => setState(() => _surgeMultiplier = val),
            ),

            const SizedBox(height: 24),

            CustomButton(
              text: 'حفظ التسعيرة وتعميمها على الجميع 💾',
              backgroundColor: const Color(0xFF1E293B),
              textColor: Colors.white,
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('تم تحديث إعدادات التسعيرة في قاعدة البيانات بنجاح!')),
                );
              },
            ),

            const SizedBox(height: 32),

            // Driver Management & Deletion
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text(
                  'إدارة السائقين والرقابة',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'صلاحية الحذف متاحة للإدارة فقط',
                  style: TextStyle(fontSize: 11, color: Colors.red),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Demo Driver item with Delete Button
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Color(0xFFFEF3C7),
                    child: Text('🚕', style: TextStyle(fontSize: 20)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('عمي لخضر بوعمامة', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('رونو سيمبول (04128-120-32)', style: TextStyle(fontSize: 12, color: Colors.black54)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_forever, color: Colors.red),
                    tooltip: 'حذف السائق نهائياً من المنظومة',
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('تأكيد حذف السائق'),
                          content: const Text('هل أنت متأكد من حذف هذا السائق نهائياً من قاعدة بيانات المنظومة؟ لن يتمكن من تسجيل الدخول بحسابه بعد الآن.'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('إلغاء'),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                              onPressed: () {
                                _firestore.deleteDriver('drv-1');
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('تم حذف السائق نهائياً من قبل الإدارة')),
                                );
                              },
                              child: const Text('تأكيد الحذف', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(title, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
