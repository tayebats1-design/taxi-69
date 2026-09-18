class FareCalculator {
  static double baseFare = 10.0;
  static double pricePerKm = 3.5;
  static double pricePerMinute = 0.5;
  static double surgeMultiplier = 1.0;

  static double calculate({
    required double distanceKm,
    required int durationMinutes,
    required String category,
  }) {
    double multiplier = 1.0;
    if (category == 'family') multiplier = 1.3;
    if (category == 'luxury') multiplier = 1.8;

    double fare = baseFare + (distanceKm * pricePerKm) + (durationMinutes * pricePerMinute);
    fare *= multiplier * surgeMultiplier;
    return fare.ceilToDouble();
  }

  // دعم التوافق مع النداءات الأخرى إن وجدت
  static double calculateFare({
    required double distanceKm,
    dynamic pricing,
    required String rideType,
    double waitingMinutes = 0,
    bool isNight = false,
  }) {
    return calculate(
      distanceKm: distanceKm,
      durationMinutes: waitingMinutes.toInt(),
      category: rideType == 'comfort' ? 'luxury' : rideType,
    );
  }
}
