import React, { useState, useEffect } from 'react';
import { Driver, RideRequest, PricingConfig, DriverDocument } from '../../types';
import { formatDZD } from '../../utils/distance';
import { sounds } from '../../utils/audio';
import { WalletScreen } from './WalletScreen';
import { NavigationVoiceHUD } from './NavigationVoiceHUD';
import { TripHistoryView } from './TripHistoryView';
import { 
  Power, 
  Navigation, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Clock, 
  Star, 
  LogIn, 
  UserPlus, 
  Radio, 
  Car,
  FileText,
  ExternalLink,
  Zap,
  Wallet,
  Upload,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Compass,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
  LogOut,
  Volume2,
  History
} from 'lucide-react';

interface DriverViewProps {
  currentDriver: Driver;
  activeRide: RideRequest | null;
  onToggleOnline: (isOnline: boolean) => void;
  onAcceptRide: (rideId: string) => void;
  onDeclineRide: (rideId: string) => void;
  onDriverArrived: () => void;
  onStartTrip: () => void;
  onCompleteTrip: () => void;
  pricingConfig: PricingConfig;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  onLogout?: () => void;
  allDrivers?: Driver[];
  onSelectDriver?: (driverId: string) => void;
  onViewOnMap?: () => void;
  isDriverGpsActive?: boolean;
  onToggleDriverGps?: () => void;
  isSimulatingDrive?: boolean;
  onToggleSimulateDrive?: () => void;
  onUpdateDriverDocuments?: (driverId: string, documents: DriverDocument[]) => void;
  onTogglePhoneVisibility?: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({
  currentDriver,
  activeRide,
  onToggleOnline,
  onAcceptRide,
  onDeclineRide,
  onDriverArrived,
  onStartTrip,
  onCompleteTrip,
  pricingConfig,
  onOpenAuthModal,
  onLogout,
  allDrivers,
  onSelectDriver,
  onViewOnMap,
  isDriverGpsActive,
  onToggleDriverGps,
  isSimulatingDrive,
  onToggleSimulateDrive,
  onUpdateDriverDocuments,
  onTogglePhoneVisibility,
}) => {
  // 15 seconds countdown as requested: مؤقت تنازلي (مثلاً 15 ثانية) للقبول أو الرفض
  const [requestCountdown, setRequestCountdown] = useState(15);
  const [activeDriverTab, setActiveDriverTab] = useState<'radar' | 'wallet' | 'history' | 'documents'>('radar');
  
  // Local wallet state (defaults from driver object)
  const [walletStats, setWalletStats] = useState({
    todayEarnings: currentDriver.wallet?.todayEarnings || 2450,
    weekEarnings: currentDriver.wallet?.weekEarnings || 16800,
    balance: currentDriver.wallet?.balance || 14250,
    commissionRate: currentDriver.wallet?.commissionRate || pricingConfig.platformCommissionRate || 0.15,
    totalPlatformFee: currentDriver.wallet?.totalPlatformFeePaid || 2520,
  });

  // Document upload state
  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>(() => {
    return currentDriver.documents || [
      { id: 'doc-1', type: 'driving_license', titleAr: 'رخصة السياقة (Permis de conduire)', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', uploadedAt: Date.now() - 86400000 * 30, status: 'verified' },
      { id: 'doc-2', type: 'car_registration', titleAr: 'البطاقة الرمادية للمركبة (Carte Grise)', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', uploadedAt: Date.now() - 86400000 * 30, status: 'verified' },
      { id: 'doc-3', type: 'insurance', titleAr: 'شهادة تأمين سيارة الأجرة (Assurance)', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', uploadedAt: Date.now() - 86400000 * 20, status: 'verified' },
      { id: 'doc-4', type: 'professional_card', titleAr: 'دفتر المقاعد / رخصة الثقة المحلية', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', uploadedAt: Date.now() - 86400000 * 25, status: 'verified' },
    ];
  });

  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Incoming ride offer for all online drivers
  const isIncomingOffer = activeRide && (activeRide.status === 'searching' || (activeRide.status as string) === 'pending') && currentDriver.isOnline;
  const isMyAssignedRide = activeRide && activeRide.assignedDriverId === currentDriver.id;
  const isOtherDriverAssigned = activeRide && activeRide.assignedDriverId && activeRide.assignedDriverId !== currentDriver.id;

  // Countdown timer for incoming offer (15 seconds) & Arabic Voice Alert
  useEffect(() => {
    if (!isIncomingOffer || !activeRide) {
      return;
    }
    setRequestCountdown(15);
    
    // Voice alert: "هناك طلب جديد! موقع الزبون: [اسم الحي]"
    sounds.speakRideRequestAlert(
      activeRide.id,
      activeRide.pickupDistrict.nameAr,
      activeRide.dropoffDistrict.nameAr
    );

    const timer = setInterval(() => {
      setRequestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIncomingOffer, activeRide?.id, activeRide?.pickupDistrict.nameAr, activeRide?.dropoffDistrict.nameAr]);

  // Safe auto-decline when countdown reaches 0 (executed cleanly in an effect, never inside a state updater)
  useEffect(() => {
    if (requestCountdown === 0 && isIncomingOffer && activeRide) {
      onDeclineRide(activeRide.id);
    }
  }, [requestCountdown, isIncomingOffer, activeRide?.id, onDeclineRide]);

  const handleComplete = () => {
    if (activeRide) {
      const fare = activeRide.estimatedPrice;
      const commission = Math.round(fare * walletStats.commissionRate);
      const netEarnings = fare - commission;

      setWalletStats(prev => ({
        ...prev,
        todayEarnings: prev.todayEarnings + fare,
        weekEarnings: prev.weekEarnings + fare,
        balance: prev.balance + netEarnings,
        totalPlatformFee: prev.totalPlatformFee + commission,
      }));
    }
    onCompleteTrip();
  };

  // Google Maps Direct Navigation helper
  const handleOpenGoogleMapsNav = (lat: number, lng: number, label: string) => {
    // Open Google Maps Navigation directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Handle uploading a document
  const handleSimulateUpload = (type: DriverDocument['type'], titleAr: string) => {
    const newDoc: DriverDocument = {
      id: `doc-${Date.now()}`,
      type,
      titleAr,
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop',
      uploadedAt: Date.now(),
      status: 'pending',
    };

    const updated = driverDocuments.filter(d => d.type !== type).concat(newDoc);
    setDriverDocuments(updated);
    if (onUpdateDriverDocuments) {
      onUpdateDriverDocuments(currentDriver.id, updated);
    }
    setUploadNotice(`تم رفع وثيقة (${titleAr}) بنجاح وهي قيد مراجعة الإدارة`);
    setTimeout(() => setUploadNotice(null), 4000);
  };

  return (
    <div className="bg-white rounded-3xl p-4 md:p-5 shadow-xl border-2 border-amber-400/60 space-y-4 font-['Cairo',sans-serif]">
      {/* Driver Header Banner: Taxi Yellow Identity */}
      <div className="bg-amber-400 text-slate-950 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-2xl shadow-sm">
            🚕
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-950">
                تطبيق السائقين (طاكسي الأبيض سيدي الشيخ)
              </h3>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-950 text-amber-300">
                {currentDriver.name}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              {currentDriver.carModel} · {currentDriver.plateNumber} · {currentDriver.category === 'family' ? 'عائلية' : currentDriver.category === 'comfort' ? 'فاخرة' : 'اقتصادية'}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle Button & Logout */}
        <div className="flex items-center gap-2">
          <button
            id="btn-driver-toggle-online"
            onClick={() => onToggleOnline(!currentDriver.isOnline)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              currentDriver.isOnline
                ? 'bg-slate-950 text-amber-400 hover:bg-slate-900'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{currentDriver.isOnline ? 'متاح للطلب (متصل 🟢)' : 'الوضع الأوفلاين (غير متصل ⚪)'}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border border-slate-950/20"
              title="تسجيل الخروج من حساب السائق"
            >
              <LogOut className="w-4 h-4 text-slate-950" />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
      </div>

      {/* Driver Sub-Navigation Tabs: Radar vs Wallet vs History vs Documents */}
      <div className="flex items-center justify-center bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-black">
        <button
          onClick={() => setActiveDriverTab('radar')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeDriverTab === 'radar' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>الرادار والطلبات</span>
          {isIncomingOffer && (
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveDriverTab('wallet')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeDriverTab === 'wallet' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>محفظة الأرباح ({formatDZD(walletStats.todayEarnings)})</span>
        </button>

        <button
          onClick={() => setActiveDriverTab('history')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeDriverTab === 'history' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>سجل الرحلات</span>
        </button>

        <button
          onClick={() => setActiveDriverTab('documents')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeDriverTab === 'documents' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>رفع الوثائق</span>
        </button>
      </div>

      {/* GPS & Simulation Controls Bar */}
      <div className="bg-amber-50/80 rounded-2xl p-3 border border-amber-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-700">
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
            <div className="flex items-center gap-1 font-mono" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-bold">{currentDriver.phone}</span>
            </div>
            {onTogglePhoneVisibility && (
              <button
                type="button"
                onClick={onTogglePhoneVisibility}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer border ${
                  currentDriver.showPhoneToCustomer !== false
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                }`}
                title={
                  currentDriver.showPhoneToCustomer !== false
                    ? 'الرقم ظاهر للزبائن. انقر هنا لإخفائه عن الزبائن (يظهر للإدارة فقط)'
                    : 'الرقم مخفي عن الزبائن. انقر هنا لإظهاره للزبائن للاتصال المباشر'
                }
              >
                {currentDriver.showPhoneToCustomer !== false ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ظاهر للزبائن 👁️</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>مخفي عن الزبائن 🔒</span>
                  </>
                )}
              </button>
            )}
          </div>
          {currentDriver.licenseNumber && (
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>رخصة: <strong>{currentDriver.licenseNumber}</strong></span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Driver Voice & Chime Audio Tests */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => sounds.testDriverVoiceAlert()}
              className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="تجربة صوت تنبيه طلب رحلة جديدة"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-700" />
              <span>طلب جديد 📡</span>
            </button>

            <button
              onClick={() => sounds.testDriverProximityAlert()}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="تجربة تنبيه: لقد اقتربت من الزبون"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-700" />
              <span>اقتربت من الزبون 🔔</span>
            </button>

            <button
              onClick={() => sounds.speakTripStartedAlert(undefined, true, true)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="تجربة تنبيه انطلاق الرحلة"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>انطلاق الرحلة 🚀</span>
            </button>

            <button
              onClick={() => sounds.speakDriverArrivedAlert(undefined, true, true)}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="تجربة تنبيه الوصول لموقع الزبون"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-700" />
              <span>الوصول 📍</span>
            </button>
          </div>

          {/* Driver Real GPS Toggle */}
          {onToggleDriverGps && (
            <button
              onClick={onToggleDriverGps}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isDriverGpsActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
              }`}
              title="بث موقع جهازك الحقيقي عبر GPS للزبائن"
            >
              <Radio className={`w-3.5 h-3.5 ${isDriverGpsActive ? 'animate-pulse' : ''}`} />
              <span>{isDriverGpsActive ? 'بث GPS نشط ومطابق لموقعك 🛰️' : 'تفعيل بث GPS الحقيقي 📍'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: RADAR & ACTIVE ORDERS (الرادار وشاشة استقبال الطلب مع مؤقت 15 ثانية) */}
      {activeDriverTab === 'radar' && (
        <div className="space-y-4">
          {/* 1. INCOMING RIDE REQUEST OFFER WITH 15s COUNTDOWN (شاشة استقبال الطلب بمؤقت 15 ثانية) */}
          {isIncomingOffer && activeRide && (
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-3xl text-slate-950 shadow-2xl border-4 border-amber-300 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                    <Radio className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-950">طلب زبون جديد في الأبيض سيدي الشيخ!</h4>
                    <p className="text-xs font-bold text-slate-900">سارع بالقبول قبل انتهاء المهلة المحددة</p>
                  </div>
                </div>

                {/* 15s Countdown badge */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center font-mono font-black text-lg shadow-lg border-2 border-amber-400 animate-pulse">
                    {requestCountdown}s
                  </div>
                  <span className="text-[10px] font-black text-slate-950 mt-0.5">مؤقت تنازلي</span>
                </div>
              </div>

              {/* Voice Alert Status Banner with Replay */}
              <div className="flex items-center justify-between bg-amber-950/10 backdrop-blur-sm border border-amber-950/20 px-3 py-2 rounded-2xl text-xs font-bold text-slate-950">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-400 text-slate-950">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  </span>
                  <div>
                    <span className="font-extrabold">تنبيه صوتي للسائق: </span>
                    <span className="font-medium text-slate-800">تم نطق موقع الزبون صوتياً 📢</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sounds.speakRideRequestAlert(activeRide.id, activeRide.pickupDistrict.nameAr, activeRide.dropoffDistrict.nameAr, true)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                  title="إعادة نطق موقع الزبون صوتياً"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>إعادة النطق 🔊</span>
                </button>
              </div>

              {/* Ride Details Card */}
              <div className="bg-white/95 rounded-2xl p-4 space-y-2.5 shadow-sm text-right">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    موقع الراكب (الانطلاق):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sounds.speakRideRequestAlert(activeRide.id, activeRide.pickupDistrict.nameAr, activeRide.dropoffDistrict.nameAr, true)}
                      className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer shadow-2xs"
                      title="استمع إلى موقع الزبون صوتياً"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                    </button>
                    <strong className="text-slate-900 text-sm font-extrabold">{activeRide.pickupDistrict.nameAr}</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    الوجهة المطلوبة:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sounds.speakArabic(`الوجهة المطلوبة إلى: ${activeRide.dropoffDistrict.nameAr}`)}
                      className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition cursor-pointer shadow-2xs"
                      title="استمع إلى الوجهة صوتياً"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-700" />
                    </button>
                    <strong className="text-slate-900 text-sm font-extrabold">{activeRide.dropoffDistrict.nameAr}</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">فئة السيارة المطلوبة:</span>
                  <span className="font-black text-slate-900">
                    {activeRide.serviceType === 'family' ? '🚐 عائلية' : activeRide.serviceType === 'comfort' ? '✨ فاخرة' : '🚕 اقتصادية'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">طريقة الدفع:</span>
                  <span className="font-bold text-emerald-800">
                    {activeRide.paymentMethod === 'cash' ? '💵 نقداً كاش (Cash)' : '💳 محفظة رقمية'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">التكلفة التقديرية للرحلة:</span>
                    <div className="text-[10px] text-slate-400">عمولة المنصة ({Math.round(walletStats.commissionRate * 100)}%): {formatDZD(Math.round(activeRide.estimatedPrice * walletStats.commissionRate))}</div>
                  </div>
                  <span className="text-amber-700 font-black text-xl">{formatDZD(activeRide.estimatedPrice)}</span>
                </div>
              </div>

              {/* Accept / Decline / Map Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <button
                  id="btn-driver-accept-ride"
                  onClick={() => onAcceptRide(activeRide.id)}
                  className="sm:col-span-2 py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>قبول الطلب فوراً ({requestCountdown}s) 🚕</span>
                </button>
                <button
                  onClick={() => onDeclineRide(activeRide.id)}
                  className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>رفض الطلب</span>
                </button>
                {onViewOnMap && (
                  <button
                    type="button"
                    onClick={onViewOnMap}
                    className="py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    title="فتح الخريطة لرؤية موقع الزبون بدقة"
                  >
                    <span>📍 الخارطة</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* When another driver accepted the ride */}
          {isOtherDriverAssigned && !isMyAssignedRide && (
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <span>ℹ️</span>
              <span>تم قبول طلب الزبون الأخير من طرف سائق آخر. بانتظار طلبات جديدة...</span>
            </div>
          )}

          {/* Empty State: Ready and waiting for customer orders */}
          {!isIncomingOffer && !isMyAssignedRide && currentDriver.isOnline && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-dashed border-amber-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xl">
                📡
              </div>
              <h4 className="font-black text-sm text-slate-800">
                الرادار نشط · في انتظار طلبات الركاب بالأبيض سيدي الشيخ
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عند قيام أي زبون بطلب تاكسي، ستظهر تفاصيله هنا وموقعه الجغرافي مع مؤقت 15 ثانية للقبول السريع.
              </p>

              {/* Driver Phone Privacy Toggle Card */}
              {onTogglePhoneVisibility && (
                <div className="mt-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-right">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentDriver.showPhoneToCustomer !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {currentDriver.showPhoneToCustomer !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900">إظهار أو إخفاء رقم الهاتف للزبائن</div>
                      <div className="text-[11px] text-slate-500">
                        {currentDriver.showPhoneToCustomer !== false
                          ? 'الرقم متاح للزبون للاتصال المباشر بك عند قبول الرحلة'
                          : 'الرقم محمي ومخفي عن الزبائن، ومتاح لإدارة المنظومة فقط'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onTogglePhoneVisibility}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                      currentDriver.showPhoneToCustomer !== false
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentDriver.showPhoneToCustomer !== false ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء الرقم 🔒</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار الرقم 👁️</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Offline notice */}
          {!currentDriver.isOnline && (
            <div className="bg-slate-100 rounded-2xl p-6 text-center space-y-2 text-slate-600">
              <Power className="w-10 h-10 mx-auto text-slate-400" />
              <h4 className="font-bold text-sm text-slate-800">أنت حالياً في الوضع الأوفلاين (غير متصل)</h4>
              <p className="text-xs text-slate-500">اضغط على زر "الاتصال" في الأعلى لبدء استقبال طلبات الركاب وتحقيق الأرباح.</p>
            </div>
          )}

          {/* 2. ACTIVE ASSIGNED RIDE: MUTUAL TRACKING & NAVIGATION (نظام الملاحة والتوجيه التلقائي عبر الخرائط) */}
          {isMyAssignedRide && (
            <div className="space-y-4">
              {/* Turn-by-Turn Voice Navigation HUD */}
              <NavigationVoiceHUD
                activeRide={activeRide}
                currentDriver={currentDriver}
                onDriverArrived={onDriverArrived}
                onStartTrip={onStartTrip}
                onCompleteTrip={handleComplete}
              />

              <div className="bg-white border-2 border-amber-500 p-5 rounded-3xl space-y-4 shadow-xl">
                {/* Mutual Tracking Banner */}
                <div className="bg-slate-950 text-white p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-black text-amber-300">
                      {activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arriving'
                        ? 'أنت في طريقك إلى الراكب'
                        : activeRide.status === 'driver_arrived'
                        ? 'وصلت إلى موقع الراكب'
                        : 'الرحلة جارية نحو الوجهة'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      موقعك وموقع الراكب يظهران لبعضكما على الخريطة مباشرة
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onViewOnMap && (
                    <button
                      onClick={onViewOnMap}
                      className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black hover:bg-amber-300 transition cursor-pointer"
                    >
                      🗺️ الخارطة
                    </button>
                  )}
                  <div className="bg-amber-500 text-slate-950 px-3 py-1 rounded-xl text-xs font-black">
                    {formatDZD(activeRide.estimatedPrice)}
                  </div>
                </div>
              </div>

              {/* Passenger Info & Direct Navigation Card */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-slate-900 text-sm">الراكب: {activeRide.customerName}</h5>
                    <p className="text-xs font-mono font-bold text-amber-900 mt-0.5" dir="ltr">
                      {activeRide.customerPhone}
                    </p>
                  </div>

                  <a
                    href={`tel:${activeRide.customerPhone.replace(/\s/g, '')}`}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالراكب</span>
                  </a>
                </div>

                {/* Locations and Google Maps Navigation Launchers (نظام الملاحة عبر خرائط جوجل) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-amber-200">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-700 font-bold block text-[10px]">🟢 موقع الراكب (الانطلاق)</span>
                      <span className="font-bold text-slate-800">{activeRide.pickupDistrict.nameAr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMapsNav(activeRide.pickupDistrict.lat, activeRide.pickupDistrict.lng, 'موقع الراكب')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      title="فتح التوجيه التلقائي عبر خرائط جوجل"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>ملاحة 🗺️</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between">
                    <div>
                      <span className="text-rose-700 font-bold block text-[10px]">🔴 الوجهة المطلوبة</span>
                      <span className="font-bold text-slate-800">{activeRide.dropoffDistrict.nameAr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleMapsNav(activeRide.dropoffDistrict.lat, activeRide.dropoffDistrict.lng, 'وجهة الوصول')}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      title="فتح التوجيه التلقائي نحو الوجهة"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>ملاحة 🗺️</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Step Buttons */}
              {(activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arriving') && (
                <button
                  id="btn-driver-confirm-arrived"
                  onClick={onDriverArrived}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>وصلت إلى موقع الراكب 📍</span>
                </button>
              )}

              {activeRide.status === 'driver_arrived' && (
                <button
                  id="btn-driver-start-trip"
                  onClick={onStartTrip}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>ركب الراكب - ابدأ الرحلة نحو الوجهة 🚀</span>
                </button>
              )}

              {activeRide.status === 'in_progress' && (
                <button
                  id="btn-driver-finish-trip"
                  onClick={handleComplete}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>إنهاء الرحلة وتحصيل {formatDZD(activeRide.estimatedPrice)} نقداً 💰</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {/* TAB 2: DRIVER WALLET & EARNINGS (WalletScreen - محفظة أرباح السائق اليومية والأسبوعية مع خصم عمولة المنصة تلقائياً) */}
      {activeDriverTab === 'wallet' && (
        <div className="animate-in fade-in">
          <WalletScreen
            currentDriver={currentDriver}
            pricingConfig={pricingConfig}
            onClose={() => setActiveDriverTab('radar')}
            onOpenTripHistory={() => setActiveDriverTab('history')}
          />
        </div>
      )}

      {/* TAB 3: TRIP HISTORY & EARNINGS BREAKDOWN (سجل الرحلات مع فلترة اليوم، الأسبوع، الشهر ورسم بياني للأرباح) */}
      {activeDriverTab === 'history' && (
        <div className="animate-in fade-in">
          <TripHistoryView
            currentDriver={currentDriver}
            pricingConfig={pricingConfig}
            onBackToRadar={() => setActiveDriverTab('radar')}
          />
        </div>
      )}

      {/* TAB 4: DOCUMENT UPLOAD & VERIFICATION (رفع الوثائق: رخصة السياقة، وثائق السيارة، والتأمين) */}
      {activeDriverTab === 'documents' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1 text-right">
            <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>فحص الوثائق وتفعيل حساب السائق</span>
            </h5>
            <p className="text-xs text-slate-600">
              لضمان سلامة الركاب وجودة الخدمة في ولاية البيض، يجب رفع الوثائق الأصلية ليتم اعتمادها من طرف إدارة المنظومة.
            </p>
          </div>

          {uploadNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>{uploadNotice}</span>
            </div>
          )}

          {/* Documents List */}
          <div className="space-y-3">
            {[
              { type: 'driving_license' as const, label: 'رخصة السياقة (Permis de conduire)', desc: 'الصنف ب ساري المفعول' },
              { type: 'car_registration' as const, label: 'البطاقة الرمادية للسيارة (Carte Grise)', desc: 'وثيقة ملكية أو عقد استغلال' },
              { type: 'insurance' as const, label: 'تأمين سيارة الأجرة (Assurance Taxi)', desc: 'عقد تأمين نقل الأشخاص ساري المفعول' },
              { type: 'professional_card' as const, label: 'دفتر المقاعد / رخصة الثقة', desc: 'الرخصة الصادرة عن مديرية النقل' },
            ].map(item => {
              const doc = driverDocuments.find(d => d.type === item.type);
              const isVerified = doc?.status === 'verified';
              const isPending = doc?.status === 'pending';

              return (
                <div
                  key={item.type}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {isVerified && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>معتمدة ومفعلة</span>
                      </span>
                    )}

                    {isPending && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>قيد المراجعة</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSimulateUpload(item.type, item.label)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      <span>{doc ? 'تحديث الملف' : 'رفع الوثيقة'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
