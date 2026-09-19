import React, { useState, useEffect, useRef } from 'react';
import { District, Driver, PricingConfig, RideRequest, VehicleCategory } from '../../types';
import { OFFICIAL_DISTRICTS } from '../../data/districts';
import { calculateDistanceKm, calculateDirectDistanceMeters, estimateDurationMinutes, calculateFare, formatDZD } from '../../utils/distance';
import { sounds } from '../../utils/audio';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Phone, 
  Star, 
  Clock, 
  Locate, 
  Search, 
  CheckCircle2, 
  X, 
  ChevronDown,
  User,
  Radio,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Banknote,
  Wallet,
  Zap,
  History,
  FileText,
  AlertTriangle,
  Receipt,
  Volume2,
  Share2,
  Lock,
  Gauge,
  Compass,
  UserCheck,
  ArrowDownCircle,
  ArrowUpRight,
  Flag,
  Bell,
  BellRing,
  Smartphone,
  AlertCircle,
  Mail,
  Download
} from 'lucide-react';
import { 
  sendProximityPushNotification, 
  requestPushPermission, 
  getNotificationPermissionStatus 
} from '../../services/pushNotification';
import { TripSafetyShare } from './TripSafetyShare';
import { CustomerUser } from '../../types';
import { CustomerAuthModal } from './CustomerAuthModal';
import { ApkDownloadModal } from '../Shared/ApkDownloadModal';
import { 
  getSavedVerifiedCustomer, 
  saveVerifiedCustomer, 
  clearVerifiedCustomer,
  normalizePhoneNumber 
} from '../../services/otpService';

