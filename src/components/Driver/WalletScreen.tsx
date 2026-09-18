import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Percent, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  Info, 
  ChevronRight, 
  Filter, 
  Sparkles, 
  Banknote,
  History
} from 'lucide-react';
import { Driver, PricingConfig, DriverEarningRecord } from '../../types';

interface WalletScreenProps {
  currentDriver: Driver;
  pricingConfig: PricingConfig;
  onClose?: () => void;
  onOpenTripHistory?: () => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  currentDriver,
  pricingConfig,
  onClose,
  onOpenTripHistory,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'all'>('today');

  // Effective commission rate from PricingConfig (fallback to 15%)
  const commissionRate = typeof pricingConfig.platformCommissionRate === 'number' 
    ? pricingConfig.platformCommissionRate 
    : 0.15;
  const commissionPercent = Math.round(commissionRate * 100);

  // Generate or read realistic earning history records for El Abiodh Sidi Cheikh
  const historyRecords = useMemo<DriverEarningRecord[]>(() => {
    if (currentDriver.wallet?.history && currentDriver.wallet.history.length > 0) {
      return currentDriver.wallet.history;
    }

    const now = Date.now();
    const oneDay = 86400000;
    
    // Default initial realistic trips for this driver
    const trips = [
      {
        id: 'earn-1',
        rideId: 'ride-101',
        timestamp: now - 1000 * 60 * 45, // 45 min ago (today)
        pickupName: 'حي الزاوية الشيخية',
        dropoffName: 'مستشفى الأبيض سيدي الشيخ',
        grossFare: 300,
        distanceKm: 3.2,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-2',
        rideId: 'ride-102',
        timestamp: now - 1000 * 60 * 180, // 3 hours ago (today)
        pickupName: 'حي 200 مسكن',
        dropoffName: 'السوق الأسبوعي ومحطة المسافرين',
        grossFare: 250,
        distanceKm: 2.5,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-3',
        rideId: 'ride-103',
        timestamp: now - 1000 * 60 * 360, // 6 hours ago (today)
        pickupName: 'حي أول نوفمبر',
        dropoffName: 'ثانوية الشيخ بوعمامة',
        grossFare: 200,
        distanceKm: 1.8,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-4',
        rideId: 'ride-104',
        timestamp: now - oneDay * 1.5, // 1.5 days ago (this week)
        pickupName: 'حي النصر',
        dropoffName: 'مقر بلدية الأبيض سيدي الشيخ',
        grossFare: 350,
        distanceKm: 4.1,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-5',
        rideId: 'ride-105',
        timestamp: now - oneDay * 2.8, // 3 days ago (this week)
        pickupName: 'حي المجاهدين',
        dropoffName: 'محطة نقل المسافرين',
        grossFare: 250,
        distanceKm: 2.6,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-6',
        rideId: 'ride-106',
        timestamp: now - oneDay * 4, // 4 days ago (this week)
        pickupName: 'حي القصر القديم',
        dropoffName: 'المركز الصحي الحضري',
        grossFare: 280,
        distanceKm: 2.9,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'earn-7',
        rideId: 'ride-107',
        timestamp: now - oneDay * 5.5, // 5.5 days ago (this week)
        pickupName: 'حي المستقبل',
        dropoffName: 'المركب الرياضي الجواري',
        grossFare: 320,
        distanceKm: 3.5,
        paymentMethod: 'cash' as const,
      }
    ];

    return trips.map(t => {
      const commDeducted = Math.round(t.grossFare * commissionRate);
      const netEarnings = t.grossFare - commDeducted;
      return {
        ...t,
        platformCommissionPercent: commissionPercent,
        platformCommissionDeducted: commDeducted,
        netDriverEarnings: netEarnings,
      };
    });
  }, [currentDriver.wallet?.history, commissionRate, commissionPercent]);

