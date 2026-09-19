import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { District, Driver, RideRequest } from '../../types';
import { CITY_CENTER, OFFICIAL_DISTRICTS } from '../../data/districts';
import { 
  Navigation, 
  MapPin, 
  Compass, 
  Car, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Locate,
  Satellite,
  Map as MapIcon,
  Phone,
  User,
  Radio,
  Crosshair,
  Maximize2,
  Sparkles,
  Building2,
  GraduationCap,
  Hospital,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import { TripSafetyShare } from '../Customer/TripSafetyShare';
import { fetchRoadWaypoints, calculateBearing as calcBearingGps } from '../../services/realtimeTracking';
import { calculateDirectDistanceMeters } from '../../utils/distance';

// Fix Leaflet's default icon path issues in Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Safeguard Leaflet DomUtil against undefined element references
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const origGetPosition = L.DomUtil.getPosition;
  // @ts-ignore
  L.DomUtil.getPosition = function (el: any) {
    if (!el || typeof el !== 'object' || !('_leaflet_pos' in el)) {
      return new L.Point(0, 0);
    }
    return origGetPosition.call(L.DomUtil, el);
  };

  const origSetPosition = L.DomUtil.setPosition;
  // @ts-ignore
  L.DomUtil.setPosition = function (el: any, point: L.Point) {
    if (!el || typeof el !== 'object') return;
    origSetPosition.call(L.DomUtil, el, point);
  };
}

interface CityMapProps {
  drivers: Driver[];
  selectedDriverId?: string;
  activeRide?: RideRequest | null;
  pickupDistrict?: District | null;
  dropoffDistrict?: District | null;
  onSelectDistrict?: (district: District, type: 'pickup' | 'dropoff') => void;
  userCoords?: { lat: number; lng: number; accuracy?: number } | null;
  currentRole: 'customer' | 'driver' | 'admin';
  currentDriver?: Driver;
  onMapClickLocation?: (coords: { lat: number; lng: number; name: string }, type: 'pickup' | 'dropoff') => void;
  isCustomerGpsActive?: boolean;
  isDriverGpsActive?: boolean;
  onToggleCustomerGps?: () => void;
  onToggleDriverGps?: () => void;
  onUpdateDriverLocation?: (driverId: string, lat: number, lng: number) => void;
  onRequestRideDirectly?: () => void;
}

