import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme.dart';
import 'firebase_options.dart';
import 'features/passenger/passenger_home.dart';
import 'features/driver/driver_home.dart';
import 'features/admin/admin_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    // Allows running in local or preview mode
    debugPrint('Firebase init fallback: $e');
  }

  runApp(const SaykhTaxiApp());
}

class SaykhTaxiApp extends StatefulWidget {
  const SaykhTaxiApp({Key? key}) : super(key: key);

  @override
  State<SaykhTaxiApp> createState() => _SaykhTaxiAppState();
}

class _SaykhTaxiAppState extends State<SaykhTaxiApp> {
  int _currentNavIndex = 0;

  final List<Widget> _screens = const [
    PassengerHome(),
    DriverHome(),
    AdminDashboard(),
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'تاكسي الأبيض سيدي الشيخ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      // Arabic RTL Localization
      locale: const Locale('ar', 'DZ'),
      supportedLocales: const [
        Locale('ar', 'DZ'),
        Locale('fr', 'DZ'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(
        body: _screens[_currentNavIndex],
        bottomNavigationBar: NavigationBar(
          selectedIndex: _currentNavIndex,
          onDestinationSelected: (idx) => setState(() => _currentNavIndex = idx),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.person_pin_circle_outlined),
              selectedIcon: Icon(Icons.person_pin_circle),
              label: 'تطبيق الركاب',
            ),
            NavigationDestination(
              icon: Icon(Icons.local_taxi_outlined),
              selectedIcon: Icon(Icons.local_taxi),
              label: 'بوابة السائقين',
            ),
            NavigationDestination(
              icon: Icon(Icons.admin_panel_settings_outlined),
              selectedIcon: Icon(Icons.admin_panel_settings),
              label: 'لوحة الإدارة',
            ),
          ],
        ),
      ),
    );
  }
}
