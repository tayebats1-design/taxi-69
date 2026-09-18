class PricingModel {
  final double baseFare;
  final double perKmRate;
  final double minimumFare;
  final double waitingPerMinute;
  final double nightSurcharge;
  final bool nightModeEnabled;
  final double familyMultiplier;
  final double comfortMultiplier;
  final double surgeMultiplier;
  final String surgeReason;
  final double platformCommissionRate;

  PricingModel({
    this.baseFare = 100.0,
    this.perKmRate = 35.0,
    this.minimumFare = 150.0,
    this.waitingPerMinute = 10.0,
    this.nightSurcharge = 50.0,
    this.nightModeEnabled = false,
    this.familyMultiplier = 1.3,
    this.comfortMultiplier = 1.5,
    this.surgeMultiplier = 1.0,
    this.surgeReason = 'حالة اعتيادية - طلب مستقر',
    this.platformCommissionRate = 0.15,
  });

  factory PricingModel.fromMap(Map<String, dynamic> map) {
    return PricingModel(
      baseFare: (map['baseFare'] ?? 100.0).toDouble(),
      perKmRate: (map['perKmRate'] ?? 35.0).toDouble(),
      minimumFare: (map['minimumFare'] ?? 150.0).toDouble(),
      waitingPerMinute: (map['waitingPerMinute'] ?? 10.0).toDouble(),
      nightSurcharge: (map['nightSurcharge'] ?? 50.0).toDouble(),
      nightModeEnabled: map['nightModeEnabled'] ?? false,
      familyMultiplier: (map['familyMultiplier'] ?? 1.3).toDouble(),
      comfortMultiplier: (map['comfortMultiplier'] ?? 1.5).toDouble(),
      surgeMultiplier: (map['surgeMultiplier'] ?? 1.0).toDouble(),
      surgeReason: map['surgeReason'] ?? 'حالة اعتيادية',
      platformCommissionRate: (map['platformCommissionRate'] ?? 0.15).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'baseFare': baseFare,
      'perKmRate': perKmRate,
      'minimumFare': minimumFare,
      'waitingPerMinute': waitingPerMinute,
      'nightSurcharge': nightSurcharge,
      'nightModeEnabled': nightModeEnabled,
      'familyMultiplier': familyMultiplier,
      'comfortMultiplier': comfortMultiplier,
      'surgeMultiplier': surgeMultiplier,
      'surgeReason': surgeReason,
      'platformCommissionRate': platformCommissionRate,
    };
  }
}
