import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'تاكسي الأبيض سيدي الشيخ';
  static const String appTagline = 'خدمة النقل الأولى بدائرة الأبيض سيدي الشيخ - ولاية البيض';

  // City Coordinates (El Abiodh Sidi Cheikh)
  static const double cityLat = 32.8942;
  static const double cityLng = 0.5489;
  static const double defaultZoom = 14.5;

  // Currency
  static const String currency = 'دج';

  // Firestore Collections
  static const String usersCollection = 'users';
  static const String driversCollection = 'drivers';
  static const String tripsCollection = 'trips';
  static const String pricingCollection = 'pricing';
  static const String settingsCollection = 'settings';

  // Default Pricing
  static const double defaultBaseFare = 100.0;     // فتح العداد
  static const double defaultPerKmRate = 35.0;     // سعر الكيلومتر
  static const double defaultMinimumFare = 150.0;  // الحد الأدنى
  static const double defaultWaitingPerMin = 10.0; // دقيقة الانتظار
  static const double defaultNightSurcharge = 50.0;// زيادة ليلية
}
