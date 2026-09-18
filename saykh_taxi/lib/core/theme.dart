import 'package:flutter/material.dart';

class AppTheme {
  // Taxi Yellow / Amber Brand Colors
  static const Color primaryColor = Color(0xFFEAB308); // Yellow 500
  static const Color primaryDark = Color(0xFFCA8A04);  // Yellow 600
  static const Color accentColor = Color(0xFF1E293B);   // Slate 800
  static const Color backgroundColor = Color(0xFFF8FAFC); // Slate 50
  static const Color cardColor = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A);  // Slate 900
  static const Color textSecondary = Color(0xFF64748B);// Slate 500
  static const Color successColor = Color(0xFF10B981);  // Emerald 500
  static const Color dangerColor = Color(0xFFEF4444);   // Red 500

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Cairo',
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryDark,
        secondary: accentColor,
        background: backgroundColor,
        surface: cardColor,
      ),
      scaffoldBackgroundColor: backgroundColor,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
          fontFamily: 'Cairo',
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.black87,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
          ),
        ),
      ),
      cardTheme: CardTheme(
        color: cardColor,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
    );
  }
}