// Reliable and Authentic Tile layers for El Abiodh Sidi Cheikh
const TILE_LAYERS = {
  googleStreets: {
    name: 'خريطة قوقل الحقيقية (شوارع بالعربية)',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar',
    attribution: 'خرائط Google &copy; الأبيض سيدي الشيخ',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  googleHybrid: {
    name: 'قمر صناعي قوقل مع أسماء الشوارع',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=ar',
    attribution: 'تصوير فضائي Google &copy; الأبيض سيدي الشيخ',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  osm: {
    name: 'خريطة OpenStreetMap الرسمية',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  satellite: {
    name: 'قمر صناعي فضائي Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    subdomains: ['a', 'b', 'c'],
  },
};

export const CityMap: React.FC<CityMapProps> = ({
  drivers,
  selectedDriverId,
  activeRide,
  pickupDistrict,
  dropoffDistrict,
  onSelectDistrict,
  userCoords,
  currentRole,
  currentDriver,
  onMapClickLocation,
  isCustomerGpsActive,
  isDriverGpsActive,
  onToggleCustomerGps,
  onToggleDriverGps,
  onUpdateDriverLocation,
  onRequestRideDirectly,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Auto-activate customer GPS tracking on entry
  useEffect(() => {
    if (currentRole === 'customer' && !isCustomerGpsActive && onToggleCustomerGps) {
      onToggleCustomerGps();
    }
  }, [currentRole, isCustomerGpsActive, onToggleCustomerGps]);

  // Track if map has smoothly flown to user's initial live GPS coordinates
  const hasInitialGpsFlyRef = useRef(false);
  useEffect(() => {
    if (userCoords && mapInstanceRef.current && !hasInitialGpsFlyRef.current) {
      hasInitialGpsFlyRef.current = true;
      mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 16, { duration: 1.2 });
    }
  }, [userCoords]);

  // Layers
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const customerAccuracyCircleRef = useRef<L.Circle | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);
  const driverMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const clickPopupRef = useRef<L.Popup | null>(null);

  // Map settings
  const [mapType, setMapType] = useState<'googleStreets' | 'googleHybrid' | 'osm' | 'satellite'>('googleStreets');
  const [trackingDistanceMeters, setTrackingDistanceMeters] = useState<number | null>(null);
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);

  // Assigned driver for active ride
  const assignedDriver = activeRide?.assignedDriverId
    ? drivers.find(d => d.id === activeRide.assignedDriverId)
    : null;

  // El Abiodh Sidi Cheikh coordinates
  const ABIODH_CENTER: [number, number] = [CITY_CENTER.lat, CITY_CENTER.lng]; // 32.8980, 0.5480

  // Calculate distance in meters between two lat/lng
  const calcDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Safe invalidate map size helper
  const triggerInvalidateSize = useCallback(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.invalidateSize({ animate: false });
      } catch (_) {}
    }
  }, []);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ABIODH_CENTER,
      zoom: 15,
      minZoom: 11,
      maxZoom: 20,
      zoomControl: false,
      attributionControl: false,
    });

    const config = TILE_LAYERS[mapType];
    const tile = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
      crossOrigin: true,
    }).addTo(map);
    tileLayerRef.current = tile;

    // Layer groups
    landmarksLayerRef.current = L.layerGroup().addTo(map);
    driversLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Map click handler: allow user to click on any street/location
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const isDriver = currentRole === 'driver';
      const popup = L.popup({ autoPan: false, closeButton: true })
        .setLatLng([lat, lng])
        .setContent(`
          <div class="p-2.5 text-right font-sans min-w-[210px]" dir="rtl">
            <p class="text-xs font-black text-slate-800 mb-1">نقطة محددة على خريطة الأبيض</p>
            <p class="text-[10px] text-slate-500 mb-2 font-mono" dir="ltr">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button id="map-click-pickup" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer">
                🟢 نقطة انطلاق
              </button>
              <button id="map-click-dropoff" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer">
                🔴 نقطة وصول
              </button>
            </div>
            ${isDriver ? `
              <button id="map-click-driver" class="w-full mt-1.5 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center justify-center gap-1">
                🚕 تعيين موقع سيارتي التاكسي هنا
              </button>
            ` : ''}
          </div>
        `)
        .openOn(map);

      clickPopupRef.current = popup;

      setTimeout(() => {
        const pickupBtn = document.getElementById('map-click-pickup');
        const dropoffBtn = document.getElementById('map-click-dropoff');
        const driverBtn = document.getElementById('map-click-driver');

        if (pickupBtn) {
          pickupBtn.onclick = () => {
            if (onMapClickLocation) {
              onMapClickLocation({ lat, lng, name: 'موقع محدد على الخريطة' }, 'pickup');
            }
            try { map.closePopup(); } catch (_) {}
          };
        }
        if (dropoffBtn) {
          dropoffBtn.onclick = () => {
            if (onMapClickLocation) {
              onMapClickLocation({ lat, lng, name: 'وجهة محددة على الخريطة' }, 'dropoff');
            }
            try { map.closePopup(); } catch (_) {}
          };
        }
        if (driverBtn && onUpdateDriverLocation && currentDriver) {
          driverBtn.onclick = () => {
            onUpdateDriverLocation(currentDriver.id, lat, lng);
            try { map.closePopup(); } catch (_) {}
          };
        }
      }, 50);
    });

    mapInstanceRef.current = map;

    // Multi-stage size invalidation so tiles never fail on mount
    const t1 = setTimeout(triggerInvalidateSize, 50);
    const t2 = setTimeout(triggerInvalidateSize, 200);
    const t3 = setTimeout(triggerInvalidateSize, 500);
    const t4 = setTimeout(triggerInvalidateSize, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (clickPopupRef.current) {
        try { clickPopupRef.current.remove(); } catch (_) {}
        clickPopupRef.current = null;
      }
      if (customerMarkerRef.current) {
        try { customerMarkerRef.current.remove(); } catch (_) {}
        customerMarkerRef.current = null;
      }
      if (customerAccuracyCircleRef.current) {
        try { customerAccuracyCircleRef.current.remove(); } catch (_) {}
        customerAccuracyCircleRef.current = null;
      }
      if (dropoffMarkerRef.current) {
        try { dropoffMarkerRef.current.remove(); } catch (_) {}
        dropoffMarkerRef.current = null;
      }
      if (driverMarkersRef.current) {
        driverMarkersRef.current.forEach(m => {
          try { m.remove(); } catch (_) {}
        });
        driverMarkersRef.current.clear();
      }
      if (driversLayerRef.current) {
        try { driversLayerRef.current.clearLayers(); } catch (_) {}
        driversLayerRef.current = null;
      }
      if (routeLayerRef.current) {
        try { routeLayerRef.current.clearLayers(); } catch (_) {}
        routeLayerRef.current = null;
      }
      if (landmarksLayerRef.current) {
        try { landmarksLayerRef.current.clearLayers(); } catch (_) {}
        landmarksLayerRef.current = null;
      }
      try {
        map.remove();
      } catch (_) {}
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate map size on container resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      triggerInvalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [triggerInvalidateSize]);

  // 2. Switch Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (_) {}
    }

    const config = TILE_LAYERS[mapType];
    const newTile = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = newTile;
    triggerInvalidateSize();
  }, [mapType, triggerInvalidateSize]);

  // 2.5 Render Official Landmarks & Districts of El Abiodh Sidi Cheikh
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = landmarksLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!showLandmarks) return;

    OFFICIAL_DISTRICTS.forEach((dist) => {
      // Don't duplicate if actively selected as pickup or dropoff
      if (pickupDistrict?.id === dist.id || dropoffDistrict?.id === dist.id) return;

      let iconEmoji = '🏢';
      let tagBg = 'bg-slate-900/90 text-amber-200 border-amber-500/40';

      if (dist.category === 'historic') {
        iconEmoji = '🏛️';
        tagBg = 'bg-amber-950/90 text-amber-300 border-amber-400/50';
      } else if (dist.category === 'facility') {
        iconEmoji = dist.id.includes('hospital') ? '🏥' : '🏛️';
        tagBg = 'bg-blue-950/90 text-blue-200 border-blue-400/50';
      } else if (dist.category === 'education') {
        iconEmoji = '🎓';
        tagBg = 'bg-emerald-950/90 text-emerald-200 border-emerald-400/50';
      } else if (dist.category === 'transport') {
        iconEmoji = '⛽';
        tagBg = 'bg-purple-950/90 text-purple-200 border-purple-400/50';
      }

      const badgeHtml = `
        <div class="flex items-center gap-1 px-2 py-0.5 rounded-full shadow-md text-[10px] font-bold ${tagBg} border cursor-pointer hover:scale-110 transition-transform whitespace-nowrap">
          <span>${iconEmoji}</span>
          <span>${dist.nameAr}</span>
        </div>
      `;

      const badgeIcon = L.divIcon({
        html: badgeHtml,
        className: 'abiodh-landmark-marker',
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      });

      const marker = L.marker([dist.lat, dist.lng], {
        icon: badgeIcon,
        zIndexOffset: 250,
      });

      marker.bindPopup(`
        <div class="p-2.5 text-right font-sans min-w-[210px]" dir="rtl">
          <div class="flex items-center gap-1.5 mb-1 text-xs font-black text-slate-800">
            <span>${iconEmoji}</span>
            <span>${dist.nameAr}</span>
          </div>
          <p class="text-[10px] text-slate-500 mb-2 font-mono" dir="ltr">${dist.lat.toFixed(4)}, ${dist.lng.toFixed(4)}</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button id="landmark-pickup-${dist.id}" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer">
              🟢 نقطة انطلاق
            </button>
            <button id="landmark-dropoff-${dist.id}" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer">
              🔴 وجهة وصول
            </button>
          </div>
          ${currentRole === 'driver' ? `
            <button id="landmark-driver-${dist.id}" class="w-full mt-1.5 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center justify-center gap-1">
              🚕 وضع سيارتي التاكسي هنا
            </button>
          ` : ''}
        </div>
      `, { autoPan: false });

      marker.on('popupopen', () => {
        const pBtn = document.getElementById(`landmark-pickup-${dist.id}`);
        const dBtn = document.getElementById(`landmark-dropoff-${dist.id}`);
        const drvBtn = document.getElementById(`landmark-driver-${dist.id}`);

        if (pBtn && onSelectDistrict) {
          pBtn.onclick = () => {
            onSelectDistrict(dist, 'pickup');
            marker.closePopup();
          };
        }
        if (dBtn && onSelectDistrict) {
          dBtn.onclick = () => {
            onSelectDistrict(dist, 'dropoff');
            marker.closePopup();
          };
        }
        if (drvBtn && onUpdateDriverLocation && currentDriver) {
          drvBtn.onclick = () => {
            onUpdateDriverLocation(currentDriver.id, dist.lat, dist.lng);
            marker.closePopup();
          };
        }
      });

      group.addLayer(marker);
    });
  }, [showLandmarks, pickupDistrict?.id, dropoffDistrict?.id, currentRole, currentDriver?.id, onSelectDistrict, onUpdateDriverLocation]);

  // 3. Render Customer GPS / Pickup Marker (نقطة الزبون 🟢 مع دائرة دقة الـ GPS)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = pickupDistrict ? pickupDistrict.lat : userCoords ? userCoords.lat : null;
    const lng = pickupDistrict ? pickupDistrict.lng : userCoords ? userCoords.lng : null;

    if (lat !== null && lng !== null) {
      const isGps = Boolean(isCustomerGpsActive || userCoords?.accuracy);
      const customerIconHtml = `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <div class="absolute w-14 h-14 rounded-full bg-emerald-500/25 animate-ping"></div>
          <div class="relative w-10 h-10 rounded-full bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white z-10">
            <span class="text-base">${isGps ? '📡' : '🟢'}</span>
          </div>
          <div class="bg-emerald-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg mt-1 whitespace-nowrap border border-emerald-400 flex items-center gap-1">
            <span>موقع الزبون</span>
            ${isGps ? '<span class="text-[9px] text-emerald-300 font-mono">GPS</span>' : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: customerIconHtml,
        className: 'customer-marker',
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      });

      if (!customerMarkerRef.current || !customerMarkerRef.current.getElement()) {
        if (customerMarkerRef.current) {
          try { customerMarkerRef.current.remove(); } catch (_) {}
        }
        const marker = L.marker([lat, lng], { icon, zIndexOffset: 900 }).addTo(map);
        marker.bindPopup(`
          <div class="p-2.5 text-right font-sans" dir="rtl">
            <h4 class="text-xs font-black text-emerald-800 flex items-center gap-1">
              <span>🟢</span>
              <span>موقع الزبون ${isGps ? '(تتبع GPS مباشر)' : ''}</span>
            </h4>
            <p class="text-[11px] text-slate-700 mt-1 font-bold">${pickupDistrict ? pickupDistrict.nameAr : 'الموقع الجغرافي للمسافر'}</p>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5" dir="ltr">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
          </div>
        `, { autoPan: false });
        customerMarkerRef.current = marker;
      } else {
        try {
          customerMarkerRef.current.setLatLng([lat, lng]);
          customerMarkerRef.current.setIcon(icon);
        } catch (_) {}
      }

      // Accuracy circle if GPS is active
      const accuracyRadius = userCoords?.accuracy ? Math.min(100, Math.max(15, userCoords.accuracy)) : 30;
      if (isGps) {
        if (!customerAccuracyCircleRef.current) {
          customerAccuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracyRadius,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
        } else {
          try {
            customerAccuracyCircleRef.current.setLatLng([lat, lng]);
            customerAccuracyCircleRef.current.setRadius(accuracyRadius);
          } catch (_) {}
        }
      } else if (customerAccuracyCircleRef.current) {
        try { customerAccuracyCircleRef.current.remove(); } catch (_) {}
        customerAccuracyCircleRef.current = null;
      }
    } else {
      if (customerMarkerRef.current) {
        try { customerMarkerRef.current.remove(); } catch (_) {}
        customerMarkerRef.current = null;
      }
      if (customerAccuracyCircleRef.current) {
        try { customerAccuracyCircleRef.current.remove(); } catch (_) {}
        customerAccuracyCircleRef.current = null;
      }
    }
  }, [pickupDistrict, userCoords, isCustomerGpsActive]);

  // 4. Render Destination Dropoff Point (نقطة الوجهة 🔴)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dropoffDistrict) {
      const dropoffIconHtml = `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
          <div class="w-9 h-9 rounded-full bg-rose-600 border-2 border-white shadow-2xl flex items-center justify-center text-white z-10 animate-bounce">
            <span class="text-sm">🏁</span>
          </div>
          <div class="bg-rose-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg mt-1 whitespace-nowrap border border-rose-400">
            🔴 الوجهة: ${dropoffDistrict.nameAr}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: dropoffIconHtml,
        className: 'dropoff-marker',
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      });

      if (!dropoffMarkerRef.current || !dropoffMarkerRef.current.getElement()) {
        if (dropoffMarkerRef.current) {
          try { dropoffMarkerRef.current.remove(); } catch (_) {}
        }
        const marker = L.marker([dropoffDistrict.lat, dropoffDistrict.lng], { icon, zIndexOffset: 850 }).addTo(map);
        marker.bindPopup(`
          <div class="p-2.5 text-right font-sans" dir="rtl">
            <h4 class="text-xs font-black text-rose-800">🔴 وجهة الوصول</h4>
            <p class="text-[11px] text-slate-700 font-bold">${dropoffDistrict.nameAr}</p>
          </div>
        `, { autoPan: false });
        dropoffMarkerRef.current = marker;
      } else {
        try {
          dropoffMarkerRef.current.setLatLng([dropoffDistrict.lat, dropoffDistrict.lng]);
          dropoffMarkerRef.current.setIcon(icon);
        } catch (_) {}
      }
    } else if (dropoffMarkerRef.current) {
      try { dropoffMarkerRef.current.remove(); } catch (_) {}
      dropoffMarkerRef.current = null;
    }
  }, [dropoffDistrict]);

  // 5. Render Taxis & Mutual Tracking (نقطة الطاكسي 🚕 تظهر للزبون والزبون يظهر للطاكسي)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = driversLayerRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !group || !routeGroup) return;

    const markersMap = driverMarkersRef.current;
    const currentActiveDriverIds = new Set<string>();

    // Assigned driver or logged in driver
    const assignedDriver = activeRide?.assignedDriverId 
      ? drivers.find(d => d.id === activeRide.assignedDriverId) 
      : null;

    drivers.forEach((driver) => {
      const isCurrentLoggedIn = currentDriver?.id === driver.id;
      const isRideAssigned = assignedDriver?.id === driver.id;

      // Only show online drivers or current driver
      if (!driver.isOnline && !isCurrentLoggedIn) return;
      currentActiveDriverIds.add(driver.id);

      let taxiColor = 'bg-amber-400 border-amber-500 text-slate-950';
      let ringEffect = '';

      if (isRideAssigned) {
        taxiColor = 'bg-amber-500 border-white text-slate-950';
        ringEffect = '<div class="absolute w-14 h-14 rounded-full bg-amber-400/50 animate-ping"></div>';
      }

      const heading = (driver.currentLocation as any).heading || 0;
      const speed = (driver.currentLocation as any).speed || 0;

      const taxiIconHtml = `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform duration-200">
          ${ringEffect}
          ${speed > 0 ? `
            <div class="absolute -top-4 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full font-mono shadow-md border border-emerald-300 z-20 flex items-center gap-1 whitespace-nowrap">
              <span>⚡</span>
              <span>${speed} كم/س</span>
            </div>
          ` : ''}
          <div class="relative w-11 h-11 rounded-full ${taxiColor} border-2 shadow-2xl flex items-center justify-center font-black z-10">
            <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease-out; display: inline-flex; align-items: center; justify-content: center;">
              <span class="text-lg select-none">🚕</span>
            </div>
          </div>
          <div class="bg-slate-950/95 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg mt-1 border border-amber-500/40 whitespace-nowrap flex items-center gap-1">
            <span>${driver.name.split(' ')[0]}</span>
            <span class="text-[9px] text-amber-400/80 font-mono">32</span>
            ${(isDriverGpsActive || speed > 0) ? '<span class="text-[8px] bg-emerald-500 text-white px-1 rounded-full animate-pulse">GPS</span>' : ''}
          </div>
        </div>
      `;

      const taxiIcon = L.divIcon({
        html: taxiIconHtml,
        className: 'abiodh-taxi-marker',
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      // Driver position: strictly follows real GPS coordinates (NO automatic fake simulation)
      const driverLat = (isRideAssigned && activeRide?.driverLocation) 
        ? activeRide.driverLocation.lat 
        : driver.currentLocation.lat;
      const driverLng = (isRideAssigned && activeRide?.driverLocation) 
        ? activeRide.driverLocation.lng 
        : driver.currentLocation.lng;

      const existingMarker = markersMap.get(driver.id);
      if (existingMarker && existingMarker.getElement()) {
        try {
          existingMarker.setLatLng([driverLat, driverLng]);
          existingMarker.setIcon(taxiIcon);
          existingMarker.setZIndexOffset(isRideAssigned ? 1000 : 700);
          if (isCurrentLoggedIn && existingMarker.dragging) {
            existingMarker.dragging.enable();
          }
        } catch (_) {}
      } else {
        if (existingMarker) {
          try { existingMarker.remove(); } catch (_) {}
        }
        const marker = L.marker([driverLat, driverLng], {
          icon: taxiIcon,
          zIndexOffset: isRideAssigned ? 1000 : 700,
          draggable: isCurrentLoggedIn,
        });

        // Allow driver to position taxi directly on the map if logged in
        if (isCurrentLoggedIn) {
          marker.on('dragend', (e: any) => {
            const newPos = e.target.getLatLng();
            if (onUpdateDriverLocation) {
              onUpdateDriverLocation(driver.id, newPos.lat, newPos.lng);
            }
          });
        }

        marker.bindPopup(`
          <div class="p-3 text-right font-sans min-w-[210px]" dir="rtl">
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <img src="${driver.avatar}" class="w-9 h-9 rounded-full object-cover border-2 border-amber-400" />
              <div>
                <h4 class="font-bold text-xs text-slate-900">${driver.name}</h4>
                <p class="text-[10px] text-slate-500 font-mono">${driver.plateNumber}</p>
              </div>
            </div>
            <div class="text-[11px] space-y-1 text-slate-700">
              <div>🚗 <strong>${driver.carModel}</strong> (${driver.carColor})</div>
              <div>⭐ <strong>${driver.rating}</strong> (${driver.totalTrips} رحلة منجزة)</div>
              <div class="pt-1 flex items-center justify-between">
                <span class="text-slate-500">هاتف السائق:</span>
                ${(driver.showPhoneToCustomer === false && currentRole !== 'admin') ? `
                  <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px] border border-slate-200">
                    🔒 محمي (خاص بالإدارة)
                  </span>
                ` : `
                  <a href="tel:${driver.phone.replace(/\\s/g, '')}" class="px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-bold font-mono text-[10px]">
                    ${driver.phone}
                  </a>
                `}
              </div>
            </div>
          </div>
        `, { autoPan: false });

        group.addLayer(marker);
        markersMap.set(driver.id, marker);
      }
    });

    // Remove inactive markers
    markersMap.forEach((marker, id) => {
      if (!currentActiveDriverIds.has(id)) {
        try {
          group.removeLayer(marker);
        } catch (_) {}
        markersMap.delete(id);
      }
    });

    // Draw Mutual Tracking Route Polyline along real streets
    routeGroup.clearLayers();
    if (activeRide && assignedDriver) {
      const taxiLat = (activeRide.driverLocation?.lat) ?? assignedDriver.currentLocation.lat;
      const taxiLng = (activeRide.driverLocation?.lng) ?? assignedDriver.currentLocation.lng;

      if (activeRide.status === 'driver_arriving') {
        const destLat = activeRide.pickupDistrict.lat;
        const destLng = activeRide.pickupDistrict.lng;

        // Fetch realistic road route coordinates
        fetchRoadWaypoints(taxiLat, taxiLng, destLat, destLng).then(route => {
          if (!map || !routeGroup) return;
          const roadPoints = route.points;

          // 1. Road casing line
          const casingLine = L.polyline(roadPoints, {
            color: '#064e3b',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeGroup.addLayer(casingLine);

          // 2. Main street route polyline
          const trackLine = L.polyline(roadPoints, {
            color: '#10b981',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeGroup.addLayer(trackLine);
        });

        // Calculate REAL distance in meters
        const meters = calcDistanceMeters(taxiLat, taxiLng, destLat, destLng);
        setTrackingDistanceMeters(meters);

        // Smoothly follow taxi if enabled
        if (isAutoFollow) {
          try {
            map.panTo([taxiLat, taxiLng], { animate: true, duration: 0.6 });
          } catch (_) {}
        }

      } else if (activeRide.status === 'in_progress') {
        const destLat = activeRide.dropoffDistrict.lat;
        const destLng = activeRide.dropoffDistrict.lng;

        fetchRoadWaypoints(taxiLat, taxiLng, destLat, destLng).then(route => {
          if (!map || !routeGroup) return;
          const roadPoints = route.points;

          // 1. Road casing line
          const casingLine = L.polyline(roadPoints, {
            color: '#78350f',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeGroup.addLayer(casingLine);

          // 2. Main route polyline
          const tripLine = L.polyline(roadPoints, {
            color: '#f59e0b',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeGroup.addLayer(tripLine);
        });

        const meters = calcDistanceMeters(taxiLat, taxiLng, destLat, destLng);
        setTrackingDistanceMeters(meters);

        if (isAutoFollow) {
          try {
            map.panTo([taxiLat, taxiLng], { animate: true, duration: 0.6 });
          } catch (_) {}
        }
      }
    } else {
      setTrackingDistanceMeters(null);
    }
  }, [drivers, activeRide, currentRole, currentDriver, isDriverGpsActive, isAutoFollow, onUpdateDriverLocation]);

  // Map Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  
  const handleRecenterCity = () => {
    mapInstanceRef.current?.flyTo(ABIODH_CENTER, 15, { duration: 1 });
  };

  const handleRecenterUser = () => {
    const lat = pickupDistrict ? pickupDistrict.lat : userCoords ? userCoords.lat : null;
    const lng = pickupDistrict ? pickupDistrict.lng : userCoords ? userCoords.lng : null;
    if (lat !== null && lng !== null && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1 });
    } else {
      handleRecenterCity();
    }
  };

  const handleRecenterDriver = () => {
    const target = activeRide?.assignedDriverId 
      ? drivers.find(d => d.id === activeRide.assignedDriverId)
      : currentDriver || drivers.find(d => d.isOnline);

    const lat = activeRide?.driverLocation?.lat ?? target?.currentLocation.lat;
    const lng = activeRide?.driverLocation?.lng ?? target?.currentLocation.lng;
    
    if (lat !== undefined && lng !== undefined && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1 });
    } else {
      handleRecenterCity();
    }
  };

  const handleFitMutualTrack = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRide && activeRide.assignedDriverId) {
      const driver = drivers.find(d => d.id === activeRide.assignedDriverId);
      const driverLat = activeRide.driverLocation?.lat ?? driver?.currentLocation.lat;
      const driverLng = activeRide.driverLocation?.lng ?? driver?.currentLocation.lng;

      if (driverLat !== undefined && driverLng !== undefined) {
        const target = activeRide.status === 'in_progress' && activeRide.dropoffDistrict
          ? activeRide.dropoffDistrict
          : activeRide.pickupDistrict;

        const bounds = L.latLngBounds(
          [driverLat, driverLng],
          [target.lat, target.lng]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
        return;
      }
    }
    
    // Fit all online drivers + pickup
    const points: [number, number][] = drivers
      .filter(d => d.isOnline)
      .map(d => [d.currentLocation.lat, d.currentLocation.lng]);
    
    if (pickupDistrict) points.push([pickupDistrict.lat, pickupDistrict.lng]);
    if (dropoffDistrict) points.push([dropoffDistrict.lat, dropoffDistrict.lng]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      handleRecenterCity();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 font-['Cairo',sans-serif]">
      {/* Top Floating Bar */}
      <div className="absolute top-3 inset-x-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Real Map & GPS Indicator */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-slate-200 flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${currentRole === 'customer' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
          <div className="text-right">
            <h3 className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1.5">
              <span>خريطة الأبيض سيدي الشيخ</span>
              {(isCustomerGpsActive || isDriverGpsActive) && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black">
                  GPS مباشر 🛰️
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              تتبع حي ومباشر بين السائق والزبون
            </p>
          </div>
        </div>

        {/* Layer Switcher & GPS Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200 overflow-x-auto max-w-full">
          {/* Google Streets (Default) */}
          <button
            onClick={() => setMapType('googleStreets')}
            title="خريطة قوقل الحقيقية (شوارع وأحياء بالعربية)"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              mapType === 'googleStreets'
                ? currentRole === 'customer'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>شوارع قوقل</span>
          </button>

          {/* Google Hybrid Satellite */}
          <button
            onClick={() => setMapType('googleHybrid')}
            title="تصوير فضائي قوقل مع أسماء الشوارع بالعربية"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              mapType === 'googleHybrid'
                ? currentRole === 'customer'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>قمر قوقل الهجين</span>
          </button>

          {/* OSM */}
          <button
            onClick={() => setMapType('osm')}
            title="خريطة OpenStreetMap المفتوحة"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              mapType === 'osm'
                ? currentRole === 'customer'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>OSM</span>
          </button>

          {/* Landmarks Toggle */}
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            title="إظهار / إخفاء معالم وأحياء الأبيض سيدي الشيخ"
            className={`px-2 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              showLandmarks
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>معالم الأبيض</span>
          </button>

          {/* Quick GPS Toggle inside map */}
          {currentRole === 'customer' && onToggleCustomerGps && (
            <button
              onClick={onToggleCustomerGps}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isCustomerGpsActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
              }`}
              title="تفعيل / تحديث الـ GPS للزبون"
            >
              <Radio className={`w-3.5 h-3.5 ${isCustomerGpsActive ? 'animate-pulse' : ''}`} />
              <span>GPS الزبون</span>
            </button>
          )}

          {currentRole === 'driver' && onToggleDriverGps && (
            <button
              onClick={onToggleDriverGps}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isDriverGpsActive
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
              title="تفعيل / إيقاف بث الـ GPS للسائق"
            >
              <Radio className={`w-3.5 h-3.5 ${isDriverGpsActive ? 'animate-pulse' : ''}`} />
              <span>GPS السائق</span>
            </button>
          )}
        </div>
      </div>

      {/* Mutual Tracking Live Status Card (شريط التتبع الحي المتبادل) */}
      {activeRide && (
        <div className="absolute top-16 inset-x-3 z-[400] pointer-events-none">
          <div className={`pointer-events-auto mx-auto max-w-lg p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border text-right transition animate-in slide-in-from-top-3 ${
            currentRole === 'customer'
              ? 'bg-emerald-950/95 text-white border-emerald-500/50'
              : 'bg-amber-950/95 text-white border-amber-500/50'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow">
                  🚕
                </div>
                <div className="text-right">
                  <div className="text-xs font-black flex items-center gap-1.5 text-white">
                    <span>
                      {activeRide.status === 'driver_arriving'
                        ? 'التاكسي في طريقه إلى الزبون'
                        : activeRide.status === 'driver_arrived'
                        ? 'وصل التاكسي إلى موقع الزبون'
                        : 'الرحلة جارية نحو الوجهة'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    🟢 الزبون: <strong>{activeRide.pickupDistrict.nameAr}</strong>
                    {activeRide.dropoffDistrict && (
                      <span> ⬅ 🔴 {activeRide.dropoffDistrict.nameAr}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {trackingDistanceMeters !== null && (
                  <div className="text-left bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <div className="text-[10px] text-slate-300 font-medium">المسافة الحية</div>
                    <div className="text-xs font-black text-amber-300 font-mono" dir="ltr">
                      {trackingDistanceMeters > 1000 
                        ? `${(trackingDistanceMeters / 1000).toFixed(2)} كم` 
                        : `${trackingDistanceMeters} م`}
                    </div>
                  </div>
                )}

                {currentRole === 'customer' && assignedDriver && (
                  <TripSafetyShare
                    activeRide={activeRide}
                    assignedDriver={assignedDriver}
                    buttonVariant="compact"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet Map DOM Element */}
      <div 
        ref={mapContainerRef} 
        id="abiodh-clean-interactive-map" 
        className="w-full flex-1 min-h-[500px] z-0 focus:outline-none"
      />

      {/* Floating Map Navigation Controls */}
      <div className="absolute bottom-5 right-3 z-[400] flex flex-col gap-1.5">
        {/* Recenter / Fit Both */}
        <button
          onClick={handleFitMutualTrack}
          title="إظهار السائق والزبون معاً (Auto-Fit)"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-slate-800 hover:text-emerald-700 hover:bg-white transition cursor-pointer"
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        {/* Center on User 🟢 */}
        <button
          onClick={handleRecenterUser}
          title="التمركز على موقع الزبون 🟢"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
        >
          <Locate className="w-5 h-5" />
        </button>

        {/* Center on Taxi 🚕 */}
        <button
          onClick={handleRecenterDriver}
          title="التمركز على موقع التاكسي 🚕"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-amber-800 hover:bg-amber-50 transition cursor-pointer font-bold text-sm"
        >
          🚕
        </button>

        {/* Center on City */}
        <button
          onClick={handleRecenterCity}
          title="التمركز على وسط الأبيض سيدي الشيخ"
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-950 transition cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* Zoom controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden mt-1">
          <button
            onClick={handleZoomIn}
            title="تكبير"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition border-b border-slate-100 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="تصغير"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Direct Ride Request Icon & Button for Customer on Map */}
      {currentRole === 'customer' && !activeRide && (
        <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[450] flex flex-col items-center gap-1.5 w-auto max-w-[95%]">
          <button
            type="button"
            id="btn-direct-request-ride-map"
            onClick={() => {
              if (onRequestRideDirectly) {
                onRequestRideDirectly();
              }
            }}
            className="group px-4 sm:px-6 py-3 sm:py-3.5 bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl shadow-2xl border-2 border-slate-950 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-3"
            title="طلب تاكسي فوري وعرض موقعك المباشر لجميع السائقين"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center text-xl shrink-0 shadow-md group-hover:rotate-6 transition-transform">
              🚕
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm font-black flex items-center gap-2 leading-tight">
                <span>اطلب تاكسي الآن بموقعك المباشر</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping inline-block" />
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-900 font-bold mt-0.5 flex items-center gap-1">
                <span>📍 عرض موقعك الحقيقي لـ ({drivers.filter(d => d.isOnline).length}) سيارة تاكسي متصلة</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Bottom Map Legend */}
      <div className="absolute bottom-4 left-3 z-[400] flex flex-wrap items-center gap-1.5">
        <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 text-[11px] font-bold shadow-md flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            موقع الزبون
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="text-xs">🚕</span>
            التاكسي
          </span>
          {dropoffDistrict && (
            <>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="text-xs">🏁</span>
                الوجهة
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