interface CustomerViewProps {
  drivers: Driver[];
  pricingConfig: PricingConfig;
  activeRide: RideRequest | null;
  pickupDistrict: District | null;
  dropoffDistrict: District | null;
  onSelectPickup: (d: District | null) => void;
  onSelectDropoff: (d: District | null) => void;
  onRequestRide: (rideData: Omit<RideRequest, 'id' | 'createdAt' | 'status'>) => void;
  onCancelRide: () => void;
  onRateRide: (rating: number, review: string) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  onViewOnMap?: () => void;
  isCustomerGpsActive?: boolean;
  recentRides?: RideRequest[];
  onCustomerBoarded?: () => void;
  onCustomerAlighted?: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  drivers,
  pricingConfig,
  activeRide,
  pickupDistrict,
  dropoffDistrict,
  onSelectPickup,
  onSelectDropoff,
  onRequestRide,
  onCancelRide,
  onRateRide,
  onLocateUser,
  isLocating,
  onViewOnMap,
  isCustomerGpsActive,
  recentRides = [],
  onCustomerBoarded,
  onCustomerAlighted,
}) => {
  const [customerName, setCustomerName] = useState('زبون الأبيض سيدي الشيخ');
  const [verifiedCustomer, setVerifiedCustomer] = useState<CustomerUser | null>(() => getSavedVerifiedCustomer());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(false);
  const [accountAlert, setAccountAlert] = useState<string | null>(null);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  useEffect(() => {
    if (verifiedCustomer) {
      setCustomerName(verifiedCustomer.name);
    }
  }, [verifiedCustomer]);

  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'card'>('cash');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RideRequest | null>(null);

  const [isPickupOpen, setIsPickupOpen] = useState(false);
  const [isDropoffOpen, setIsDropoffOpen] = useState(false);
  const [pickupSearchText, setPickupSearchText] = useState('');
  const [dropoffSearchText, setDropoffSearchText] = useState('');
  const [callModalOpen, setCallModalOpen] = useState(false);

  // Rating states
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Proximity alert & push notification states (< 100m)
  const [isProximityPulsing, setIsProximityPulsing] = useState(false);
  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const hasSentProximityPushRef = useRef<{ [rideId: string]: boolean }>({});

  useEffect(() => {
    setPushPermission(getNotificationPermissionStatus());
  }, []);

  // Calculate distance & fare
  const distanceKm = pickupDistrict && dropoffDistrict 
    ? calculateDistanceKm(pickupDistrict.lat, pickupDistrict.lng, dropoffDistrict.lat, dropoffDistrict.lng)
    : 0;

  const estimatedMinutes = distanceKm > 0 ? estimateDurationMinutes(distanceKm) : 0;
  
  // Calculate price with chosen category, pricing engine and surge multiplier
  const estimatedPrice = distanceKm > 0 
    ? calculateFare(distanceKm, pricingConfig, selectedCategory, 0)
    : 0;

  // Assigned driver
  const assignedDriver = activeRide?.assignedDriverId 
    ? drivers.find(d => d.id === activeRide.assignedDriverId)
    : null;

  // Calculate live approaching distance for active ride (< 100m proximity check)
  const isDriverApproaching = activeRide?.status === 'driver_arriving';
  const isDriverArrivedStatus = activeRide?.status === 'driver_arrived';
  const taxiCurrentLat = activeRide?.driverLocation?.lat ?? assignedDriver?.currentLocation.lat ?? 0;
  const taxiCurrentLng = activeRide?.driverLocation?.lng ?? assignedDriver?.currentLocation.lng ?? 0;
  const targetApproachLat = isDriverApproaching ? activeRide?.pickupDistrict?.lat : activeRide?.dropoffDistrict?.lat;
  const targetApproachLng = isDriverApproaching ? activeRide?.pickupDistrict?.lng : activeRide?.dropoffDistrict?.lng;
  const liveApproachingDistanceMeters = (taxiCurrentLat && targetApproachLat !== undefined && targetApproachLng !== undefined) 
    ? calculateDirectDistanceMeters(taxiCurrentLat, taxiCurrentLng, targetApproachLat, targetApproachLng) 
    : 0;
  const isUnder100m = (isDriverApproaching && liveApproachingDistanceMeters > 0 && liveApproachingDistanceMeters <= 100) || isDriverArrivedStatus;

  // Auto trigger push notification & voice alert when driver is < 100m from customer
  useEffect(() => {
    if (
      activeRide &&
      activeRide.status === 'driver_arriving' &&
      liveApproachingDistanceMeters > 0 &&
      liveApproachingDistanceMeters <= 100 &&
      !hasSentProximityPushRef.current[activeRide.id]
    ) {
      hasSentProximityPushRef.current[activeRide.id] = true;
      setIsProximityPulsing(true);
      sounds.speakCustomerProximityAlert(activeRide.id);
      sendProximityPushNotification({
        distanceMeters: liveApproachingDistanceMeters,
        driverName: assignedDriver?.name,
        carModel: assignedDriver?.carModel,
        rideId: activeRide.id,
        isTest: false,
      });
    }
  }, [activeRide?.id, activeRide?.status, liveApproachingDistanceMeters, assignedDriver]);

  // Handler to manually trigger a test push notification & voice alert (< 100m)
  const handleTriggerTestPushNotification = async () => {
    let perm = pushPermission;
    if (perm === 'default') {
      perm = await requestPushPermission();
      setPushPermission(perm);
    }
    setIsProximityPulsing(true);
    sounds.testCustomerProximityAlert();
    await sendProximityPushNotification({
      distanceMeters: liveApproachingDistanceMeters > 0 ? liveApproachingDistanceMeters : 75,
      driverName: assignedDriver?.name || 'عمي لخضر بوعمامة',
      carModel: assignedDriver?.carModel || 'رونو سيمبول (Renault Symbol)',
      rideId: activeRide?.id,
      isTest: true,
    });

    // Keep pulsing effect active for 15 seconds to alert the customer
    setTimeout(() => {
      if (!isUnder100m) {
        setIsProximityPulsing(false);
      }
    }, 15000);
  };

  const handleRequestPushPermission = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
  };

  // Customer Voice Alert upon driver accepting the ride
  useEffect(() => {
    if (
      activeRide &&
      (activeRide.status === 'driver_arriving' || activeRide.status === 'driver_assigned') &&
      assignedDriver
    ) {
      sounds.speakRideAcceptedCustomerAlert(
        activeRide.id,
        assignedDriver.name,
        assignedDriver.carModel,
        assignedDriver.carColor
      );
    }
  }, [activeRide?.id, activeRide?.status, assignedDriver]);

  // Filtered districts
  const filterDistricts = (query: string) => {
    return OFFICIAL_DISTRICTS.filter(d => {
      return d.nameAr.toLowerCase().includes(query.toLowerCase()) || 
        (d.nameFr && d.nameFr.toLowerCase().includes(query.toLowerCase()));
    });
  };

  const handleCustomerVerified = (newCust: CustomerUser) => {
    setVerifiedCustomer(newCust);
    setCustomerName(newCust.name);
    setIsCustomerAuthOpen(false);

    // If customer was in the middle of booking a ride, automatically complete it upon OTP verification
    if (pendingBooking && pickupDistrict && dropoffDistrict) {
      setPendingBooking(false);
      onRequestRide({
        customerId: newCust.id,
        customerName: newCust.name,
        customerPhone: newCust.phone || undefined,
        pickupDistrict,
        dropoffDistrict,
        distanceKm,
        estimatedMinutes,
        estimatedPrice,
        serviceType: selectedCategory,
        paymentMethod,
        surgeMultiplier: pricingConfig.surgeMultiplier || 1.0,
        waitingMinutes: 0,
      });
    }
  };

  const handleBookRide = () => {
    if (!pickupDistrict || !dropoffDistrict) return;
    setAccountAlert(null);
    
    // Require Email OTP verification if not verified
    const isCurrentVerified = verifiedCustomer && verifiedCustomer.isVerified;

    if (!isCurrentVerified) {
      setPendingBooking(true);
      setIsCustomerAuthOpen(true);
      return;
    }

    // التحقق من حالة حساب الزبون (تحكم الإدارة)
    if (verifiedCustomer.status === 'suspended') {
      setAccountAlert('عذراً، حسابك معلق حالياً من قِبل إدارة المنظومة. يرجى مراجعة إدارة بلدية الأبيض سيدي الشيخ.');
      return;
    }

    onRequestRide({
      customerId: verifiedCustomer.id,
      customerName: customerName.trim() || verifiedCustomer.name || 'زبون الأبيض سيدي الشيخ',
      customerPhone: verifiedCustomer.phone || undefined,
      pickupDistrict,
      dropoffDistrict,
      distanceKm,
      estimatedMinutes,
      estimatedPrice,
      serviceType: selectedCategory,
      paymentMethod,
      surgeMultiplier: pricingConfig.surgeMultiplier || 1.0,
      waitingMinutes: 0,
    });
  };

  // 1. STATE: SEARCHING FOR A TAXI
  if (activeRide && activeRide.status === 'searching') {
    return (
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-emerald-500/30 text-center space-y-4 font-['Cairo',sans-serif]">
        <div className="relative w-20 h-20 mx-auto my-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-emerald-600 opacity-30 animate-pulse" />
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
            <Radio className="w-7 h-7 animate-spin" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">
            جاري البحث عن أقرب تاكسي في الأبيض سيدي الشيخ...
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            يظهر طلبك الآن لجميع سائقي تاكسي الأبيض سيدي الشيخ على أجهزتهم والخارطة
          </p>
        </div>

        {/* Trip details summary */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-right space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              نقطة الانطلاق (موقعك):
            </span>
            <strong className="text-slate-900">{activeRide.pickupDistrict.nameAr}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-rose-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              الوجهة المطلوبة:
            </span>
            <strong className="text-slate-900">{activeRide.dropoffDistrict.nameAr}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-bold">فئة السيارة:</span>
            <span className="font-extrabold text-slate-900">
              {activeRide.serviceType === 'standard' && '🚕 سيارة اقتصادية (Standard)'}
              {activeRide.serviceType === 'family' && '🚐 سيارة عائلية (Family)'}
              {activeRide.serviceType === 'comfort' && '✨ سيارة مريحة فاخرة (Comfort)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-bold">طريقة الدفع:</span>
            <span className="font-bold text-slate-900">
              {activeRide.paymentMethod === 'cash' && '💵 نقداً (Cash)'}
              {activeRide.paymentMethod === 'wallet' && '💳 محفظة رقمية (Wallet)'}
              {activeRide.paymentMethod === 'card' && '💳 بطاقة ذهبية / بنكية'}
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">التسعيرة التقديرية:</span>
            <span className="text-emerald-700 text-base font-black">{formatDZD(activeRide.estimatedPrice)}</span>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancelRide}
          className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          إلغاء الطلب
        </button>
      </div>
    );
  }

  // 2. STATE: DRIVER ASSIGNED / ARRIVING / IN PROGRESS (تتبع السائق مباشرة)
  if (activeRide && ['driver_arriving', 'driver_arrived', 'in_progress'].includes(activeRide.status)) {
    const isArriving = activeRide.status === 'driver_arriving';
    const isArrived = activeRide.status === 'driver_arrived';
    const isInProgress = activeRide.status === 'in_progress';

    return (
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-emerald-500/40 space-y-4 font-['Cairo',sans-serif]">
        {/* Status Header with Pulsing Order Icon */}
        <div className={`text-white p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 ${
          (isUnder100m || isProximityPulsing)
            ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-700 ring-2 ring-amber-400'
            : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-3">
            {/* Pulsing Order Icon (أيقونة الطلب بتأثير نبضي متوهج) */}
            <div className="relative flex items-center justify-center shrink-0">
              {(isUnder100m || isProximityPulsing) && (
                <>
                  <span className="absolute -inset-2.5 rounded-2xl bg-amber-400/40 animate-ping duration-1000" />
                  <span className="absolute -inset-1 rounded-2xl bg-amber-400/60 animate-pulse duration-700" />
                </>
              )}
              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg transition-all duration-300 ${
                (isUnder100m || isProximityPulsing)
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 ring-offset-2 ring-offset-emerald-800 scale-105 animate-bounce'
                  : 'bg-emerald-700 text-white border border-emerald-400/40'
              }`}>
                🚕
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-emerald-100 font-bold">تتبع مباشر في الوقت الفعلي</span>
                {(isUnder100m || isProximityPulsing) && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black text-[10px] animate-pulse flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span>⚡ نبض التنبيه: السائق على بعد أقل من 100م!</span>
                  </span>
                )}
              </div>
              <h3 className="font-black text-sm sm:text-base mt-0.5 flex items-center gap-2">
                <span>
                  {isArrived && 'وصل السائق إلى موقعك وهو بانتظارك!'}
                  {!isArrived && (isUnder100m || isProximityPulsing) && 'سائق التاكسي اقترب جداً منك (أقل من 100 متر) 🎯'}
                  {!isArrived && !(isUnder100m || isProximityPulsing) && isArriving && 'سائق التاكسي في طريقه إليك الآن'}
                  {isInProgress && 'الرحلة جارية نحو وجهتك بسلامة الله'}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isUnder100m || isProximityPulsing) ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-md animate-pulse">
                <BellRing className="w-4 h-4 animate-bounce" />
                <span className="hidden sm:inline">أيقونة الطلب نابضة 🔔</span>
              </div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
        </div>

        {/* Proximity Push Notification Card (< 100m) & Test Trigger */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-amber-400/90 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                <Bell className="w-4 h-4" />
                {(isUnder100m || isProximityPulsing) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <span>إشعار دفع (Push Notification) عند اقتراب السائق</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    أقل من 100 متر
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  تنبيه فوري بالاهتزاز والصوت مع تحديث نبضي لأيقونة الطلب لتنبيه الزبون بالاستعداد
                </p>
              </div>
            </div>

            {/* Browser Permission Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-[11px]">
              <span className="text-slate-400">إذن الإشعارات:</span>
              {pushPermission === 'granted' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>مفعّلة 🔔</span>
                </span>
              ) : pushPermission === 'denied' ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-500/40">
                  إشعار ذكي مفعّل 📱
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold border border-amber-500/40 hover:bg-amber-900 transition cursor-pointer flex items-center gap-1"
                >
                  <span>طلب الإذن 🔔</span>
                </button>
              )}
            </div>
          </div>

          {/* Test Push Notification Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-0.5">
            <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span>
                {isUnder100m
                  ? 'السائق الآن على بعد أقل من 100م - تم إرسال الإشعار وتفعيل النبض!'
                  : 'يمكنك تجربة إشعار الدفع ونبض أيقونة الطلب في أي وقت بالزر المقابل:'}
              </span>
            </div>

            <button
              type="button"
              id="btn-test-push-notification"
              onClick={handleTriggerTestPushNotification}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
              title="إرسال إشعار دفع تجريبي وتشغيل نبض أيقونة الطلب"
            >
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>إرسال إشعار دفع تجريبي (&lt; 100م) 🚀</span>
            </button>
          </div>
        </div>

        {/* Voice Alert Announcement Banner */}
        {assignedDriver && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300/80 px-3.5 py-2.5 rounded-2xl text-xs text-emerald-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-2xs">
                <Volume2 className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <span className="font-extrabold">تنبيه صوتي للزبون: </span>
                <span className="text-emerald-800 font-medium">تم نطق اسم السائق ونوع السيارة ولونها صوتياً 📢</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => sounds.speakRideAcceptedCustomerAlert(
                activeRide.id,
                assignedDriver.name,
                assignedDriver.carModel,
                assignedDriver.carColor,
                true
              )}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              title="إعادة نطق تفاصيل السائق والسيارة صوتياً"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>إعادة النطق 🔊</span>
            </button>
          </div>
        )}

        {/* Real-time GPS Driver Tracking Card for Customer */}
        {assignedDriver && (() => {
          const taxiCurrentLat = activeRide?.driverLocation?.lat ?? assignedDriver?.currentLocation.lat ?? 0;
          const taxiCurrentLng = activeRide?.driverLocation?.lng ?? assignedDriver?.currentLocation.lng ?? 0;
          const targetLat = isArriving ? activeRide.pickupDistrict.lat : activeRide.dropoffDistrict.lat;
          const targetLng = isArriving ? activeRide.pickupDistrict.lng : activeRide.dropoffDistrict.lng;
          const liveDistanceMeters = (taxiCurrentLat && targetLat) 
            ? calculateDirectDistanceMeters(taxiCurrentLat, taxiCurrentLng, targetLat, targetLng) 
            : 0;
          const liveSpeed = (assignedDriver?.currentLocation as any)?.speed || (isArrived ? 0 : 34);
          const etaText = isArrived 
            ? 'وصل السائق الآن وهو بانتظارك' 
            : liveDistanceMeters < 100 
            ? 'أقل من دقيقة (وصل تقريباً)' 
            : `${Math.max(1, Math.ceil(liveDistanceMeters / 500))} دقيقة`;

          return (
            <div className="bg-slate-950 text-white p-4 rounded-2xl border-2 border-amber-400 shadow-xl space-y-3">
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg font-black shrink-0 shadow-xs transition-all ${
                    (isUnder100m || isProximityPulsing)
                      ? 'bg-amber-400 text-slate-950 animate-bounce'
                      : 'bg-amber-400 text-slate-950'
                  }`}>
                    🛰️
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>تتبع حركة التاكسي بالـ GPS الحقيقي المباشر</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      {(isUnder100m || isProximityPulsing) && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px] animate-pulse">
                          اقتراب شديد &lt; 100م
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono" dir="ltr">
                      GPS: {taxiCurrentLat.toFixed(5)}, {taxiCurrentLng.toFixed(5)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>إشارة متصلة حية</span>
                  </span>
                </div>
              </div>

              {/* Real-time Telemetry Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center font-sans">
                {/* Distance */}
                <div className={`p-2.5 rounded-xl border transition-all ${
                  (isUnder100m || isProximityPulsing)
                    ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/40 shadow-lg animate-pulse'
                    : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                    <MapPin className={`w-3 h-3 ${(isUnder100m || isProximityPulsing) ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} />
                    <span>المسافة إليك</span>
                  </div>
                  <div className={`text-sm sm:text-base font-black mt-0.5 font-mono ${
                    (isUnder100m || isProximityPulsing) ? 'text-amber-300' : 'text-emerald-400'
                  }`}>
                    {liveDistanceMeters > 1000 
                      ? `${(liveDistanceMeters / 1000).toFixed(1)} كم` 
                      : `${liveDistanceMeters} م`}
                  </div>
                  {(isUnder100m || isProximityPulsing) && (
                    <div className="text-[9px] text-amber-300 font-bold mt-0.5 animate-pulse">
                      ⚡ &lt; 100م قريب جداً
                    </div>
                  )}
                </div>

                {/* Speed */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" />
                    <span>سرعة التاكسي</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-cyan-400 mt-0.5 font-mono">
                    {liveSpeed} <span className="text-[9px] font-normal">كم/س</span>
                  </div>
                </div>

                {/* ETA */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>الوصول التقديري</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-amber-300 mt-1 truncate">
                    {etaText}
                  </div>
                </div>
              </div>

              {/* Direct Link to Map */}
              {onViewOnMap && (
                <button
                  type="button"
                  id="btn-customer-track-on-map"
                  onClick={onViewOnMap}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🗺️</span>
                  <span>مشاهدة حركة السيارة على الخريطة المباشرة (الصفحة 2)</span>
                </button>
              )}
            </div>
          );
        })()}

        {/* Driver Card & Vehicle Information */}
        {assignedDriver ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <img
                src={assignedDriver.avatar}
                alt={assignedDriver.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-sm shrink-0"
              />
              <div>
                <h4 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                  <span>{assignedDriver.name}</span>
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-700 font-bold">
                    {assignedDriver.carModel} · {assignedDriver.carColor}
                  </p>
                  <button
                    type="button"
                    onClick={() => sounds.speakRideAcceptedCustomerAlert(
                      activeRide.id,
                      assignedDriver.name,
                      assignedDriver.carModel,
                      assignedDriver.carColor,
                      true
                    )}
                    className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer shadow-2xs"
                    title="الاستماع لمواصفات السائق والسيارة صوتياً"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold text-[10px]">
                    {assignedDriver.plateNumber}
                  </span>
                  <span className="flex items-center text-amber-500 font-bold text-[11px]">
                    <Star className="w-3 h-3 fill-amber-400 inline ml-0.5" />
                    {assignedDriver.rating} ({assignedDriver.totalTrips} رحلة)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Direct Call + Safety Share */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {assignedDriver.showPhoneToCustomer === false ? (
                <button
                  type="button"
                  onClick={() => setCallModalOpen(true)}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  title="رقم الهاتف محمي بواسطة السائق"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>الرقم محمي (خاص بالإدارة)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCallModalOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>اتصال بالسائق</span>
                </button>
              )}

              <TripSafetyShare
                activeRide={activeRide}
                assignedDriver={assignedDriver}
                buttonVariant="compact"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-600">
            تم قبول طلبك بواسطة سائق تاكسي معتمد بالأبيض سيدي الشيخ
          </div>
        )}

        {/* Safety & Peace of Mind Share Banner */}
        {assignedDriver && (
          <TripSafetyShare
            activeRide={activeRide}
            assignedDriver={assignedDriver}
            buttonVariant="banner"
          />
        )}

        {/* Route Details and Live Progress Bar */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold">🟢 موقع الانطلاق:</span>
            <span className="font-black text-slate-900">{activeRide.pickupDistrict.nameAr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold">🔴 الوجهة المطلوبة:</span>
            <span className="font-black text-slate-900">{activeRide.dropoffDistrict.nameAr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold">طريقة الدفع المختارة:</span>
            <span className="font-bold text-slate-900">
              {activeRide.paymentMethod === 'cash' ? '💵 نقداً (Cash)' : '💳 دفع إلكتروني'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>تقدم الرحلة</span>
              <span>{activeRide.progressPercent || 20}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-700 rounded-full"
                style={{ width: `${activeRide.progressPercent || 20}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
            <span className="text-slate-600 font-bold">الأجرة المتفق عليها:</span>
            <span className="font-black text-emerald-800 text-base">{formatDZD(activeRide.estimatedPrice)}</span>
          </div>
        </div>

        {/* Call modal */}
        {callModalOpen && assignedDriver && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
              {assignedDriver.showPhoneToCustomer === false ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-900">رقم هاتف السائق محمي</h4>
                    <p className="text-xs text-slate-500 mt-1">{assignedDriver.name} · {assignedDriver.carModel}</p>
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 mt-3 text-right space-y-1.5">
                      <p className="font-bold flex items-center gap-1 text-amber-900">
                        <span>🔒</span>
                        <span>اختار هذا السائق إخفاء هاتفه عن الزبائن.</span>
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        رقم الهاتف متاح لإدارة المنظومة فقط للمتابعة الرسمية والأمان. السائق يرى موقعك بدقة على الخارطة عبر الـ GPS وهو متوجه إليك الآن.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCallModalOpen(false)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                    >
                      حسناً، فهمت
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Phone className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-900">الاتصال المباشر بالسائق</h4>
                    <p className="text-xs text-slate-500 mt-1">{assignedDriver.name} · {assignedDriver.carModel}</p>
                    <div className="text-lg font-mono font-black text-emerald-700 mt-2" dir="ltr">
                      {assignedDriver.phone}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCallModalOpen(false)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      إغلاق
                    </button>
                    <a
                      href={`tel:${assignedDriver.phone.replace(/\s/g, '')}`}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>اتصال الآن</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Customer Boarding / Alighting Action Buttons (زر الركوب وزر الهبوط بالنسبة للزبون) */}
        <div className="space-y-2 pt-1">
          {/* 1. زر الركوب: عند وصول السائق أو اقترابه */}
          {(isArriving || isArrived) && (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-2 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-emerald-950">زر الركوب (نقطة الانطلاق)</h4>
                    <p className="text-[11px] text-emerald-800">
                      {isArrived ? 'وصل السائق إلى موقعك! اضغط لتأكيد ركوبك وبدء الرحلة' : 'السائق في الطريق إليك، اضغط عند ركوبك السيارة'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onCustomerBoarded) {
                    onCustomerBoarded();
                  }
                  sounds.speakTripStartedAlert(activeRide.id, false);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-5 h-5 animate-bounce" />
                <span>🟢 زر الركوب: تأكيد الركوب (ركبت التاكسي 🚕)</span>
              </button>
            </div>
          )}

          {/* 2. زر الهبوط: عندما تكون الرحلة جارية نحو الوجهة */}
          {isInProgress && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-500 rounded-2xl space-y-2 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-rose-950">زر الهبوط (نقطة الوصول)</h4>
                    <p className="text-[11px] text-rose-800">
                      عند وصولك لوجهتك في {activeRide.dropoffDistrict.nameAr}، اضغط لتأكيد النزول
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onCustomerAlighted) {
                    onCustomerAlighted();
                  }
                  sounds.speakRideCompletedAlert(activeRide.id, activeRide.estimatedPrice, false);
                }}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-sm font-black shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flag className="w-5 h-5" />
                <span>🔴 زر الهبوط: تأكيد الهبوط (وصلت وهبطت من السيارة ✅)</span>
              </button>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {isArriving && (
          <button
            onClick={onCancelRide}
            className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إلغاء الرحلة
          </button>
        )}
      </div>
    );
  }

  // 3. STATE: COMPLETED - RATING & INVOICE VIEW (نظام التقييم والمراجعات وضمان الجودة)
  if (activeRide && activeRide.status === 'completed') {
    return (
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-emerald-500/40 text-center space-y-4 font-['Cairo',sans-serif]">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">
            الحمد لله على سلامتك! اكتملت الرحلة بنجاح
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            يرجى تقييم أداء السائق لضمان جودة خدمة النقل بالأبيض سيدي الشيخ
          </p>
        </div>

        {/* Invoice Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span className="text-slate-600 flex items-center gap-1">
              <Receipt className="w-4 h-4 text-emerald-600" />
              فاتورة الرحلة:
            </span>
            <span className="font-mono text-slate-900">#{activeRide.id.slice(-6)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">المسار:</span>
            <span className="font-bold text-slate-800">{activeRide.pickupDistrict.nameAr} ⬅ {activeRide.dropoffDistrict.nameAr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">طريقة الدفع:</span>
            <span className="font-bold text-slate-800">
              {activeRide.paymentMethod === 'cash' ? '💵 نقداً (تم التسليم للسائق)' : '💳 دفع إلكتروني'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-sm">
            <span className="text-slate-800">المبلغ المدفوع:</span>
            <span className="text-emerald-700 text-base">{formatDZD(activeRide.estimatedPrice)}</span>
          </div>
        </div>

        {/* Rating Stars */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">تقييمك للسائق والسيارة:</div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingStars(star)}
                className="p-1 transition transform hover:scale-110 cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= ratingStars
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Review input */}
        <div className="text-right space-y-1">
          <label className="text-xs font-bold text-slate-700">ملاحظتك أو رأيك (اختياري):</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="كيف كانت تجربة التاكسي؟ نظافة السيارة، احترام المواعيد، التعامل..."
            rows={2}
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => onRateRide(ratingStars, reviewText)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer"
        >
          تأكيد التقييم وإنهاء الرحلة
        </button>
      </div>
    );
  }

  // 4. MAIN BOOKING FORM (الصفحة 1: تطبيق الركاب المتكامل)
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border-2 border-emerald-500/30 space-y-4 font-['Cairo',sans-serif]">
      {/* Header Banner with History Trigger */}
      <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-black text-base flex items-center gap-2">
            <span>🟢</span>
            <span>تطبيق الركاب - تاكسي الأبيض سيدي الشيخ</span>
          </h3>
          <p className="text-xs text-emerald-100 mt-0.5">
            حدد موقعك ووجهتك، واختر فئة السيارة وطريقة الدفع
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* APK / PWA Mobile Download Button */}
          <button
            type="button"
            onClick={() => setIsApkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs transition cursor-pointer"
            title="تثبيت التطبيق على الهاتف أو استخراج ملف APK"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">تحميل APK 📱</span>
            <span className="sm:hidden">APK</span>
          </button>

          {/* Customer Voice Test Button */}
          <button
            type="button"
            onClick={() => sounds.testCustomerVoiceAlert()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            title="فحص الصوت: تجربة تنبيه قبول الطلب ونطق اسم السائق والسيارة"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">فحص الصوت 🔊</span>
          </button>

          {/* Trip History Button */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            title="سجل الرحلات السابقة والفواتير"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">سجل الرحلات</span>
          </button>

          {/* GPS Quick Button */}
          <button
            id="btn-customer-gps-locate"
            onClick={onLocateUser}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${
              isCustomerGpsActive
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title="تحديد موقعي المباشر تلقائياً عبر GPS"
          >
            <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'جاري التحديد...' : isCustomerGpsActive ? 'GPS نشط 📡' : 'موقعي GPS 📍'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Surge Pricing Notice (التسعير الديناميكي) */}
      {pricingConfig.surgeMultiplier && pricingConfig.surgeMultiplier > 1.0 && (
        <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500" />
            <div>
              <span className="font-black">تطبيق تسعيرة الذروة ({pricingConfig.surgeMultiplier}x):</span>
              <span className="text-[11px] text-amber-800 mr-1">
                {pricingConfig.surgeReason || 'ارتفاع الطلب أو وقت خروج الموظفين/المدارس في المدينة'}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-black text-[10px] rounded-lg">
            ذروة ديناميكية
          </span>
        </div>
      )}

      {/* Account Status Alert (e.g. if suspended by Admin) */}
      {accountAlert && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold">{accountAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setAccountAlert(null)}
            className="text-rose-700 hover:text-rose-900 text-xs underline font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Passenger Info & Email OTP Verification Status (بدون رقم هاتف) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم الراكب:</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 outline-hidden"
                placeholder="اسمك الكريم..."
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">حساب البريد الإلكتروني:</label>
            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl" dir="ltr">
              <div className="flex items-center gap-2 overflow-hidden text-left">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-800 truncate">
                  {verifiedCustomer?.email || 'غير مسجل حالياً'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerAuthOpen(true)}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 px-2 py-1 rounded-lg shrink-0 cursor-pointer shadow-2xs"
              >
                {verifiedCustomer?.isVerified ? 'تغيير' : 'تسجيل'}
              </button>
            </div>
          </div>
        </div>

        {/* Email OTP Account Verification Status Badge */}
        {verifiedCustomer && verifiedCustomer.isVerified ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300/80 px-3.5 py-2.5 rounded-2xl text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-emerald-950">حساب موثق عبر البريد الإلكتروني</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Email OTP ✓
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  حسابك مفعل وجاهز لطلب رحلات التاكسي بالأبيض سيدي الشيخ
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerAuthOpen(true)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline px-2 py-1 rounded-lg hover:bg-emerald-100/60 transition cursor-pointer shrink-0"
            >
              إدارة الحساب
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-amber-950 text-xs">تفعيل الحساب إلزامي لطلب الرحلة:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[10px]">مطلوب</span>
                </div>
                <span className="text-[11px] text-amber-850 block mt-0.5">
                  لا يمكن للزبون القيام بأي طلب تاكسي حتى يفعل حسابه بالبريد الإلكتروني (مجاناً وبدون أي تكلفة).
                </span>
              </div>
            </div>
            <button
              type="button"
              id="btn-customer-verify-otp"
              onClick={() => {
                setPendingBooking(false);
                setIsCustomerAuthOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-98"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>تفعيل الحساب الآن 🛡️</span>
            </button>
          </div>
        )}
      </div>

      {/* Booking Form: Simple & Intuitive with Explicit Boarding & Alighting Buttons */}
      <div className="space-y-3">
        {/* Header / Section Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">📍</span>
            <span className="text-xs font-black text-slate-900">تحديد المسار: زر الركوب وزر الهبوط</span>
          </div>
          <span className="text-[11px] text-slate-500 font-bold">الأبيض سيدي الشيخ</span>
        </div>

        {/* 🟢 1. زر الركوب (Pickup / Boarding Point) */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-500/80 transition shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <div className="font-black text-emerald-950 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 inline-flex items-center justify-center text-[9px] text-white font-black">1</span>
              <span>زر الركوب (مكان الركوب / الانطلاق):</span>
            </div>
            <button
              type="button"
              onClick={onLocateUser}
              className="text-[11px] text-emerald-800 hover:text-emerald-950 font-black bg-emerald-200/80 hover:bg-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="تحديد موقعك الحالي تلقائياً بالـ GPS"
            >
              <Locate className="w-3.5 h-3.5 text-emerald-800 animate-pulse" />
              <span>موقعي GPS الآن 📍</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickupOpen(!isPickupOpen)}
              className="w-full p-3.5 bg-white border border-emerald-300 hover:border-emerald-600 rounded-xl text-right text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="truncate text-right">
                  <div className="font-black text-slate-900 text-xs truncate">
                    {pickupDistrict ? pickupDistrict.nameAr : 'اضغط هنا لاختيار مكان الركوب (أو اضغط موقعي GPS)'}
                  </div>
                  <div className="text-[10px] text-emerald-700 truncate">
                    {pickupDistrict ? 'تم تعيين نقطة الركوب بنجاح ✓' : 'انقر لتحديد الحي أو المرفق في الأبيض سيدي الشيخ'}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-emerald-700 shrink-0 transition-transform ${isPickupOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Suggestions for Boarding */}
            <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto pb-0.5 text-[11px]">
              <span className="text-[10px] text-slate-500 font-bold shrink-0">أماكن ركوب سريعة:</span>
              {['وسط المدينة', 'مستشفى الأبيض', 'الزاوية الشيخية', 'حي 20 أوت'].map(spotName => {
                const matched = OFFICIAL_DISTRICTS.find(d => d.nameAr.includes(spotName));
                return (
                  <button
                    key={spotName}
                    type="button"
                    onClick={() => {
                      if (matched) onSelectPickup(matched);
                    }}
                    className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                      pickupDistrict?.nameAr.includes(spotName)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white hover:bg-emerald-100/70 text-slate-700 border-slate-200'
                    }`}
                  >
                    {spotName}
                  </button>
                );
              })}
            </div>

            {/* Dropdown list */}
            {isPickupOpen && (
              <div className="absolute z-50 mt-1 inset-x-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 max-h-60 overflow-y-auto space-y-1">
                <div className="p-1">
                  <input
                    type="text"
                    value={pickupSearchText}
                    onChange={e => setPickupSearchText(e.target.value)}
                    placeholder="ابحث عن حي أو مرفق للركوب..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                {filterDistricts(pickupSearchText).map(dist => (
                  <button
                    key={dist.id}
                    type="button"
                    onClick={() => {
                      onSelectPickup(dist);
                      setIsPickupOpen(false);
                      setPickupSearchText('');
                    }}
                    className={`w-full p-2.5 rounded-xl text-right text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      pickupDistrict?.id === dist.id ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span>{dist.nameAr}</span>
                    {dist.popular && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">شائع</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🔴 2. زر الهبوط (Dropoff / Destination Point) */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-rose-50/70 border-2 border-rose-500/80 transition shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <div className="font-black text-rose-950 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-600 inline-flex items-center justify-center text-[9px] text-white font-black">2</span>
              <span>زر الهبوط (مكان النزول / الوجهة):</span>
            </div>
            <span className="text-[10px] text-rose-700 font-bold">الوجهة المقصودة 🏁</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropoffOpen(!isDropoffOpen)}
              className="w-full p-3.5 bg-white border border-rose-300 hover:border-rose-600 rounded-xl text-right text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="truncate text-right">
                  <div className="font-black text-slate-900 text-xs truncate">
                    {dropoffDistrict ? dropoffDistrict.nameAr : 'اضغط هنا لاختيار مكان الهبوط (الوجهة)'}
                  </div>
                  <div className="text-[10px] text-rose-700 truncate">
                    {dropoffDistrict ? 'تم تعيين نقطة الهبوط بنجاح ✓' : 'اختر أين تريد النزول في الأبيض سيدي الشيخ'}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-rose-700 shrink-0 transition-transform ${isDropoffOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Suggestions for Dropoff */}
            <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto pb-0.5 text-[11px]">
              <span className="text-[10px] text-slate-500 font-bold shrink-0">وجهات هبوط شائعة:</span>
              {['المستشفى الجديد', 'المحطة البرية', 'السوق الأسبوعي', 'مقر البلدية'].map(spotName => {
                const matched = OFFICIAL_DISTRICTS.find(d => d.nameAr.includes(spotName));
                return (
                  <button
                    key={spotName}
                    type="button"
                    onClick={() => {
                      if (matched) onSelectDropoff(matched);
                    }}
                    className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                      dropoffDistrict?.nameAr.includes(spotName)
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white hover:bg-rose-100/70 text-slate-700 border-slate-200'
                    }`}
                  >
                    {spotName}
                  </button>
                );
              })}
            </div>

            {/* Dropdown list */}
            {isDropoffOpen && (
              <div className="absolute z-50 mt-1 inset-x-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 max-h-60 overflow-y-auto space-y-1">
                <div className="p-1">
                  <input
                    type="text"
                    value={dropoffSearchText}
                    onChange={e => setDropoffSearchText(e.target.value)}
                    placeholder="ابحث عن وجهة للهبوط والنزول..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-rose-500"
                    autoFocus
                  />
                </div>
                {filterDistricts(dropoffSearchText).map(dist => (
                  <button
                    key={dist.id}
                    type="button"
                    onClick={() => {
                      onSelectDropoff(dist);
                      setIsDropoffOpen(false);
                      setDropoffSearchText('');
                    }}
                    className={`w-full p-2.5 rounded-xl text-right text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      dropoffDistrict?.id === dist.id ? 'bg-rose-50 text-rose-800' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span>{dist.nameAr}</span>
                    {dist.popular && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">شائع</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Field 3: Vehicle Category Selection (اختيار فئة السيارة: اقتصادية، عائلية، فاخرة) */}
        <div className="space-y-1.5 pt-1">
          <label className="font-black text-slate-800 text-xs flex items-center justify-between">
            <span>اختر فئة السيارة:</span>
            <span className="text-[11px] text-slate-500">سيارات معتمدة في الأبيض سيدي الشيخ</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Standard Category */}
            <button
              type="button"
              onClick={() => setSelectedCategory('standard')}
              className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                selectedCategory === 'standard'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl">🚕</div>
              <div className="mt-1">
                <div className="font-black text-xs text-slate-900">اقتصادية</div>
                <div className="text-[10px] text-slate-500">سيمبول، لوغان (1-4 ركاب)</div>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-800">
                {distanceKm > 0 ? formatDZD(calculateFare(distanceKm, pricingConfig, 'standard')) : 'الأنسب سعراً'}
              </div>
            </button>

            {/* Family Category */}
            <button
              type="button"
              onClick={() => setSelectedCategory('family')}
              className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                selectedCategory === 'family'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl">🚐</div>
              <div className="mt-1">
                <div className="font-black text-xs text-slate-900">عائلية</div>
                <div className="text-[10px] text-slate-500">مساحة واسعة + حقائب</div>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-800">
                {distanceKm > 0 ? formatDZD(calculateFare(distanceKm, pricingConfig, 'family')) : '+30%'}
              </div>
            </button>

            {/* Comfort Category */}
            <button
              type="button"
              onClick={() => setSelectedCategory('comfort')}
              className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                selectedCategory === 'comfort'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl">✨</div>
              <div className="mt-1">
                <div className="font-black text-xs text-slate-900">فاخرة مريحة</div>
                <div className="text-[10px] text-slate-500">مكيفة، قيادة هادئة</div>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-800">
                {distanceKm > 0 ? formatDZD(calculateFare(distanceKm, pricingConfig, 'comfort')) : '+25%'}
              </div>
            </button>
          </div>
        </div>

        {/* Field 4: Payment Gateway (بوابة الدفع: نقداً Cash وهو الأساسي، مع دعم المحفظة والبطاقات) */}
        <div className="space-y-1.5 pt-1">
          <label className="font-black text-slate-800 text-xs flex items-center justify-between">
            <span>طريقة الدفع:</span>
            <span className="text-[10px] text-emerald-700 font-bold">الدفع نقداً مفعل ومباشر</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === 'cash'
                  ? 'border-emerald-600 bg-emerald-100/60 text-emerald-950 font-black shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span className="text-xs">نقداً (Cash)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className={`p-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === 'wallet'
                  ? 'border-emerald-600 bg-emerald-100/60 text-emerald-950 font-black shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold'
              }`}
            >
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span className="text-xs">المحفظة</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === 'card'
                  ? 'border-emerald-600 bg-emerald-100/60 text-emerald-950 font-black shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span className="text-xs">بطاقة بنكية</span>
            </button>
          </div>
        </div>

        {/* Trip Fare & Distance Display Card (معادلة برمجية خاصة لحساب التكلفة التقديرية قبل التأكيد) */}
        {pickupDistrict && dropoffDistrict && (
          <div className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div>
              <div className="text-[11px] text-slate-600 font-medium">الأجرة التقديرية المحسوبة برمجياً:</div>
              <div className="text-2xl font-black text-emerald-800 mt-0.5">{formatDZD(estimatedPrice)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                (فتح عداد: {pricingConfig.baseFare} دج + {pricingConfig.perKmRate} دج/كم)
                {pricingConfig.surgeMultiplier > 1.0 && ` · ضرب الذروة ${pricingConfig.surgeMultiplier}x`}
              </div>
            </div>
            <div className="text-left text-xs text-slate-700 space-y-1 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
              <div>المسافة على شوارع المدينة: <strong>{distanceKm} كم</strong></div>
              <div>الوقت المتوقع للوصول: <strong>{estimatedMinutes} دقيقة</strong></div>
              <div className="text-[10px] text-emerald-700 font-bold">لا توجد رسوم خفية</div>
            </div>
          </div>
        )}

        {/* Account Verification Alert for Ride Ordering */}
        {!(verifiedCustomer && verifiedCustomer.isVerified) && pickupDistrict && dropoffDistrict && (
          <div className="bg-amber-50 border-2 border-amber-400/90 rounded-2xl p-3 text-xs text-amber-950 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-black text-amber-950">
                تنبيه هام: لا يمكن إرسال طلب التاكسي حتى يتم تفعيل الحساب
              </span>
            </div>
            <p className="text-[11px] text-amber-850 leading-relaxed">
              وفقاً لقوانين الخدمة في الأبيض سيدي الشيخ، يلزم تفعيل حسابك بالبريد الإلكتروني مرة واحدة لتأكيد جديتك للسائقين. اضغط الزر أدناه للتفعيل الفوري ثم إرسال الطلب تلقائياً.
            </p>
          </div>
        )}

        {/* Main Request Taxi Action Button */}
        <button
          id="btn-confirm-order-taxi"
          type="button"
          onClick={handleBookRide}
          disabled={!pickupDistrict || !dropoffDistrict}
          className={`w-full py-4 rounded-2xl font-black text-sm sm:text-base transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
            pickupDistrict && dropoffDistrict
              ? verifiedCustomer && verifiedCustomer.isVerified
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.01]'
                : 'bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-slate-950 hover:scale-[1.01]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {verifiedCustomer && verifiedCustomer.isVerified ? (
            <>
              <span>🚕</span>
              <span>طلب الرحلة الآن</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 text-slate-950" />
              <span>تفعيل الحساب وطلب الرحلة</span>
            </>
          )}

          {pickupDistrict && dropoffDistrict && (
            <span className={`px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold ${
              verifiedCustomer && verifiedCustomer.isVerified ? 'bg-emerald-800 text-amber-300' : 'bg-slate-950 text-amber-300'
            }`}>
              {formatDZD(estimatedPrice)}
            </span>
          )}
        </button>
      </div>

      {/* Available Taxis Section */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>سيارات الأجرة المتاحة في الأبيض سيدي الشيخ:</span>
          </span>
          <span className="text-slate-500 text-[11px] font-bold">
            {drivers.filter(d => d.isOnline).length} سيارة متصلة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {drivers.filter(d => d.isOnline).slice(0, 4).map(d => (
            <div key={d.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {d.category === 'family' ? '🚐' : d.category === 'comfort' ? '✨' : '🚕'}
                </span>
                <div>
                  <div className="font-bold text-slate-900">{d.name}</div>
                  <div className="text-[10px] text-slate-500">{d.carModel}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                {d.plateNumber}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TRIP HISTORY & INVOICE MODAL (سجل الرحلات والفواتير) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-base">سجل الرحلات السابقة والفواتير</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recentRides.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">لا توجد رحلات سابقة مسجلة حتى الآن.</p>
                <p className="text-[11px] text-slate-400">ستظهر هنا تفاصيل رحلاتك وفواتيرها فور إكمالها.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRides.map(ride => (
                  <div
                    key={ride.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-slate-800">
                        {ride.pickupDistrict.nameAr} ⬅ {ride.dropoffDistrict.nameAr}
                      </span>
                      <span className="font-mono text-emerald-700 font-extrabold text-sm">
                        {formatDZD(ride.estimatedPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>التاريخ: {new Date(ride.createdAt).toLocaleDateString('ar-DZ')}</span>
                      <span>المسافة: {ride.distanceKm} كم</span>
                      <span>الدفع: {ride.paymentMethod === 'cash' ? 'نقداً' : 'محفظة'}</span>
                    </div>

                    {ride.rating && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 inline" />
                        <span>التقييم: {ride.rating} نجوم</span>
                        {ride.review && <span className="text-slate-500 font-normal">({ride.review})</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer OTP Verification Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => {
          setIsCustomerAuthOpen(false);
          setPendingBooking(false);
        }}
        currentCustomer={verifiedCustomer}
        onCustomerVerified={handleCustomerVerified}
      />

      {/* APK / Mobile Install Modal */}
      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
};
