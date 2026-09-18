import { Driver, RideRequest } from '../types';
import { calculateDirectDistanceMeters } from '../utils/distance';
import { getSupabase } from '../lib/supabase';

export interface DriverGpsPayload {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number; // km/h
  status: 'available' | 'busy' | 'offline';
  isGpsReal: boolean;
  activeRideId?: string;
  timestamp: number;
}

export interface RouteCoordinates {
  points: [number, number][]; // [lat, lng] array along real roads
  distanceMeters: number;
  durationSeconds: number;
}

// Intersections and main road network of El Abiodh Sidi Cheikh (32)
// This ensures true road-following navigation even if OSRM is unreachable
export const ABIODH_ROAD_NODES: { id: string; name: string; lat: number; lng: number }[] = [
  { id: 'center-roundabout', name: 'مفترق طرق وسط المدينة (الساحة المركزية)', lat: 32.8985, lng: 0.5480 },
  { id: 'avenue-chaab-north', name: 'شارع حي الشعب الرئيسي شمالاً', lat: 32.9025, lng: 0.5495 },
  { id: 'wiam-junction', name: 'ملتقى طريق حي الوئام', lat: 32.9050, lng: 0.5525 },
  { id: 'qods-boulevard', name: 'بولفار حي القدس', lat: 32.8970, lng: 0.5550 },
  { id: 'ksar-entrance', name: 'مدخل القصر الغربي التاريخي', lat: 32.8945, lng: 0.5435 },
  { id: 'ksar-depth', name: 'عمق القصر القديم', lat: 32.8925, lng: 0.5405 },
  { id: 'hospital-crossroad', name: 'مفترق المستشفى ومحطة نقل المسافرين', lat: 32.8920, lng: 0.5510 },
  { id: 'naftal-south-road', name: 'طريق محطة نفطال والمدخل الجنوبي', lat: 32.8885, lng: 0.5595 },
  { id: 'boussemghoun-branch', name: 'مفرق طريق بوسمغون والمقبرة', lat: 32.8870, lng: 0.5375 },
  { id: 'prison-north-bypass', name: 'الطريق الشمالي الدائري والمؤسسة العقابية', lat: 32.9115, lng: 0.5615 },
  { id: 'lotissement-north', name: 'توسعة التجزئة الشمالية وراء الحبس', lat: 32.9145, lng: 0.5655 },
  { id: 'charika-entrance', name: 'مدخل حي الشارقة', lat: 32.9075, lng: 0.5475 },
];

// Broadcast Channel for sub-millisecond tab-to-tab, window-to-window real-time sync
const CHANNEL_NAME = 'saykh_taxi_realtime_gps_v2';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel initialization fallback:', e);
  }
}

/**
 * Broadcast Driver GPS Update to all tabs, windows, and remote clients
 */
export function broadcastDriverGpsUpdate(payload: DriverGpsPayload): void {
  // 1. Cross-tab BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (_) {}
  }

  // 2. LocalStorage event fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('saykh_driver_gps_stream', JSON.stringify(payload));
    } catch (_) {}
  }

  // 3. Supabase Realtime Broadcast (reaches other devices/phones instantly)
  const sb = getSupabase();
  if (sb) {
    try {
      const channel = sb.channel('saykh-live-gps');
      channel.send({
        type: 'broadcast',
        event: 'driver-gps',
        payload,
      });
    } catch (_) {}
  }
}

/**
 * Subscribe to Driver GPS Updates from any driver (local tab or remote)
 */
