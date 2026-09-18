import { District, PricingConfig } from '../types';

/**
 * Calculates direct geometric distance in meters (Euclidean on Earth sphere)
 * Essential for precise GPS proximity triggers between driver and customer
 */
export function calculateDirectDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates Haversine distance in kilometers between two coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistance = R * c;

  // Road factor: Real driving roads in El Abiodh Sidi Cheikh wind through streets
  // Typically 1.25x to 1.35x Euclidean distance, with a reasonable minimum of 0.8 km
  const roadDistance = Math.max(0.9, Number((rawDistance * 1.3).toFixed(1)));
  return roadDistance;
}

/**
 * Calculate estimated driving duration in minutes
 */
export function estimateDurationMinutes(distanceKm: number): number {
  // Average city speed ~ 30 km/h + traffic/pickup buffer
  const minutes = Math.round((distanceKm / 30) * 60 + 2);
  return Math.max(3, minutes);
}

/**
 * Computes trip fare based on dynamic PricingConfig
 */
export function calculateFare(
  distanceKm: number,
  config: PricingConfig,
  serviceType: 'standard' | 'family' | 'comfort' = 'standard',
  waitingMinutes: number = 0
): number {
  let fare = config.baseFare + distanceKm * config.perKmRate;

  // Add waiting time cost
  if (waitingMinutes > 0 && config.waitingPerMinute) {
    fare += waitingMinutes * config.waitingPerMinute;
  }

  // Add night surcharge if active
  if (config.nightModeEnabled) {
    fare += config.nightSurcharge;
  }

  // Vehicle category multiplier
  if (serviceType === 'family') {
    fare *= (config.familyMultiplier || 1.3);
  } else if (serviceType === 'comfort') {
    fare *= (config.comfortMultiplier || 1.25);
  }

  // Dynamic Surge Pricing Multiplier (e.g. peak hours, rain, high demand)
  if (config.surgeMultiplier && config.surgeMultiplier > 1.0) {
    fare *= config.surgeMultiplier;
  }

  // Ensure minimum fare threshold and round to nearest 10 DZD for cash convenience in Algeria
  const finalFare = Math.max(config.minimumFare, Math.round(fare / 10) * 10);
  return finalFare;
}


/**
 * Format currency in Algerian Dinar
 */
export function formatDZD(amount: number): string {
  return `${Math.round(amount)} دج`;
}

/**
 * Generate intermediate waypoints between point A and B for smooth animation
 */
export function interpolatePoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  steps: number = 20
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  
  // Add a slight realistic curve/detour representative of city street grid
  const midLat = (start.lat + end.lat) / 2 + (start.lng - end.lng) * 0.12;
  const midLng = (start.lng + end.lng) / 2 - (start.lat - end.lat) * 0.12;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve interpolation for smooth road-like path
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * midLat + t * t * end.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * midLng + t * t * end.lng;
    points.push({ lat, lng });
  }

  return points;
}
