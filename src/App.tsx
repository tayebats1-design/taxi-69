import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppRole, District, Driver, PricingConfig, RideRequest, DriverEarningRecord } from './types';
import { OFFICIAL_DISTRICTS, CITY_CENTER } from './data/districts';
import { INITIAL_DRIVERS } from './data/mockDrivers';
import { calculateDistanceKm, calculateDirectDistanceMeters, calculateFare } from './utils/distance';
import { sounds } from './utils/audio';
import { 
  broadcastDriverGpsUpdate, 
  subscribeToDriverGpsUpdates, 
  fetchRoadWaypoints, 
  calculateBearing as calcBearingGps,
  ABIODH_ROAD_NODES 
} from './services/realtimeTracking';

import { Header } from './components/Shared/Header';
import { CityMap } from './components/Map/CityMap';
import { CustomerView } from './components/Customer/CustomerView';
import { DriverView } from './components/Driver/DriverView';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminPinGate } from './components/Admin/AdminPinGate';
import { DriverAuthModal } from './components/Driver/DriverAuthModal';
import { NavigationVoiceHUD } from './components/Driver/NavigationVoiceHUD';
import { backgroundTracker } from './utils/backgroundTracker';
import { calculateBearing } from './services/navigationVoice';
import { 
  syncDriverToSupabase, 
  syncRideToSupabase, 
  fetchDriversFromSupabase, 
  getSupabase 
} from './lib/supabase';
import { QuickRequestModal } from './components/Customer/QuickRequestModal';

import { 
  Compass, 
  MapPin, 
  Car, 
  ShieldCheck, 
  Info, 
  PhoneCall, 
  HelpCircle,
  Clock,
  Sparkles,
  Radio,
  LogIn,
  UserPlus,
  CheckCircle2,
  Lock,
  LogOut
} from 'lucide-react';

const DEFAULT_PRICING: PricingConfig = {
  baseFare: 100,       // فتح العداد 100 دج
  perKmRate: 35,      // 35 دج لكل كيلومتر
  minimumFare: 150,   // الحد الأدنى 150 دج
  waitingPerMinute: 10, // 10 دج لكل دقيقة انتظار
  nightSurcharge: 50, // 50 دج إضافية ليلاً
  nightModeEnabled: false,
  familyMultiplier: 1.3,
  comfortMultiplier: 1.25,
  surgeMultiplier: 1.0, // التسعير الديناميكي للذروة
  surgeReason: 'حالة اعتيادية - طلب مستقر',
  platformCommissionRate: 0.15, // عمولة المنصة 15%
};