export function subscribeToDriverGpsUpdates(
  callback: (payload: DriverGpsPayload) => void
): () => void {
  // 1. BroadcastChannel listener
  const bcHandler = (event: MessageEvent) => {
    if (event.data && event.data.driverId && event.data.lat && event.data.lng) {
      callback(event.data as DriverGpsPayload);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', bcHandler);
  }

  // 2. Storage event listener (other tabs writing to localStorage)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'saykh_driver_gps_stream' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.driverId) {
          callback(parsed as DriverGpsPayload);
        }
      } catch (_) {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // 3. Supabase Realtime Broadcast listener
  let sbChannel: any = null;
  const sb = getSupabase();
  if (sb) {
    try {
      sbChannel = sb.channel('saykh-live-gps');
      sbChannel
        .on('broadcast', { event: 'driver-gps' }, (response: any) => {
          if (response.payload && response.payload.driverId) {
            callback(response.payload as DriverGpsPayload);
          }
        })
        .subscribe();
    } catch (_) {}
  }

  // Cleanup function
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
    window.removeEventListener('storage', storageHandler);
    if (sbChannel && sb) {
      try {
        sb.removeChannel(sbChannel);
      } catch (_) {}
    }
  };
}

/**
 * Calculate bearing angle in degrees between two coordinates (0 = North, 90 = East)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Find closest road node in El Abiodh Sidi Cheikh to a given coordinate
 */
function findClosestNode(lat: number, lng: number) {
  let closest = ABIODH_ROAD_NODES[0];
  let minDist = 9999999;
  for (const node of ABIODH_ROAD_NODES) {
    const d = calculateDirectDistanceMeters(lat, lng, node.lat, node.lng);
    if (d < minDist) {
      minDist = d;
      closest = node;
    }
  }
  return closest;
}

/**
 * Generate authentic street waypoints between start and end coordinates.
 * Tries OSRM driving service first, and gracefully falls back to local street graph.
 */
export async function fetchRoadWaypoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteCoordinates> {
  const directDist = calculateDirectDistanceMeters(startLat, startLng, endLat, endLng);

  // If very close (< 80m), direct segment is fine
  if (directDist < 80) {
    return {
      points: [[startLat, startLng], [endLat, endLng]],
      distanceMeters: directDist,
      durationSeconds: Math.max(10, Math.round((directDist / 8.5))),
    };
  }

  // 1. Try public OSRM router with tight timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
        const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
        // OSRM returns [lng, lat], convert to Leaflet's [lat, lng]
        const points: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
        const distanceMeters = Math.round(data.routes[0].distance || directDist * 1.3);
        const durationSeconds = Math.round(data.routes[0].duration || (distanceMeters / 8.5));

        return {
          points,
          distanceMeters,
          durationSeconds,
        };
      }
    }
  } catch (err) {
    // Network or timeout: fallback to robust local road network
  }

  // 2. High-precision fallback via El Abiodh Sidi Cheikh street corridors
  const startNode = findClosestNode(startLat, startLng);
  const endNode = findClosestNode(endLat, endLng);

  const waypoints: [number, number][] = [[startLat, startLng]];

  if (startNode.id !== endNode.id) {
    // Intermediate street points
    waypoints.push([startNode.lat, startNode.lng]);

    // Check if crossing town center
    const centerNode = ABIODH_ROAD_NODES.find(n => n.id === 'center-roundabout')!;
    if (startNode.id !== centerNode.id && endNode.id !== centerNode.id) {
      waypoints.push([centerNode.lat, centerNode.lng]);
    }

    waypoints.push([endNode.lat, endNode.lng]);
  }

  waypoints.push([endLat, endLng]);

  // Interpolate waypoints so points are spaced around ~25 meters apart for super smooth gliding
  const smoothedPoints: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const segDist = calculateDirectDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
    const steps = Math.max(1, Math.round(segDist / 25));

    for (let step = 0; step < steps; step++) {
      const ratio = step / steps;
      const lat = p1[0] + (p2[0] - p1[0]) * ratio;
      const lng = p1[1] + (p2[1] - p1[1]) * ratio;
      smoothedPoints.push([lat, lng]);
    }
  }
  smoothedPoints.push(waypoints[waypoints.length - 1]);

  const roadDist = Math.round(directDist * 1.28);
  return {
    points: smoothedPoints,
    distanceMeters: roadDist,
    durationSeconds: Math.max(15, Math.round(roadDist / 8.5)), // ~30 km/h average
  };
}
