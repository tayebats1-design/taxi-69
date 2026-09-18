import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';

class TripHistoryScreen extends StatelessWidget {
  const TripHistoryScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Demo history
    final trips = [
      {
        'from': 'وسط المدينة (الساحة المركزية)',
        'to': 'المستشفى المختلط للأبيض سيدي الشيخ',
        'date': '17 سبتمبر 2026 • 10:30',
        'fare': '250 دج',
        'status': 'مكتملة',
      },
      {
        'from': 'حي المجاهدين',
        'to': 'محطة نقل المسافرين البرية',
        'date': '16 سبتمبر 2026 • 16:15',
        'fare': '200 دج',
        'status': 'مكتملة',
      },
      {
        'from': 'حي الوئام (100 سكن)',
        'to': 'حي النصر',
        'date': '15 سبتمبر 2026 • 21:00',
        'fare': '280 دج',
        'status': 'مكتملة',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل الرحلات السابقة'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: trips.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = trips[index];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item['date']!,
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          item['status']!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF15803D),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      const Icon(Icons.trip_origin, size: 16, color: Colors.amber),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item['from']!,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 16, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item['to']!,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'المبلغ المدفوع:',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                      Text(
                        item['fare']!,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppTheme.primaryDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