export default function App() {
  const [currentRole, setCurrentRole] = useState<AppRole>('customer');
  // Navigation tab: 'main' (الصفحة الأولى: الواجهة البسيطة) or 'map' (الصفحة الثانية: الخارطة المباشرة)
  const [activeTab, setActiveTab] = useState<'main' | 'map'>('main');
  
  // State for drivers, districts, pricing, active rides
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('abiodh_taxis_drivers');
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });

  const [districts, setDistricts] = useState<District[]>(() => {
    const saved = localStorage.getItem('abiodh_taxis_districts');
    return saved ? JSON.parse(saved) : OFFICIAL_DISTRICTS;
  });

  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => {
    const saved = localStorage.getItem('abiodh_taxis_pricing');
    return saved ? JSON.parse(saved) : DEFAULT_PRICING;
  });

  // Current authenticated driver for driver view (null if not logged in)
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(() => {
    return localStorage.getItem('saykh_logged_in_driver_id') || null;
  });
  
  // Selected locations for customer
  const [pickupDistrict, setPickupDistrict] = useState<District | null>(null);
  const [dropoffDistrict, setDropoffDistrict] = useState<District | null>(null);

  // Active ride state
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [recentRides, setRecentRides] = useState<RideRequest[]>([]);

  // GPS States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCustomerGpsActive, setIsCustomerGpsActive] = useState(false);
  const [isDriverGpsActive, setIsDriverGpsActive] = useState(false);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(true); // Default true for smooth test demonstration
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Geolocation watch IDs
  const customerWatchRef = useRef<number | null>(null);
  const driverWatchRef = useRef<number | null>(null);
  const lastHardwareGpsTimeRef = useRef<number>(0);

  // Driver Authentication Modal State
  const [isDriverAuthOpen, setIsDriverAuthOpen] = useState(false);
  const [driverAuthMode, setDriverAuthMode] = useState<'login' | 'register'>('register');

  // Quick Ride Request Modal State (مباشر من الشاشة أو الخريطة)
  const [isQuickRequestOpen, setIsQuickRequestOpen] = useState(false);

  // Admin PIN Authentication State (جلسة دخول الإدارة)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Save drivers to localStorage
  useEffect(() => {
    localStorage.setItem('abiodh_taxis_drivers', JSON.stringify(drivers));
  }, [drivers]);

  // Save pricing to localStorage
  useEffect(() => {
    localStorage.setItem('abiodh_taxis_pricing', JSON.stringify(pricingConfig));
  }, [pricingConfig]);

  // Current Active Driver Object (null if not authenticated)
  const loggedInDriver = drivers.find(d => d.id === currentDriverId) || null;
  const currentDriver = loggedInDriver || drivers[0];

  // Helper notification toaster
  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  // Load drivers and subscribe to Supabase Realtime
  useEffect(() => {
    let isMounted = true;
    async function loadSupabaseData() {
      try {
        const remoteDrivers = await fetchDriversFromSupabase();
        if (isMounted && remoteDrivers && remoteDrivers.length > 0) {
          setDrivers(remoteDrivers);
        }
      } catch (err) {
        console.warn('Could not fetch drivers from Supabase:', err);
      }
    }
    loadSupabaseData();

    const sb = getSupabase();
    if (sb) {
      try {
        const driversChannel = sb
          .channel('public:drivers')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'drivers' },
            (payload: any) => {
              if (payload.new && typeof payload.new === 'object') {
                const updatedRow = payload.new;
                setDrivers(prev => {
                  const exists = prev.some(d => d.id === updatedRow.id);
                  if (exists) {
                    return prev.map(d => d.id === updatedRow.id ? {
                      ...d,
                      isOnline: Boolean(updatedRow.is_online),
                      status: updatedRow.status || d.status,
                      currentLocation: {
                        lat: Number(updatedRow.lat),
                        lng: Number(updatedRow.lng),
                      },
                    } : d);
                  }
                  return prev;
                });
              }
            }
          )
          .subscribe();

        const ridesChannel = sb
          .channel('public:rides')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rides' },
            (payload: any) => {
              if (payload.new && typeof payload.new === 'object') {
                const row = payload.new;
                setActiveRide(prev => {
                  if (!prev || prev.id === row.id) {
                    return {
                      id: row.id,
                      customerId: 'cust-supabase',
                      customerName: row.customer_name || 'زبون الأبيض سيدي الشيخ',
                      customerPhone: row.customer_phone || '0661 12 34 56',
                      pickupDistrict: {
                        id: row.pickup_district_id || 'pickup-loc',
                        nameAr: row.pickup_name || 'نقطة الانطلاق',
                        lat: Number(row.pickup_lat),
                        lng: Number(row.pickup_lng),
                        category: 'residential',
                      },
                      dropoffDistrict: {
                        id: row.dropoff_district_id || 'dropoff-loc',
                        nameAr: row.dropoff_name || 'الوجهة',
                        lat: Number(row.dropoff_lat),
                        lng: Number(row.dropoff_lng),
                        category: 'residential',
                      },
                      distanceKm: Number(row.distance_km) || 2.5,
                      estimatedMinutes: Math.max(3, Math.round((Number(row.distance_km) || 2.5) * 3)),
                      estimatedPrice: Number(row.fare) || 200,
                      serviceType: (row.service_type as any) || 'standard',
                      paymentMethod: (row.payment_method as any) || 'cash',
                      status: row.status as any,
                      createdAt: new Date(row.created_at || Date.now()).getTime(),
                      assignedDriverId: row.assigned_driver_id || undefined,
                      progressPercent: row.status === 'driver_arriving' ? 25 : row.status === 'in_progress' ? 60 : 0,
                    };
                  }
                  return prev;
                });
              }
            }
          )
          .subscribe();

        return () => {
          sb.removeChannel(driversChannel);
          sb.removeChannel(ridesChannel);
        };
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }
  }, []);

  const lastDriverPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Background Keep-Alive & GPS Synchronization
  useEffect(() => {
    const unregister = backgroundTracker.registerKeepAliveListener(() => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        // Refresh customer location if active
        if (isCustomerGpsActive) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              setUserCoords({ lat: latitude, lng: longitude, accuracy });
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
          );
        }
        // Refresh driver location if active
        if (isDriverGpsActive && currentDriver) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setDrivers(prev => prev.map(d => d.id === currentDriver.id ? {
                ...d,
                currentLocation: { ...d.currentLocation, lat: latitude, lng: longitude }
              } : d));
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
          );
        }
      }
    });

    return () => {
      unregister();
    };
  }, [isCustomerGpsActive, isDriverGpsActive, currentDriver]);

  // Screen Wake Lock when Driver is on active trip
  useEffect(() => {
    if (
      currentRole === 'driver' && 
      activeRide && 
      activeRide.assignedDriverId === currentDriver.id && 
      (activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arriving' || activeRide.status === 'in_progress')
    ) {
      backgroundTracker.enableWakeLock();
    } else if (!activeRide) {
      backgroundTracker.disableWakeLock();
    }
  }, [currentRole, activeRide, currentDriver.id]);

  // 1. CUSTOMER REAL-TIME GPS TRACKING (ROBUST & RESILIENT)
  const toggleCustomerGps = useCallback(() => {
    if (isCustomerGpsActive) {
      if (customerWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(customerWatchRef.current);
        customerWatchRef.current = null;
      }
      setIsCustomerGpsActive(false);
      showToast('تم إيقاف تتبع GPS للزبون');
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      showToast('جاري تشغيل نظام تحديد المواقع GPS للزبون 🛰️...');

      const applyPosition = (latitude: number, longitude: number, accuracy?: number) => {
        setIsLocating(false);
        setIsCustomerGpsActive(true);
        setUserCoords({ lat: latitude, lng: longitude, accuracy });

        // Snap or find closest district
        let closest = districts[0];
        let minDistance = 999999;
        districts.forEach(d => {
          const dist = calculateDistanceKm(latitude, longitude, d.lat, d.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = d;
          }
        });

        const liveGpsDistrict: District = {
          id: `gps-customer-${Date.now()}`,
          nameAr: `موقعي المباشر GPS (${closest.nameAr})`,
          nameFr: 'Position GPS Live',
          lat: latitude,
          lng: longitude,
          category: 'residential',
        };

        setPickupDistrict(liveGpsDistrict);
      };

      // 1. Immediate query for snappy response
      navigator.geolocation.getCurrentPosition(
        (pos) => applyPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => {
          console.warn('Initial fast GPS fetch note:', err.message);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );

      // 2. Continuous watch with error resilience
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          applyPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        },
        (error) => {
          setIsLocating(false);
          if (error.code === error.PERMISSION_DENIED) {
            setIsCustomerGpsActive(false);
            showToast('تم رفض إذن تحديد الموقع، يرجى تفعيل الـ GPS من إعدادات المتصفح 🔒');
            const defaultCenter = districts.find(d => d.id === 'hay-chaab') || districts[0];
            setUserCoords({ lat: defaultCenter.lat, lng: defaultCenter.lng, accuracy: 25 });
            setPickupDistrict(defaultCenter);
          } else {
            // Signal fluctuation: retry via cell/wifi network without killing tracking
            console.warn('GPS signal fluctuation, retrying network geolocation:', error.message);
            navigator.geolocation.getCurrentPosition(
              (fallbackPos) => {
                applyPosition(fallbackPos.coords.latitude, fallbackPos.coords.longitude, fallbackPos.coords.accuracy);
              },
              () => {},
              { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
            );
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
      );

      customerWatchRef.current = watchId;
    } else {
      showToast('المتصفح لا يدعم تحديد الموقع الجغرافي GPS');
    }
  }, [isCustomerGpsActive, districts]);

  // Auto-activate customer GPS tracking immediately on application startup
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      toggleCustomerGps();
    }
  }, []); // Run once on startup

  // 2. DRIVER REAL-TIME GPS TRACKING (WITH BEARING, SPEED & BACKGROUND RESILIENCE)
  const toggleDriverGps = useCallback(() => {
    if (isDriverGpsActive) {
      if (driverWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(driverWatchRef.current);
        driverWatchRef.current = null;
      }
      setIsDriverGpsActive(false);
      showToast('تم إيقاف بث GPS للسائق');
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      showToast('تم تفعيل بث GPS الحقيقي ونظام الملاحة والتوجيه للتاكسي 🛰️');

      const handleGpsUpdate = (lat: number, lng: number, rawHeading: number | null, rawSpeed: number | null) => {
        setIsDriverGpsActive(true);

        const now = Date.now();
        let heading = rawHeading;
        let speed = rawSpeed ? Math.round(rawSpeed * 3.6) : 0;

        // Calculate heading and speed dynamically if hardware compass unavailable
        if (lastDriverPositionRef.current) {
          const prev = lastDriverPositionRef.current;
          const distMeters = Math.hypot(lat - prev.lat, lng - prev.lng) * 111000;
          if (distMeters > 3) {
            heading = calculateBearing(prev.lat, prev.lng, lat, lng);
            const timeDeltaSec = (now - prev.time) / 1000;
            if (timeDeltaSec > 0) {
              speed = Math.min(120, Math.round((distMeters / timeDeltaSec) * 3.6));
            }
          }
        }
        lastDriverPositionRef.current = { lat, lng, time: now };

        setDrivers(prev => prev.map(d => d.id === currentDriver.id ? {
          ...d,
          currentLocation: {
            ...d.currentLocation,
            lat,
            lng,
            heading: heading || (d.currentLocation as any).heading || 0,
            speed: speed,
          },
        } : d));

        setActiveRide(prev => {
          if (!prev || prev.assignedDriverId !== currentDriver.id) return prev;

          // Check if driver reached pickup location via GPS (within 50 meters)
          if (
            prev.status === 'driver_arriving' || 
            prev.status === 'driver_assigned'
          ) {
            const dist = Math.hypot(lat - prev.pickupDistrict.lat, lng - prev.pickupDistrict.lng) * 111000;
            if (dist <= 50) {
              sounds.playArrivalChime();
              showToast('وصلت لتوك إلى موقع الزبون بالأبيض سيدي الشيخ! 🟢');
              return {
                ...prev,
                driverLocation: { lat, lng },
                status: 'driver_arrived',
                progressPercent: 100,
              };
            }
          }

          return {
            ...prev,
            driverLocation: { lat, lng },
          };
        });

        lastHardwareGpsTimeRef.current = now;

        // Broadcast GPS stream to all tabs, windows, customer devices & Supabase
        broadcastDriverGpsUpdate({
          driverId: currentDriver.id,
          lat,
          lng,
          heading: heading || (currentDriver.currentLocation as any).heading || 0,
          speed: speed,
          status: currentDriver.status,
          isGpsReal: true,
          activeRideId: activeRide?.id,
          timestamp: now,
        });

        // Sync position to Supabase
        syncDriverToSupabase({
          ...currentDriver,
          currentLocation: { 
            lat, 
            lng, 
            heading: heading || 0, 
            speed: speed 
          },
        });
      };

      // Immediate location query first
      navigator.geolocation.getCurrentPosition(
        (pos) => handleGpsUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.heading, pos.coords.speed),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );

      // Continuous GPS tracking
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleGpsUpdate(
            position.coords.latitude, 
            position.coords.longitude, 
            position.coords.heading, 
            position.coords.speed
          );
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setIsDriverGpsActive(false);
            showToast('تعذر الوصول إلى نظام الـ GPS للسائق، يرجى السماح بصلاحية الموقع');
          } else {
            console.warn('Driver GPS watch glitch, keeping watch active:', error.message);
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );

      driverWatchRef.current = watchId;
    } else {
      showToast('المتصفح لا يدعم خدمة الـ GPS');
    }
  }, [isDriverGpsActive, currentDriver]);

  // Direct Driver Location Update (via map dragging or landmark setting)
  const handleUpdateDriverLocation = useCallback((driverId: string, lat: number, lng: number) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? {
      ...d,
      currentLocation: {
        ...d.currentLocation,
        lat,
        lng,
      },
    } : d));

    setActiveRide(prev => {
      if (!prev || prev.assignedDriverId !== driverId) return prev;
      return {
        ...prev,
        driverLocation: { lat, lng },
      };
    });

    const targetDriver = drivers.find(d => d.id === driverId);
    if (targetDriver) {
      syncDriverToSupabase({
        ...targetDriver,
        currentLocation: { lat, lng },
      });
      broadcastDriverGpsUpdate({
        driverId,
        lat,
        lng,
        heading: (targetDriver.currentLocation as any).heading || 0,
        speed: 0,
        status: targetDriver.status,
        isGpsReal: false,
        activeRideId: activeRide?.id,
        timestamp: Date.now(),
      });
    }
    showToast('تم تحديث موقع سيارة التاكسي على الخريطة 🚕');
  }, [drivers, activeRide?.id]);

  // Real-time GPS cross-tab & cross-device listener
  useEffect(() => {
    const unsubscribe = subscribeToDriverGpsUpdates((payload) => {
      // If the current tab has active hardware GPS transmitting for this same driver, ignore incoming echo
      if (isDriverGpsActive && currentDriver && payload.driverId === currentDriver.id) {
        return;
      }

      setDrivers(prev => prev.map(d => d.id === payload.driverId ? {
        ...d,
        currentLocation: {
          ...d.currentLocation,
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading,
          speed: payload.speed,
        }
      } : d));

      setActiveRide(prev => {
        if (!prev || prev.assignedDriverId !== payload.driverId) return prev;
        return {
          ...prev,
          driverLocation: { lat: payload.lat, lng: payload.lng },
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isDriverGpsActive, currentDriver?.id]);

  // 4. AUTONOMOUS STREET NAVIGATION & REAL GPS ROAD MOVEMENT LOOP
  useEffect(() => {
    if (!activeRide || !['driver_arriving', 'in_progress'].includes(activeRide.status)) {
      return;
    }

    const assignedDriver = drivers.find(d => d.id === activeRide.assignedDriverId);
    if (!assignedDriver) return;

    let isCancelled = false;
    let timerId: any = null;

    const startLat = activeRide.driverLocation?.lat ?? assignedDriver.currentLocation.lat;
    const startLng = activeRide.driverLocation?.lng ?? assignedDriver.currentLocation.lng;
    const targetLat = activeRide.status === 'driver_arriving' 
      ? activeRide.pickupDistrict.lat 
      : activeRide.dropoffDistrict.lat;
    const targetLng = activeRide.status === 'driver_arriving' 
      ? activeRide.pickupDistrict.lng 
      : activeRide.dropoffDistrict.lng;

    fetchRoadWaypoints(startLat, startLng, targetLat, targetLng).then(route => {
      if (isCancelled) return;
      const points = route.points;
      if (!points || points.length < 2) return;

      let currentIndex = 0;
      let minD = 999999;
      points.forEach((pt, idx) => {
        const d = calculateDirectDistanceMeters(startLat, startLng, pt[0], pt[1]);
        if (d < minD) {
          minD = d;
          currentIndex = idx;
        }
      });

      const intervalMs = 700; // Smooth 700ms tick for authentic road driving

      timerId = setInterval(() => {
        // If driver device has fresh hardware GPS (within last 3.5s), hardware GPS drives the car!
        if (Date.now() - lastHardwareGpsTimeRef.current < 3500) {
          return;
        }

        if (currentIndex < points.length - 1) {
          currentIndex++;
          const currentPt = points[currentIndex];
          const prevPt = points[Math.max(0, currentIndex - 1)];

          const heading = calcBearingGps(prevPt[0], prevPt[1], currentPt[0], currentPt[1]);
          // Realistic city driving speed between 30 and 42 km/h
          const speed = Math.round(34 + Math.sin(currentIndex * 0.4) * 6);
          const distToTarget = calculateDirectDistanceMeters(currentPt[0], currentPt[1], targetLat, targetLng);
          const progressPercent = Math.min(95, Math.round((currentIndex / points.length) * 100));

          // 1. Update activeRide location & progress
          setActiveRide(prev => {
            if (!prev || prev.id !== activeRide.id) return prev;
            return {
              ...prev,
              driverLocation: { lat: currentPt[0], lng: currentPt[1] },
              progressPercent,
            };
          });

          // 2. Update driver's position in drivers state
          setDrivers(prev => prev.map(d => d.id === assignedDriver.id ? {
            ...d,
            currentLocation: {
              ...d.currentLocation,
              lat: currentPt[0],
              lng: currentPt[1],
              heading,
              speed,
            }
          } : d));

          // 3. Broadcast to all tabs, windows, customer devices & Supabase
          broadcastDriverGpsUpdate({
            driverId: assignedDriver.id,
            lat: currentPt[0],
            lng: currentPt[1],
            heading,
            speed,
            status: 'busy',
            isGpsReal: true,
            activeRideId: activeRide.id,
            timestamp: Date.now(),
          });

          // 4. Proximity & Arrival Check
          if (distToTarget <= 35 || currentIndex >= points.length - 1) {
            clearInterval(timerId);
            if (activeRide.status === 'driver_arriving') {
              sounds.playArrivalChime();
              sounds.speakDriverArrivedAlert(activeRide.id, false);
              setActiveRide(prev => prev ? {
                ...prev,
                driverLocation: { lat: targetLat, lng: targetLng },
                status: 'driver_arrived',
                progressPercent: 100,
              } : null);
              setDrivers(prev => prev.map(d => d.id === assignedDriver.id ? {
                ...d,
                currentLocation: {
                  ...d.currentLocation,
                  lat: targetLat,
                  lng: targetLng,
                  speed: 0,
                }
              } : d));
              showToast('وصل التاكسي لتوّه إلى موقع الزبون بالأبيض سيدي الشيخ! 🟢');
            }
          }
        }
      }, intervalMs);
    });

    return () => {
      isCancelled = true;
      if (timerId) clearInterval(timerId);
    };
  }, [activeRide?.id, activeRide?.status, activeRide?.assignedDriverId]);

  // Cleanup geolocation watches
  useEffect(() => {
    return () => {
      if (customerWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(customerWatchRef.current);
      }
      if (driverWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(driverWatchRef.current);
      }
    };
  }, []);

  // Quick Locate User
  const handleLocateUser = () => {
    toggleCustomerGps();
  };

  // 3. BROADCAST TAXI REQUEST (طلبات الزبون تبقى معلقة حتى يوافق عليها أحد السائقين)
  const handleRequestRide = useCallback((rideData: Omit<RideRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRide: RideRequest = {
      ...rideData,
      id: `ride-${Date.now()}`,
      createdAt: Date.now(),
      status: 'searching',
      progressPercent: 0,
    };

    setActiveRide(newRide);
    syncRideToSupabase(newRide);
    sounds.playRadarPing();
    showToast('تم إرسال طلبك! الطلب معلق الآن بانتظار موافقة أحد سائقي تاكسي الأبيض سيدي الشيخ ⏳');
  }, []);

  // Real-time Voice Alert for Driver upon incoming ride request
  useEffect(() => {
    if (
      currentRole === 'driver' &&
      loggedInDriver &&
      loggedInDriver.isOnline &&
      activeRide &&
      (activeRide.status === 'searching' || (activeRide.status as string) === 'pending')
    ) {
      sounds.speakRideRequestAlert(
        activeRide.id,
        activeRide.pickupDistrict.nameAr,
        activeRide.dropoffDistrict.nameAr
      );
    }
  }, [
    currentRole,
    loggedInDriver?.id,
    loggedInDriver?.isOnline,
    activeRide?.id,
    activeRide?.status,
    activeRide?.pickupDistrict.nameAr,
    activeRide?.dropoffDistrict.nameAr,
  ]);

  // Real-time Voice Alert for Customer upon driver accepting ride
  useEffect(() => {
    if (
      currentRole === 'customer' &&
      activeRide &&
      (activeRide.status === 'driver_arriving' || activeRide.status === 'driver_assigned') &&
      activeRide.assignedDriverId
    ) {
      const assigned = drivers.find(d => d.id === activeRide.assignedDriverId);
      if (assigned) {
        sounds.speakRideAcceptedCustomerAlert(
          activeRide.id,
          assigned.name,
          assigned.carModel,
          assigned.carColor
        );
      }
    }
  }, [
    currentRole,
    activeRide?.id,
    activeRide?.status,
    activeRide?.assignedDriverId,
    drivers,
  ]);

  // Real-time Voice Alerts for Customer on status changes (Arrival, Start, Completion)
  useEffect(() => {
    if (currentRole === 'customer' && activeRide) {
      if (activeRide.status === 'driver_arrived') {
        sounds.speakDriverArrivedAlert(activeRide.id, false);
      } else if (activeRide.status === 'in_progress') {
        sounds.speakTripStartedAlert(activeRide.id, false);
      } else if (activeRide.status === 'completed') {
        sounds.speakRideCompletedAlert(activeRide.id, activeRide.estimatedPrice, false);
      }
    }
  }, [currentRole, activeRide?.id, activeRide?.status, activeRide?.estimatedPrice]);

  // Real-time Proximity Alert when driver approaches customer pickup (within 400m)
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'driver_arriving') return;
    const driver = drivers.find(d => d.id === activeRide.assignedDriverId);
    const dLoc = activeRide.driverLocation || driver?.currentLocation;
    if (!dLoc) return;

    const distMeters = Math.hypot(
      dLoc.lat - activeRide.pickupDistrict.lat,
      dLoc.lng - activeRide.pickupDistrict.lng
    ) * 111000;

    if (distMeters <= 400 && distMeters > 40) {
      if (currentRole === 'driver') {
        sounds.speakDriverProximityAlert(activeRide.id);
      } else if (currentRole === 'customer') {
        sounds.speakCustomerProximityAlert(activeRide.id);
      }
    }
  }, [
    currentRole,
    activeRide?.id,
    activeRide?.status,
    activeRide?.driverLocation,
    activeRide?.assignedDriverId,
    activeRide?.pickupDistrict.lat,
    activeRide?.pickupDistrict.lng,
    drivers,
  ]);

  // 4. CANCEL RIDE
  const handleCancelRide = () => {
    if (activeRide?.assignedDriverId) {
      setDrivers(prev => prev.map(d => d.id === activeRide.assignedDriverId ? { ...d, status: 'available' } : d));
    }
    sounds.speakRideCancelledAlert();
    setActiveRide(null);
    showToast('تم إلغاء طلب التاكسي');
  };

  // 6. RATE & FINISH RIDE
  const handleRateRide = (rating: number, review: string) => {
    if (activeRide) {
      const finishedRide = { ...activeRide, rating, review };
      setRecentRides(prev => [finishedRide, ...prev]);

      if (activeRide.assignedDriverId) {
        setDrivers(prev => prev.map(d => d.id === activeRide.assignedDriverId ? {
          ...d,
          status: 'available',
          totalTrips: d.totalTrips + 1,
        } : d));
      }
    }

    setActiveRide(null);
    setPickupDistrict(null);
    setDropoffDistrict(null);
    showToast('شكراً لك على التقييم، نتمنى لك يوماً مباركاً!');
  };

  // Map Click Setter
  const handleMapClickLocation = (coords: { lat: number; lng: number; name: string }, type: 'pickup' | 'dropoff') => {
    const customDist: District = {
      id: `map-${Date.now()}`,
      nameAr: coords.name,
      nameFr: 'Position sur la carte',
      lat: coords.lat,
      lng: coords.lng,
      category: 'residential',
    };
    if (type === 'pickup') {
      setPickupDistrict(customDist);
      showToast('🟢 تم تعيين نقطة موقع الزبون من الخريطة');
    } else {
      setDropoffDistrict(customDist);
      showToast('🔴 تم تعيين الوجهة من الخريطة');
    }
  };

  // Driver Actions
  const handleToggleOnline = (isOnline: boolean) => {
    setDrivers(prev => prev.map(d => d.id === currentDriver.id ? {
      ...d,
      isOnline,
      status: isOnline ? 'available' : 'offline'
    } : d));
    const target = drivers.find(d => d.id === currentDriver.id);
    if (target) {
      syncDriverToSupabase({ ...target, isOnline, status: isOnline ? 'available' : 'offline' });
    }
    showToast(isOnline ? 'أنت الآن متصل ومتاح لاستقبال الطلبات' : 'أنت الآن غير متصل');
  };

  const handleAcceptRide = (rideId: string) => {
    if (!loggedInDriver) {
      showToast('يرجى تسجيل الدخول بحساب السائق الخاص بك أولاً لقبول الرحلات');
      return;
    }
    if (activeRide && activeRide.id === rideId) {
      const updated: RideRequest = {
        ...activeRide,
        assignedDriverId: loggedInDriver.id,
        status: 'driver_arriving',
        progressPercent: 10,
      };
      setActiveRide(updated);
      syncRideToSupabase(updated);
    }
    setDrivers(prev => prev.map(d => d.id === loggedInDriver.id ? { ...d, status: 'busy' } : d));
    sounds.playArrivalChime();
    showToast(`قبلت الرحلة بنجاح! موقع الزبون (${activeRide?.pickupDistrict.nameAr || ''}) وسيارتك يظهران لبعضكما الآن على الخريطة`);
  };

  const handleDeclineRide = useCallback((rideId: string) => {
    showToast('تم تجاهل الطلب من قبلك، ويبقى الطلب معلقاً ومتاحاً لبقية السائقين المتصلين');
  }, []);

  const handleDriverArrived = () => {
    setActiveRide(prev => prev ? { ...prev, status: 'driver_arrived', progressPercent: 100 } : null);
    sounds.speakDriverArrivedAlert(activeRide?.id, true);
    showToast('تم إشعار الزبون بأنك وصلت لموقعه 📍');
  };

  const handleStartTrip = () => {
    setActiveRide(prev => prev ? { ...prev, status: 'in_progress', progressPercent: 10 } : null);
    sounds.speakTripStartedAlert(activeRide?.id, true);
    showToast('بدأت الرحلة نحو الوجهة 🚀');
  };

  const handleCompleteTrip = () => {
    if (!activeRide) return;
    const fare = activeRide.estimatedPrice || 250;
    const commRate = pricingConfig.platformCommissionRate || 0.15;
    const commDeducted = Math.round(fare * commRate);
    const netEarnings = fare - commDeducted;

    // Record in driver's wallet history with automatic platform fee deduction
    const targetDriverId = activeRide.assignedDriverId || currentDriver.id;
    const newRecord: DriverEarningRecord = {
      id: `earn-${Date.now()}`,
      rideId: activeRide.id,
      timestamp: Date.now(),
      pickupName: activeRide.pickupDistrict.nameAr,
      dropoffName: activeRide.dropoffDistrict.nameAr,
      grossFare: fare,
      platformCommissionPercent: Math.round(commRate * 100),
      platformCommissionDeducted: commDeducted,
      netDriverEarnings: netEarnings,
      distanceKm: activeRide.distanceKm,
      paymentMethod: activeRide.paymentMethod,
    };

    setDrivers(prev => prev.map(d => {
      if (d.id === targetDriverId) {
        const currentWallet = d.wallet || {
          balance: 14250,
          todayEarnings: 2450,
          weekEarnings: 16800,
          commissionRate: commRate,
          totalPlatformFeePaid: 2520,
          history: [],
        };
        const existingHistory = currentWallet.history || [];
        return {
          ...d,
          totalTrips: d.totalTrips + 1,
          status: 'available',
          wallet: {
            ...currentWallet,
            balance: currentWallet.balance + netEarnings,
            todayEarnings: currentWallet.todayEarnings + netEarnings,
            weekEarnings: currentWallet.weekEarnings + netEarnings,
            totalPlatformFeePaid: (currentWallet.totalPlatformFeePaid || 0) + commDeducted,
            history: [newRecord, ...existingHistory],
          }
        };
      }
      return d;
    }));

    setActiveRide(prev => prev ? { ...prev, status: 'completed', progressPercent: 100 } : null);
    sounds.speakRideCompletedAlert(activeRide.id, fare, true);
    showToast(`تم إكمال الرحلة بنجاح! الأجرة: ${fare} دج (صافي ربح السائق بعد اقتطاع عمولة المنصة ${Math.round(commRate * 100)}%: ${netEarnings} دج) 💰`);
  };

  // Toggle Driver Phone Visibility to Customer (إظهار أو إخفاء رقم هاتف السائق للزبون)
  const handleToggleDriverPhoneVisibility = (driverId: string) => {
    const target = drivers.find(d => d.id === driverId);
    const nextVal = target ? !(target.showPhoneToCustomer !== false) : true;
    const updated = drivers.map(d => (d.id === driverId ? { ...d, showPhoneToCustomer: nextVal } : d));

    setDrivers(updated);
    localStorage.setItem('abiodh_taxis_drivers', JSON.stringify(updated));

    const updatedDriver = updated.find(d => d.id === driverId);
    if (updatedDriver) {
      syncDriverToSupabase(updatedDriver);
    }
    showToast(
      nextVal
        ? 'تم إظهار رقم هاتفك للزبائن للاتصال المباشر 📞'
        : 'تم إخفاء رقم هاتفك عن الزبائن (محمي ومتاح للإدارة فقط) 🔒'
    );
  };

  // Admin Actions (حذف السائق، تعديل الحالة، وإضافة سائق أو حي)
  const handleDeleteDriver = (driverId: string) => {
    const driverToDelete = drivers.find(d => d.id === driverId);
    setDrivers(prev => prev.filter(d => d.id !== driverId));
    
    // إذا كان السائق المحذوف هو المسجل حالياً في المتصفح يتم تسجيل خروجه فوراً
    if (currentDriverId === driverId) {
      setCurrentDriverId(null);
      localStorage.removeItem('saykh_logged_in_driver_id');
      if (currentRole === 'driver') {
        setCurrentRole('customer');
      }
      showToast(`⚠️ تم حذف حساب السائق (${driverToDelete?.name || ''}) نهائياً من قبل الإدارة وتم تسجيل الخروج`);
    } else {
      showToast(`تم حذف السائق (${driverToDelete?.name || ''}) نهائياً من المنظومة 🗑️`);
    }

    // إذا كان السائق المحذوف مرتبطاً بطلب زبون نشط يعود الطلب معلقاً ليتسنى لسائق آخر قبوله
    setActiveRide(prev => {
      if (prev && prev.assignedDriverId === driverId && prev.status !== 'completed') {
        return {
          ...prev,
          assignedDriverId: undefined,
          status: 'searching',
          progressPercent: 0,
        };
      }
      return prev;
    });
  };

  const handleToggleDriverStatus = (driverId: string) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, isOnline: !d.isOnline } : d));
    showToast('تم تحديث حالة السائق');
  };

  const handleAddDriver = (newDriverData: Omit<Driver, 'id' | 'rating' | 'totalTrips'>) => {
    const fullDriver: Driver = {
      ...newDriverData,
      id: `drv-${Date.now()}`,
      rating: 5.0,
      totalTrips: 0,
      approvalStatus: 'approved',
    };
    setDrivers(prev => [fullDriver, ...prev]);
    showToast('تمت إضافة السائق الجديد بنجاح');
  };

  const handleAddDistrict = (newDistData: Omit<District, 'id'>) => {
    const fullDist: District = {
      ...newDistData,
      id: `dist-${Date.now()}`,
    };
    setDistricts(prev => [...prev, fullDist]);
    showToast('تمت إضافة المنطقة الجديدة إلى الخريطة');
  };

  // Driver Authentication Handlers (كل سائق يدخل بحسابه فقط ويتحكم في حسابه)
  const handleOpenDriverAuth = (mode: 'login' | 'register') => {
    setDriverAuthMode(mode);
    setIsDriverAuthOpen(true);
  };

  const handleLoginDriverSuccess = (driver: Driver) => {
    setCurrentDriverId(driver.id);
    localStorage.setItem('saykh_logged_in_driver_id', driver.id);
    setCurrentRole('driver');
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, isOnline: true, status: 'available' } : d));
    sounds.playArrivalChime();
    showToast(`مرحباً بك يا ${driver.name}! تم تسجيل الدخول إلى حسابك بنجاح.`);
  };

  const handleRegisterDriverSuccess = (newDriver: Driver) => {
    setDrivers(prev => [newDriver, ...prev]);
    setCurrentDriverId(newDriver.id);
    localStorage.setItem('saykh_logged_in_driver_id', newDriver.id);
    setCurrentRole('driver');
    sounds.playSuccessSound();
    syncDriverToSupabase(newDriver);
    showToast(`تم تسجيل حسابك بنجاح! سيارتك (${newDriver.carModel}) جاهزة لاستقبال الطلبات.`);
  };

  const handleLogoutDriver = () => {
    if (currentDriverId) {
      setDrivers(prev => prev.map(d => d.id === currentDriverId ? { ...d, isOnline: false } : d));
    }
    setCurrentDriverId(null);
    localStorage.removeItem('saykh_logged_in_driver_id');
    setCurrentRole('customer');
    showToast('تم تسجيل الخروج من حساب السائق بنجاح 🚪');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Header with City Identity & Role Switcher */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeDriversCount={drivers.filter(d => d.isOnline).length}
        onOpenDriverAuth={handleOpenDriverAuth}
        activeDriverName={loggedInDriver?.name}
        isDriverLoggedIn={!!loggedInDriver}
        onDriverLogout={handleLogoutDriver}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingRidesCount={activeRide && (activeRide.status === 'searching' || (activeRide.status as string) === 'pending') ? 1 : 0}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Dynamic Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* PAGE 1: SIMPLE INTERFACE (الواجهة البسيطة: طلب التاكسي، رؤية السائقين والزبائن) */}
      {activeTab === 'main' && (
        <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
          {/* Active Role Card View */}
          {currentRole === 'customer' && (
            <CustomerView
              drivers={drivers}
              pricingConfig={pricingConfig}
              activeRide={activeRide}
              pickupDistrict={pickupDistrict}
              dropoffDistrict={dropoffDistrict}
              onSelectPickup={setPickupDistrict}
              onSelectDropoff={setDropoffDistrict}
              onRequestRide={handleRequestRide}
              onCancelRide={handleCancelRide}
              onRateRide={handleRateRide}
              onLocateUser={handleLocateUser}
              isLocating={isLocating}
              isCustomerGpsActive={isCustomerGpsActive}
              recentRides={recentRides}
              onCustomerBoarded={handleStartTrip}
              onCustomerAlighted={handleCompleteTrip}
            />
          )}

          {/* Driver Role: Gate if not logged in (كل سائق يتحكم في حسابه فقط ولا يمكنه الدخول إلا بعد التسجيل) */}
          {currentRole === 'driver' && !loggedInDriver && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-2 border-amber-400 text-center space-y-5 font-['Cairo',sans-serif]">
              <div className="w-16 h-16 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-md">
                🔒
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  بوابة سائقي تاكسي الأبيض سيدي الشيخ
                </h3>
                <p className="text-sm font-bold text-slate-600 max-w-md mx-auto">
                  كل سائق يتحكم في حسابه الخاص فقط. لا يمكنك الدخول إلى لوحة القيادة واستقبال طلبات الزبائن إلا بعد تسجيل الدخول بحسابك المسجل.
                </p>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 space-y-2 text-right">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>حسابات السائقين مستقلة ومحمية: كل سائق يرى رصيده، وثائقه، وطلباته فقط.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>طلبات الزبون تبقى معلقة حتى يوافق عليها أحد السائقين المتصلين في المدينة.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="btn-driver-login-gate"
                  onClick={() => handleOpenDriverAuth('login')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-400 rounded-2xl text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول إلى حسابي 🔑</span>
                </button>

                <button
                  id="btn-driver-register-gate"
                  onClick={() => handleOpenDriverAuth('register')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>تسجيل حساب سائق جديد ➕</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>سيارات الأجرة المسجلة حالياً: {drivers.length}</span>
                <button
                  onClick={() => setCurrentRole('customer')}
                  className="text-emerald-700 hover:underline cursor-pointer"
                >
                  العودة لواجهة الزبائن ↩️
                </button>
              </div>
            </div>
          )}

          {/* Driver Role: Authenticated Private Portal */}
          {currentRole === 'driver' && loggedInDriver && (
            <DriverView
              currentDriver={loggedInDriver}
              activeRide={activeRide}
              onToggleOnline={handleToggleOnline}
              onAcceptRide={handleAcceptRide}
              onDeclineRide={handleDeclineRide}
              onDriverArrived={handleDriverArrived}
              onStartTrip={handleStartTrip}
              onCompleteTrip={handleCompleteTrip}
              pricingConfig={pricingConfig}
              onOpenAuthModal={handleOpenDriverAuth}
              onLogout={handleLogoutDriver}
              onViewOnMap={() => setActiveTab('map')}
              isDriverGpsActive={isDriverGpsActive}
              onToggleDriverGps={toggleDriverGps}
              isSimulatingDrive={isSimulatingDrive}
              onToggleSimulateDrive={() => {
                setIsSimulatingDrive(prev => !prev);
                showToast(!isSimulatingDrive ? 'تم تفعيل محاكاة حركة التاكسي 🚗💨' : 'تم إيقاف محاكاة حركة التاكسي');
              }}
              onUpdateDriverDocuments={(driverId, docs) => {
                setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, documents: docs } : d));
              }}
              onTogglePhoneVisibility={() => handleToggleDriverPhoneVisibility(loggedInDriver.id)}
            />
          )}

          {currentRole === 'admin' && (
            !isAdminAuthenticated ? (
              <AdminPinGate
                onSuccess={() => {
                  setIsAdminAuthenticated(true);
                  showToast('تم التحقق من الرقم السري ودخول لوحة الإدارة المركزية 🛡️');
                }}
                onCancel={() => {
                  setCurrentRole('customer');
                }}
              />
            ) : (
              <AdminDashboard
                pricingConfig={pricingConfig}
                onUpdatePricing={setPricingConfig}
                drivers={drivers}
                onUpdateDriverStatus={(driverId, status) => {
                  setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, approvalStatus: status } : d));
                  showToast(`تم تحديث حالة السائق إلى: ${status === 'approved' ? 'معتمد' : 'مرفوض'}`);
                }}
                onAddDriver={handleAddDriver}
                onDeleteDriver={handleDeleteDriver}
                districts={districts}
                onAddDistrict={handleAddDistrict}
                onUpdateDistrict={(updatedDistrict) => {
                  setDistricts(prev => prev.map(d => d.id === updatedDistrict.id ? updatedDistrict : d));
                  showToast(`تم تحديث بيانات حي "${updatedDistrict.nameAr}" بنجاح ✏️`);
                }}
                onDeleteDistrict={(districtId) => {
                  setDistricts(prev => prev.filter(d => d.id !== districtId));
                  showToast('تم حذف المنطقة من المنظومة 🗑️');
                }}
                activeRide={activeRide}
                recentRides={recentRides}
                onViewOnMap={() => setActiveTab('map')}
                onLockAdmin={() => {
                  setIsAdminAuthenticated(false);
                  showToast('تم قفل لوحة الإدارة وتأمينها 🔒');
                }}
              />
            )
          )}

        </main>
      )}

      {/* PAGE 2: INTERACTIVE CITY MAP (الصفحة الثانية: الخارطة المباشرة والتتبع) */}
      {activeTab === 'map' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col gap-3 animate-in fade-in duration-200">
          {/* Top Bar for Map Page */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-main-tab"
                onClick={() => setActiveTab('main')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>📱</span>
                <span>العودة للواجهة الرئيسية (الصفحة 1)</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="text-xs">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span>خارطة الأبيض سيدي الشيخ المباشرة</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {currentRole === 'driver'
                    ? 'يستطيع كل السائقين رؤية موقع الزبون (🟢) فور إرسال الطلب، والزبون يرى موقع سيارتك (🚕)'
                    : 'يستطيع الزبون رؤية جميع سيارات الأجرة المتصلة (🚕) ومتابعة خط السير مباشرة'}
                </div>
              </div>
            </div>

            {/* Active ride indicator pill */}
            {activeRide && (
              <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                <span className="animate-pulse">📍</span>
                <span className="font-black text-amber-900">
                  {activeRide.status === 'searching' ? 'طلب زبون بانتظار السائق' : 'رحلة نشطة'}
                </span>
                <span className="text-slate-600 font-bold">
                  ({activeRide.pickupDistrict.nameAr} ⬅ {activeRide.dropoffDistrict.nameAr})
                </span>
              </div>
            )}
          </div>

          {/* Full Screen / Responsive Map Container */}
          <div className="flex-1 min-h-[580px] md:min-h-[660px] rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl relative">
            {/* Live Turn-by-Turn Voice Navigation HUD Overlay for Driver */}
            {currentRole === 'driver' && activeRide && activeRide.assignedDriverId === currentDriver.id && (
              <div className="absolute top-3 right-3 left-3 z-30 max-w-xl mx-auto pointer-events-auto">
                <NavigationVoiceHUD
                  activeRide={activeRide}
                  currentDriver={currentDriver}
                  onDriverArrived={() => {
                    handleDriverArrived();
                    showToast('تم إشعار الزبون صوتياً بوصولك إلى موقعه 📍');
                  }}
                  onStartTrip={() => {
                    handleStartTrip();
                    showToast('بدأت الرحلة نحو الوجهة، الملاحة الصوتية نشطة 🚀');
                  }}
                  onCompleteTrip={() => {
                    handleCompleteTrip();
                    showToast('تم إتمام الرحلة بنجاح واستلام المبلغ ✅');
                  }}
                />
              </div>
            )}

            <CityMap
              drivers={drivers}
              selectedDriverId={activeRide?.assignedDriverId}
              activeRide={activeRide}
              pickupDistrict={activeRide ? activeRide.pickupDistrict : pickupDistrict}
              dropoffDistrict={activeRide ? activeRide.dropoffDistrict : dropoffDistrict}
              onSelectDistrict={(dist, type) => {
                if (type === 'pickup') {
                  setPickupDistrict(dist);
                  showToast(`تم تحديد نقطة الانطلاق: ${dist.nameAr}`);
                } else {
                  setDropoffDistrict(dist);
                  showToast(`تم تحديد الوجهة: ${dist.nameAr}`);
                }
              }}
              userCoords={userCoords}
              currentRole={currentRole}
              currentDriver={currentDriver}
              onMapClickLocation={handleMapClickLocation}
              isCustomerGpsActive={isCustomerGpsActive}
              isDriverGpsActive={isDriverGpsActive}
              onToggleCustomerGps={toggleCustomerGps}
              onToggleDriverGps={toggleDriverGps}
              onUpdateDriverLocation={handleUpdateDriverLocation}
              onRequestRideDirectly={() => setIsQuickRequestOpen(true)}
            />
          </div>

          {/* District Quick Bar Helper */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className={`w-4 h-4 ${currentRole === 'customer' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>
                انقر على أي شارع أو حي لتحديده كنقطة انطلاق (🟢) أو وصول (🔴). موقع السائق والزبون يتم تحديثه لحظياً عبر نظام GPS والاتصال الحي.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('main')}
              className="text-emerald-700 hover:text-emerald-800 font-black text-xs cursor-pointer flex items-center gap-1 font-bold"
            >
              <span>الذهاب لطلب التاكسي</span>
              <span>⬅</span>
            </button>
          </div>
        </main>
      )}

      {/* Floating Direct Ride Request Icon & Button for Customer (الواجهة الرئيسية) */}
      {currentRole === 'customer' && !activeRide && (
        <div className="fixed bottom-5 left-4 sm:left-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            id="btn-floating-quick-ride-screen"
            type="button"
            onClick={() => setIsQuickRequestOpen(true)}
            className="group px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black rounded-2xl shadow-2xl border-2 border-slate-950 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="طلب تاكسي فوري بموقعك المباشر GPS"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center text-xl shrink-0 shadow-sm group-hover:rotate-12 transition-transform">
              🚕
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 leading-tight">
                <span>اطلب تاكسي بموقعك الآن</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping inline-block" />
              </div>
              <div className="text-[10px] text-slate-900 font-bold mt-0.5">
                📍 عرض موقعك GPS لـ ({drivers.filter(d => d.isOnline).length}) سائق
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Quick Ride Request Modal (Direct from Screen or Map) */}
      <QuickRequestModal
        isOpen={isQuickRequestOpen}
        onClose={() => setIsQuickRequestOpen(false)}
        pickupDistrict={pickupDistrict}
        userCoords={userCoords}
        districts={districts}
        pricingConfig={pricingConfig}
        activeDriversCount={drivers.filter(d => d.isOnline).length}
        onRequestRide={handleRequestRide}
        onLocateGps={toggleCustomerGps}
        isGpsActive={isCustomerGpsActive}
      />

      {/* Driver Registration and Login Modal */}
      <DriverAuthModal
        isOpen={isDriverAuthOpen}
        onClose={() => setIsDriverAuthOpen(false)}
        initialMode={driverAuthMode}
        drivers={drivers}
        onLoginSuccess={handleLoginDriverSuccess}
        onRegisterSuccess={handleRegisterDriverSuccess}
      />

      {/* Footer with Cultural and Local Respect */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            تطبيق تاكسي الأبيض سيدي الشيخ © 2026 · منظومة النقل الرقمي الآمن لولاية البيض
          </p>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
            <span>القصر الغربي</span>
            <span>·</span>
            <span>حي الشعب والوئام</span>
            <span>·</span>
            <span>مجمع الثانويات</span>
            <span>·</span>
            <span>طريق بوسمغون وبريزينة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
