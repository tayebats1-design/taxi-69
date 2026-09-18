import React, { useState, useEffect, useMemo } from 'react';
import { RideRequest, Driver } from '../../types';
import { 
  evaluateNavigationStep, 
  navigationVoiceEngine, 
  NavigationStep 
} from '../../services/navigationVoice';
import { backgroundTracker } from '../../utils/backgroundTracker';
import { 
  Navigation, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  ExternalLink, 
  MapPin, 
  Phone, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Compass,
  Gauge,
  Clock,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowLeft,
  ShieldCheck,
  Radio
} from 'lucide-react';

interface NavigationVoiceHUDProps {
  activeRide: RideRequest;
  currentDriver: Driver;
  onDriverArrived?: () => void;
  onStartTrip?: () => void;
  onCompleteTrip?: () => void;
  onClose?: () => void;
}

export const NavigationVoiceHUD: React.FC<NavigationVoiceHUDProps> = ({
  activeRide,
  currentDriver,
  onDriverArrived,
  onStartTrip,
  onCompleteTrip,
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Enable Screen Wake Lock automatically during navigation
  useEffect(() => {
    backgroundTracker.enableWakeLock().then((active) => {
      setWakeLockActive(active);
    });

    return () => {
      // release wake lock when component unmounts
      backgroundTracker.disableWakeLock();
    };
  }, []);

  // Determine target: If driver hasn't arrived yet -> pickup location. If in progress -> dropoff location.
  const isEnRouteToPickup = activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arriving';
  const targetLat = isEnRouteToPickup ? activeRide.pickupDistrict.lat : activeRide.dropoffDistrict.lat;
  const targetLng = isEnRouteToPickup ? activeRide.pickupDistrict.lng : activeRide.dropoffDistrict.lng;
  const targetName = isEnRouteToPickup ? activeRide.pickupDistrict.nameAr : activeRide.dropoffDistrict.nameAr;

  // Calculate live navigation step
  const navStep: NavigationStep = useMemo(() => {
    const driverLat = currentDriver.currentLocation.lat;
    const driverLng = currentDriver.currentLocation.lng;
    const heading = currentDriver.currentLocation.heading || 0;
    const speed = currentDriver.currentLocation.speed || 28;

    return evaluateNavigationStep(
      driverLat,
      driverLng,
      targetLat,
      targetLng,
      targetName,
      heading,
      speed
    );
  }, [
    currentDriver.currentLocation.lat,
    currentDriver.currentLocation.lng,
    currentDriver.currentLocation.heading,
    currentDriver.currentLocation.speed,
    targetLat,
    targetLng,
    targetName,
  ]);

  // Feed step to voice engine on change
  useEffect(() => {
    navigationVoiceEngine.setVoiceEnabled(isVoiceEnabled);
    navigationVoiceEngine.processStepAndSpeak(navStep);
  }, [navStep, isVoiceEnabled]);

  const handleToggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    navigationVoiceEngine.setVoiceEnabled(nextState);
  };

  const handleRepeatVoice = () => {
    navigationVoiceEngine.processStepAndSpeak(navStep, true);
  };

  // Google Maps and Waze deep links
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${targetLat},${targetLng}&navigate=yes`;

  // Render turn icon
  const renderTurnIcon = () => {
    switch (navStep.turnType) {
      case 'arrived':
        return <MapPin className="w-8 h-8 text-emerald-400 animate-bounce" />;
      case 'straight':
        return <ArrowUp className="w-8 h-8 text-amber-400" />;
      case 'slight_right':
        return <ArrowUpRight className="w-8 h-8 text-amber-400" />;
      case 'right':
      case 'sharp_right':
        return <ArrowRight className="w-8 h-8 text-amber-400" />;
      case 'slight_left':
        return <ArrowUpLeft className="w-8 h-8 text-amber-400" />;
      case 'left':
      case 'sharp_left':
        return <ArrowLeft className="w-8 h-8 text-amber-400" />;
      case 'uturn':
        return <RotateCw className="w-8 h-8 text-rose-400" />;
      default:
        return <Navigation className="w-8 h-8 text-amber-400" />;
    }
  };

  return (
    <aside 
      aria-label="لوحة التوجيه الصوتي والملاحة للسائق"
      className="bg-slate-950 text-white rounded-3xl border-2 border-amber-400/80 shadow-2xl overflow-hidden transition-all duration-300 font-['Cairo',sans-serif]"
    >
      {/* Top Header Bar */}
      <div className="bg-slate-900/95 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
            🧭
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-2">
              <span>نظام الملاحة والتوجيه الصوتي للسائق</span>
              {wakeLockActive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  الشاشة نشطة (خلفية)
                </span>
              )}
            </div>
            <div className="text-[11px] text-amber-300 font-medium">
              {isEnRouteToPickup
                ? `التوجه نحو الزبون في: ${activeRide.pickupDistrict.nameAr}`
                : `التوجه نحو الوجهة: ${activeRide.dropoffDistrict.nameAr}`}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Voice Toggle */}
          <button
            id="btn-nav-toggle-voice"
            type="button"
            onClick={handleToggleVoice}
            className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
              isVoiceEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
            title={isVoiceEnabled ? 'كتم التوجيه الصوتي' : 'تشغيل التوجيه الصوتي'}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px]">
              {isVoiceEnabled ? 'صوتي 🔊' : 'مكتوم 🔇'}
            </span>
          </button>

          {/* Repeat Instruction Button */}
          <button
            id="btn-nav-repeat-voice"
            type="button"
            onClick={handleRepeatVoice}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            title="إعادة نطق التوجيه الحالي صوتياً"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Minimize / Maximize */}
          <button
            id="btn-nav-minimize"
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Instruction Display */}
      {!isMinimized && (
        <div className="p-4 space-y-3">
          {/* Active Navigation Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              {renderTurnIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-black text-white leading-snug">
                {navStep.instructionAr}
              </div>
              <div className="text-xs text-amber-300/90 font-semibold mt-0.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>توجيه GPS اللحظي دقيق · الأبيض سيدي الشيخ</span>
              </div>
            </div>
          </div>

          {/* Real-time HUD Metrics: Distance, ETA, Speed */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Distance */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>المسافة المتبقية</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5">
                {navStep.distanceMeters >= 1000
                  ? `${(navStep.distanceMeters / 1000).toFixed(1)} كم`
                  : `${navStep.distanceMeters} م`}
              </div>
            </div>

            {/* ETA */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>الوقت المقدر</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                ~ {navStep.etaMinutes} دقيقة
              </div>
            </div>

            {/* Speed */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>السرعة الحالية</span>
              </div>
              <div className="text-base sm:text-lg font-black text-cyan-400 font-mono mt-0.5">
                {currentDriver.currentLocation.speed || 28} <span className="text-[10px] font-normal">كم/س</span>
              </div>
            </div>
          </div>

          {/* External Map Deep Links */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              id="link-nav-google-maps"
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>🗺️</span>
              <span>فتح في Google Maps</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              id="link-nav-waze"
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>🚗</span>
              <span>فتح في Waze</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Customer Call Button if available */}
            {activeRide.customerPhone && (
              <a
                id="link-nav-call-customer"
                href={`tel:${activeRide.customerPhone}`}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بالزبون</span>
              </a>
            )}
          </div>

          {/* Quick Action Drivers Button */}
          <div className="pt-1">
            {isEnRouteToPickup && onDriverArrived && (
              <button
                id="btn-nav-driver-arrived"
                type="button"
                onClick={onDriverArrived}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
              >
                <CheckCircle className="w-5 h-5" />
                <span>لقد وصلت إلى موقع الزبون الآن 📍 (إشعار صوتي للزبون)</span>
              </button>
            )}

            {activeRide.status === 'driver_arrived' && onStartTrip && (
              <button
                id="btn-nav-start-trip"
                type="button"
                onClick={onStartTrip}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-400"
              >
                <Navigation className="w-5 h-5" />
                <span>ركب الزبون - بدء الرحلة نحو الوجهة 🚀</span>
              </button>
            )}

            {activeRide.status === 'in_progress' && onCompleteTrip && (
              <button
                id="btn-nav-complete-trip"
                type="button"
                onClick={onCompleteTrip}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
              >
                <CheckCircle className="w-5 h-5" />
                <span>إتمام الرحلة وتسليم الزبون وتحصيل {activeRide.estimatedPrice} دج ✅</span>
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