  // Split calculations into Today and Week
  const { todayGross, todayCommission, todayNet, todayCount } = useMemo(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayRecords = historyRecords.filter(r => r.timestamp >= todayMidnight.getTime());
    
    const gross = todayRecords.reduce((sum, r) => sum + r.grossFare, 0);
    const comm = todayRecords.reduce((sum, r) => sum + r.platformCommissionDeducted, 0);
    const net = todayRecords.reduce((sum, r) => sum + r.netDriverEarnings, 0);
    return {
      todayGross: gross,
      todayCommission: comm,
      todayNet: net,
      todayCount: todayRecords.length
    };
  }, [historyRecords]);

  const { weekGross, weekCommission, weekNet, weekCount } = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const weekRecords = historyRecords.filter(r => r.timestamp >= oneWeekAgo);

    const gross = weekRecords.reduce((sum, r) => sum + r.grossFare, 0);
    const comm = weekRecords.reduce((sum, r) => sum + r.platformCommissionDeducted, 0);
    const net = weekRecords.reduce((sum, r) => sum + r.netDriverEarnings, 0);
    return {
      weekGross: gross,
      weekCommission: comm,
      weekNet: net,
      weekCount: weekRecords.length
    };
  }, [historyRecords]);

  // Filtered table records
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    if (filterPeriod === 'today') {
      return historyRecords.filter(r => r.timestamp >= todayMidnight.getTime());
    }
    if (filterPeriod === 'week') {
      return historyRecords.filter(r => r.timestamp >= (now - 7 * 86400000));
    }
    return historyRecords;
  }, [historyRecords, filterPeriod]);

  const formatDZD = (amount: number) => {
    return `${amount.toLocaleString('ar-DZ')} دج`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="bg-slate-50 text-slate-900 rounded-3xl p-4 md:p-6 space-y-6 font-['Cairo',sans-serif] border-2 border-amber-400 shadow-2xl animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md">
            <Wallet className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">
                محفظة أرباح السائق (WalletScreen)
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                حساب مفعل
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              الكابتن: {currentDriver.name} · سيارة: {currentDriver.carModel} ({currentDriver.plateNumber})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTripHistory && (
            <button
              onClick={onOpenTripHistory}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-500/40"
            >
              <History className="w-4 h-4" />
              <span>عرض سجل الرحلات التفصيلي</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الرجوع للرادار</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Net Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-400" />
              الرصيد الصافي المتاح للسحب والاستلام:
            </span>
            <div className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>عمولة المنصة: {commissionPercent}% مستقطعة تلقائياً</span>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-black text-amber-400 font-mono tracking-tight">
              {formatDZD(currentDriver.wallet?.balance || (weekNet + 4500))}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              (صافي مستحقاتك بعد خصم عمولة المنصة)
            </span>
          </div>

          {/* PricingConfig Notice Banner */}
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                يتم حساب دخل السائق واقتطاع نسبة عمولة المنصة (<strong className="text-amber-300">{commissionPercent}%</strong>) تلقائياً من تسعيرة كل رحلة معتمدة في <strong className="text-white">PricingConfig</strong>.
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                المعادلة المطبقة: صافي الربح = الأجرة الإجمالية - (الأجرة الإجمالية × {commissionPercent}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily & Weekly Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Earnings Card */}
        <div className="bg-amber-50/80 border-2 border-amber-300/80 p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">أرباح اليوم (اليومية)</h4>
                <p className="text-[11px] text-slate-600">{todayCount} رحلات مكتملة اليوم</p>
              </div>
            </div>
            <span className="text-xs font-black bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-xl">
              اليوم
            </span>
          </div>

          <div className="pt-2 border-t border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">إجمالي الأجرة المحصلة:</span>
              <span className="font-mono font-bold text-slate-900">{formatDZD(todayGross)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-red-600">
              <span className="font-bold flex items-center gap-1">
                <span>عمولة المنصة ({commissionPercent}%):</span>
              </span>
              <span className="font-mono font-bold">-{formatDZD(todayCommission)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-amber-300 text-sm font-black text-slate-950">
              <span className="text-emerald-800">صافي ربحك اليوم:</span>
              <span className="text-emerald-700 font-mono text-lg">{formatDZD(todayNet)}</span>
            </div>
          </div>
        </div>

        {/* Weekly Earnings Card */}
        <div className="bg-slate-100/90 border-2 border-slate-300 p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">أرباح الأسبوع (الأسبوعية)</h4>
                <p className="text-[11px] text-slate-600">{weekCount} رحلات مكتملة آخر 7 أيام</p>
              </div>
            </div>
            <span className="text-xs font-black bg-slate-200 text-slate-800 px-2.5 py-1 rounded-xl">
              هذا الأسبوع
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">إجمالي الأجرة الأسبوعية:</span>
              <span className="font-mono font-bold text-slate-900">{formatDZD(weekGross)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-red-600">
              <span className="font-bold">عمولة المنصة ({commissionPercent}%):</span>
              <span className="font-mono font-bold">-{formatDZD(weekCommission)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-300 text-sm font-black text-slate-950">
              <span className="text-emerald-800">صافي ربحك الأسبوعي:</span>
              <span className="text-emerald-700 font-mono text-lg">{formatDZD(weekNet)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trips & Transactions History */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-950">
              سجل الرحلات والأرباح المستقطعة
            </h3>
            <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
              {filteredRecords.length} رحلة
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterPeriod === 'today'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              رحلات اليوم
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterPeriod === 'week'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterPeriod === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              كل السجل
            </button>
          </div>
        </div>

        {/* List of Trip Earnings */}
        <div className="space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              لا توجد رحلات مسجلة في هذه الفترة المحددة.
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400/80 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
              >
                {/* Trip Route Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-black text-sm text-slate-950">
                      {record.pickupName}
                    </span>
                    <span className="text-slate-400 text-xs">←</span>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-black text-sm text-slate-950">
                      {record.dropoffName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 font-semibold">
                    <span>{formatDate(record.timestamp)} الساعة {formatTime(record.timestamp)}</span>
                    {record.distanceKm && <span>· المسافة: {record.distanceKm} كم</span>}
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px]">
                      {record.paymentMethod === 'cash' ? '💵 نقداً كاش' : '💳 محفظة'}
                    </span>
                  </div>
                </div>

                {/* Earnings Breakdown */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <div className="text-left">
                    <div className="text-[11px] text-slate-500">الأجرة الإجمالية:</div>
                    <div className="font-mono font-bold text-slate-800 text-xs">
                      {formatDZD(record.grossFare)}
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-[11px] text-red-500">عمولة المنصة (-{record.platformCommissionPercent}%):</div>
                    <div className="font-mono font-bold text-red-600 text-xs">
                      -{formatDZD(record.platformCommissionDeducted)}
                    </div>
                  </div>

                  <div className="text-left bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 font-bold">صافي دخل السائق:</div>
                    <div className="font-mono font-black text-emerald-700 text-sm">
                      +{formatDZD(record.netDriverEarnings)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
