import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../shared/widgets/custom_button.dart';

class DriverWalletScreen extends StatelessWidget {
  const DriverWalletScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('محفظة السائق والأرباح'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Balance Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'رصيد المحفظة المتاح للسحب',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '18,450 دج',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('أرباح الأسبوع: 24,000 دج', style: TextStyle(color: Colors.amber, fontSize: 12)),
                      Text('عمولة المنصة: 15%', style: TextStyle(color: Colors.white60, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            const Text(
              'العمليات الأخيرة',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            _buildTransactionItem('أجرة رحلة (حي المجاهدين)', '+ 250 دج', 'اليوم • 14:20', isIncome: true),
            _buildTransactionItem('أجرة رحلة (المستشفى)', '+ 350 دج', 'اليوم • 12:10', isIncome: true),
            _buildTransactionItem('عمولة تطبيق تاكسي الأبيض (15%)', '- 90 دج', 'اليوم • 12:15', isIncome: false),
            _buildTransactionItem('سحب رصيد لحساب بريدي موب', '- 5,000 دج', 'أمس • 19:40', isIncome: false),

            const SizedBox(height: 30),

            CustomButton(
              text: 'طلب سحب الرصيد (بريدي موب / كاش) 💳',
              backgroundColor: AppTheme.primaryDark,
              textColor: Colors.white,
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('تم إرسال طلب السحب إلى الإدارة للمراجعة!')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionItem(String title, String amount, String time, {required bool isIncome}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              Text(time, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
            ],
          ),
          Text(
            amount,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isIncome ? const Color(0xFF15803D) : AppTheme.dangerColor,
            ),
          ),
        ],
      ),
    );
  }
}
