import React, { useState } from 'react';
import { District, Driver, PricingConfig, RideRequest, VehicleCategory } from '../../types';
import { OFFICIAL_DISTRICTS } from '../../data/districts';
import { calculateDistanceKm, calculateFare, formatDZD } from '../../utils/distance';
import { 
  X, 
  MapPin, 
  Navigation, 
  Car, 
  Radio, 
  Locate, 
  Check, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

interface QuickRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupDistrict: District | null;
  userCoords: { lat: number; lng: number; accuracy?: number } | null;
  districts: District[];
  pricingConfig: PricingConfig;
  activeDriversCount: number;
  onRequestRide: (rideData: Omit<RideRequest, 'id' | 'createdAt' | 'status'>) => void;
  onLocateGps: () => void;
  isGpsActive?: boolean;
}

export const QuickRequestModal: React.FC<QuickRequestModalProps> = ({
  isOpen,
  onClose,
  pickupDistrict,
  userCoords,
  districts,
  pricingConfig,
  activeDriversCount,
  onRequestRide,
  onLocateGps,
  isGpsActive,
}) => {
  const [selectedDropoff, setSelectedDropoff] = useState<District | null>(null);
  const [customerName, setCustomerName] = useState('زبون تاكسي');
  const [serviceType, setServiceType] = useState<VehicleCategory>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Determine current effective pickup
  const effectivePickup: District = pickupDistrict || (userCoords ? {
    id: 'user-gps-pickup',
    nameAr: 'موقعي المباشر الحالي (GPS)',
    nameFr: 'Position GPS Actuelle',
    lat: userCoords.lat,
    lng: userCoords.lng,
    category: 'residential',
  } : districts[0]);

  // If no dropoff chosen, provide default destination option
  const effectiveDropoff: District = selectedDropoff || districts.find(d => d.id !== effectivePickup.id) || districts[1] || districts[0];

  const distanceKm = calculateDistanceKm(
    effectivePickup.lat,
    effectivePickup.lng,
    effectiveDropoff.lat,
    effectiveDropoff.lng
  );

  const estimatedMinutes = Math.max(3, Math.round(distanceKm * 2.5));
  const estimatedPrice = calculateFare(distanceKm, pricingConfig, serviceType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestRide({
      customerId: `cust-${Date.now()}`,
      customerName: customerName.trim() || 'زبون تاكسي',
      pickupDistrict: effectivePickup,
      dropoffDistrict: effectiveDropoff,
      distanceKm,
      estimatedMinutes,
      estimatedPrice,
      serviceType,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-['Cairo',sans-serif] max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-black shadow-md">
              🚕
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>طلب تاكسي فوري بموقعك المباشر</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-[11px] text-amber-300 font-medium">
                يتم إرسال إحداثيات GPS الخاصة بك مباشرة إلى ({activeDriversCount}) سائق متصل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* GPS Live Pickup Status Box */}
          <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                <span className="p-1 rounded-lg bg-emerald-600 text-white">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </span>
                <span>نقطة الانطلاق (موقعك المباشر GPS)</span>
              </div>

              <button
                type="button"
                onClick={onLocateGps}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="تحديث إحداثيات الـ GPS الآن"
              >
                <Locate className="w-3 h-3" />
                <span>تحديث GPS</span>
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🟢</span>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    {effectivePickup.nameAr}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono" dir="ltr">
                    {effectivePickup.lat.toFixed(5)}, {effectivePickup.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[10px] font-black border border-emerald-300">
                🛰️ دقيق
              </span>
            </div>
          </div>

          {/* Quick Destination Picker */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>🔴</span>
                <span>اختر وجهتك المقصودة:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                (أو اختر وجهة عامة بالعداد)
              </span>
            </label>

            {/* Quick Destination Chips */}
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
              {districts.map((d) => {
                const isSelected = selectedDropoff?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDropoff(d)}
                    className={`p-2 rounded-xl text-right text-xs font-bold transition border cursor-pointer flex items-center justify-between gap-1 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-black shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{d.nameAr}</span>
                    {isSelected && <span className="text-rose-600 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Category & Payment Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">فئة التاكسي:</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setServiceType('standard')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                    serviceType === 'standard'
                      ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  اقتصادية 🚗
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('comfort')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                    serviceType === 'comfort'
                      ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  مكيفة ❄️
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">طريقة الدفع:</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  💵 نقداً
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                    paymentMethod === 'wallet'
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  💳 رصيد
                </button>
              </div>
            </div>
          </div>

          {/* Quick Contact & Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">اسم الراكب:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-emerald-600"
                placeholder="اسمك الكريم"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">ملاحظة للسائق (اختياري):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-emerald-600"
                placeholder="مثال: بجانب الصيدلية المركزية..."
              />
            </div>
          </div>

          {/* Estimated Fare & Distance Summary */}
          <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between border border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">المسافة والوقت التقريبي</div>
              <div className="text-xs font-bold text-slate-200">
                {distanceKm.toFixed(1)} كم · حوالي {estimatedMinutes} دقائق
              </div>
            </div>

            <div className="text-left">
              <div className="text-[11px] text-amber-300 font-bold">الأجرة المتوقعة</div>
              <div className="text-lg font-black text-amber-400">
                {formatDZD(estimatedPrice)}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            id="btn-confirm-quick-ride"
            className="w-full py-4 bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Send className="w-4 h-4 text-slate-950" />
            <span>إرسال الطلب وعرض موقعي لجميع السائقين الآن 🚕</span>
          </button>
        </form>
      </div>
    </div>
  );
};
