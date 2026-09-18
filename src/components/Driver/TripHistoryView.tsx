import React, { useState, useMemo } from 'react';
import { 
  History, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Filter, 
  ArrowUpRight, 
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ArrowDownLeft,
  Search
} from 'lucide-react';
import { Driver, PricingConfig, DriverEarningRecord } from '../../types';

export interface TripHistoryViewProps {
  currentDriver: Driver;
  pricingConfig: PricingConfig;
  onBackToRadar?: () => void;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

export const TripHistoryView: React.FC<TripHistoryViewProps> = ({
  currentDriver,
  pricingConfig,
  onBackToRadar,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('today');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'wallet'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Platform commission
  const commissionRate = typeof pricingConfig.platformCommissionRate === 'number' 
    ? pricingConfig.platformCommissionRate 
    : 0.15;
  const commissionPercent = Math.round(commissionRate * 100);

  // Generate or retrieve realistic historical trips for this driver in El Abiodh Sidi Cheikh
  const allRecords = useMemo<DriverEarningRecord[]>(() => {
    if (currentDriver.wallet?.history && currentDriver.wallet.history.length > 0) {
      return currentDriver.wallet.history;
    }

    const now = Date.now();
    const oneHour = 3600 * 1000;
    const oneDay = 86400 * 1000;

    // Seed realistic trips across today, this week, and this month
    const mockTrips = [
      // Today trips
      {
        id: 'hist-1',
        rideId: 'dz-3201',
        timestamp: now - oneHour * 0.8,
        pickupName: 'حي الزاوية الشيخية',
        dropoffName: 'مستشفى الأبيض سيدي الشيخ',
        grossFare: 300,
        distanceKm: 3.2,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-2',
        rideId: 'dz-3202',
        timestamp: now - oneHour * 2.5,
        pickupName: 'حي 200 مسكن',
        dropoffName: 'السوق الأسبوعي ومحطة المسافرين',
        grossFare: 250,
        distanceKm: 2.4,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-3',
        rideId: 'dz-3203',
        timestamp: now - oneHour * 5,
        pickupName: 'حي أول نوفمبر',
        dropoffName: 'ثانوية الشيخ بوعمامة',
        grossFare: 200,
        distanceKm: 1.9,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-4',
        rideId: 'dz-3204',
        timestamp: now - oneHour * 7.5,
        pickupName: 'حي النصر',
        dropoffName: 'المركز البريدي الرئيسي',
        grossFare: 220,
        distanceKm: 2.1,
        paymentMethod: 'wallet' as const,
      },
      // Earlier this week (days 1 to 6)
      {
        id: 'hist-5',
        rideId: 'dz-3205',
        timestamp: now - oneDay * 1.2,
        pickupName: 'حي المجاهدين',
        dropoffName: 'مقر بلدية الأبيض سيدي الشيخ',
        grossFare: 350,
        distanceKm: 4.2,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-6',
        rideId: 'dz-3206',
        timestamp: now - oneDay * 2.1,
        pickupName: 'حي القصر القديم',
        dropoffName: 'المركز الصحي الحضري',
        grossFare: 280,
        distanceKm: 3.0,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-7',
        rideId: 'dz-3207',
        timestamp: now - oneDay * 3.4,
        pickupName: 'حي المستقبل',
        dropoffName: 'المركب الرياضي الجواري',
        grossFare: 320,
        distanceKm: 3.6,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-8',
        rideId: 'dz-3208',
        timestamp: now - oneDay * 4.2,
        pickupName: 'محطة نقل المسافرين',
        dropoffName: 'حي عين الجديد',
        grossFare: 380,
        distanceKm: 4.5,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-9',
        rideId: 'dz-3209',
        timestamp: now - oneDay * 5.6,
        pickupName: 'حي السلام',
        dropoffName: 'مستشفى 60 سرير الجديد',
        grossFare: 300,
        distanceKm: 3.1,
        paymentMethod: 'wallet' as const,
      },
      // Earlier this month (days 8 to 28)
      {
        id: 'hist-10',
        rideId: 'dz-3210',
        timestamp: now - oneDay * 9,
        pickupName: 'المنطقة الحرفية والتجارية',
        dropoffName: 'حي الزاوية العتيقة',
        grossFare: 400,
        distanceKm: 5.2,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-11',
        rideId: 'dz-3211',
        timestamp: now - oneDay * 13,
        pickupName: 'مفترق طرق عين العراك',
        dropoffName: 'حي 200 مسكن',
        grossFare: 450,
        distanceKm: 6.0,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-12',
        rideId: 'dz-3212',
        timestamp: now - oneDay * 17,
        pickupName: 'حي المطار الزراعي',
        dropoffName: 'مقر الدائرة والبلدية',
        grossFare: 500,
        distanceKm: 6.8,
        paymentMethod: 'cash' as const,
      },
      {
        id: 'hist-13',
        rideId: 'dz-3213',
        timestamp: now - oneDay * 22,
        pickupName: 'حي الشيخ بوعمامة',
        dropoffName: 'محطة سيارات الأجرة مابين الولايات',
        grossFare: 350,
        distanceKm: 4.0,
        paymentMethod: 'wallet' as const,
      },
      {
        id: 'hist-14',
        rideId: 'dz-3214',
        timestamp: now - oneDay * 26,
        pickupName: 'حي الوئام',
        dropoffName: 'سوق الماشية',
        grossFare: 420,
        distanceKm: 5.4,
        paymentMethod: 'cash' as const,
      }
    ];

    return mockTrips.map(t => {
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

  // Timestamps for filtering
  const timeThresholds = useMemo(() => {
    const now = new Date();
    
    // Today: starting from 00:00:00 of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Week: 7 days ago
    const startOfWeek = Date.now() - 7 * 86400 * 1000;

    // Month: 30 days ago
    const startOfMonth = Date.now() - 30 * 86400 * 1000;

    return { startOfToday, startOfWeek, startOfMonth };
  }, []);

  // Filter records by period
  const periodRecords = useMemo(() => {
    if (selectedPeriod === 'today') {
      return allRecords.filter(r => r.timestamp >= timeThresholds.startOfToday);
    }
    if (selectedPeriod === 'week') {
      return allRecords.filter(r => r.timestamp >= timeThresholds.startOfWeek);
    }
    if (selectedPeriod === 'month') {
      return allRecords.filter(r => r.timestamp >= timeThresholds.startOfMonth);
    }
    return allRecords;
  }, [allRecords, selectedPeriod, timeThresholds]);

  // Secondary filter: search & payment method
  const filteredRecords = useMemo(() => {
    return periodRecords.filter(record => {
      const matchesPayment = paymentFilter === 'all' || record.paymentMethod === paymentFilter;
      const matchesSearch = !searchQuery.trim() || 
        record.pickupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.dropoffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.rideId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPayment && matchesSearch;
    });
  }, [periodRecords, paymentFilter, searchQuery]);

  // Statistics calculation for the selected period
  const stats = useMemo(() => {
    const totalGross = periodRecords.reduce((acc, r) => acc + r.grossFare, 0);
    const totalCommission = periodRecords.reduce((acc, r) => acc + r.platformCommissionDeducted, 0);
    const totalNet = periodRecords.reduce((acc, r) => acc + r.netDriverEarnings, 0);
    const totalDistance = periodRecords.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
    const count = periodRecords.length;
    const avgFare = count > 0 ? Math.round(totalGross / count) : 0;
    const avgNet = count > 0 ? Math.round(totalNet / count) : 0;

    return {
      totalGross,
      totalCommission,
      totalNet,
      totalDistance: Math.round(totalDistance * 10) / 10,
      count,
      avgFare,
      avgNet
    };
  }, [periodRecords]);

  // Generate chart data intervals based on selected period
  const chartData = useMemo(() => {
    const now = Date.now();
    const oneHour = 3600 * 1000;
    const oneDay = 86400 * 1000;

    if (selectedPeriod === 'today') {
      // 5 slots: الصباح الباكر (06-09), الظهيرة (09-13), بعد الزوال (13-17), المساء (17-21), الليل (21-00)
      const slots = [
        { label: 'الصباح', rangeStart: 6, rangeEnd: 10, earnings: 0, count: 0 },
        { label: 'الظهيرة', rangeStart: 10, rangeEnd: 14, earnings: 0, count: 0 },
        { label: 'العصر', rangeStart: 14, rangeEnd: 18, earnings: 0, count: 0 },
        { label: 'المساء', rangeStart: 18, rangeEnd: 22, earnings: 0, count: 0 },
        { label: 'الليل', rangeStart: 22, rangeEnd: 24, earnings: 0, count: 0 },
      ];

      periodRecords.forEach(r => {
        const hour = new Date(r.timestamp).getHours();
        const slot = slots.find(s => hour >= s.rangeStart && hour < s.rangeEnd) || slots[0];
        slot.earnings += r.netDriverEarnings;
        slot.count += 1;
      });

      return slots.map(s => ({
        label: s.label,
        subLabel: `${s.count} رحلات`,
        earnings: s.earnings,
        count: s.count,
      }));
    }

    if (selectedPeriod === 'week') {
      // Last 7 days
      const days: { label: string; dateStart: number; dateEnd: number; earnings: number; count: number }[] = [];
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * oneDay);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + oneDay;
        const name = i === 0 ? 'اليوم' : dayNames[d.getDay()];
        days.push({ label: name, dateStart: dayStart, dateEnd: dayEnd, earnings: 0, count: 0 });
      }

      periodRecords.forEach(r => {
        const day = days.find(d => r.timestamp >= d.dateStart && r.timestamp < d.dateEnd);
        if (day) {
          day.earnings += r.netDriverEarnings;
          day.count += 1;
        }
      });

      return days.map(d => ({
        label: d.label,
        subLabel: `${d.count} رحلة`,
        earnings: d.earnings,
        count: d.count,
      }));
    }

    if (selectedPeriod === 'month') {
      // 4 Weeks of the month
      const weeks = [
        { label: 'الأسبوع 1', start: now - 28 * oneDay, end: now - 21 * oneDay, earnings: 0, count: 0 },
        { label: 'الأسبوع 2', start: now - 21 * oneDay, end: now - 14 * oneDay, earnings: 0, count: 0 },
        { label: 'الأسبوع 3', start: now - 14 * oneDay, end: now - 7 * oneDay, earnings: 0, count: 0 },
        { label: 'هذا الأسبوع', start: now - 7 * oneDay, end: now + oneDay, earnings: 0, count: 0 },
      ];

      periodRecords.forEach(r => {
        const week = weeks.find(w => r.timestamp >= w.start && r.timestamp < w.end);
        if (week) {
          week.earnings += r.netDriverEarnings;
          week.count += 1;
        }
      });

      return weeks.map(w => ({
        label: w.label,
        subLabel: `${w.count} رحلة`,
        earnings: w.earnings,
        count: w.count,
      }));
    }

    // Default for 'all'
    return [
      { label: 'اليوم', subLabel: '', earnings: allRecords.filter(r => r.timestamp >= timeThresholds.startOfToday).reduce((s, r) => s + r.netDriverEarnings, 0), count: 0 },
      { label: 'هذا الأسبوع', subLabel: '', earnings: allRecords.filter(r => r.timestamp >= timeThresholds.startOfWeek).reduce((s, r) => s + r.netDriverEarnings, 0), count: 0 },
      { label: 'هذا الشهر', subLabel: '', earnings: allRecords.filter(r => r.timestamp >= timeThresholds.startOfMonth).reduce((s, r) => s + r.netDriverEarnings, 0), count: 0 },
    ];
  }, [selectedPeriod, periodRecords, allRecords, timeThresholds]);

  // Max earning value in chart for relative height scaling
  const maxChartVal = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.earnings), 1);
    return max;
  }, [chartData]);

  const formatDZD = (amount: number) => {
    return `${amount.toLocaleString('ar-DZ')} دج`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-DZ', { 
      month: 'short', 
      day: 'numeric', 
      weekday: 'short' 
    });
  };

  return (
    <div id="trip-history-container" className="bg-slate-50 text-slate-900 rounded-3xl p-4 md:p-6 space-y-6 font-['Cairo',sans-serif] border-2 border-amber-400 shadow-xl animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-amber-500/40 shrink-0">
            <History className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">
                سجل الرحلات والأرباح (Trip History)
              </h2>
              <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                ولاية البيض · 32
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              الكابتن: {currentDriver.name} · سيارة: {currentDriver.carModel} ({currentDriver.plateNumber})
            </p>
          </div>
        </div>

        {onBackToRadar && (
          <button
            id="back-to-radar-btn"
            onClick={onBackToRadar}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ChevronRight className="w-4 h-4 text-amber-400" />
            <span>الرجوع إلى شاشة الرادار</span>
          </button>
        )}
      </div>

      {/* Date Filter Tabs (اليوم، الأسبوع، الشهر، الكل) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>تصفية الرحلات حسب الفترة الزمنية:</span>
          </label>
          <span className="text-xs text-slate-500 font-bold">
            عدد الرحلات: <strong className="text-slate-900">{periodRecords.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 bg-slate-200/90 p-1.5 rounded-2xl">
          <button
            id="filter-period-today"
            onClick={() => setSelectedPeriod('today')}
            className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedPeriod === 'today'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>اليوم</span>
          </button>

          <button
            id="filter-period-week"
            onClick={() => setSelectedPeriod('week')}
            className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedPeriod === 'week'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>هذا الأسبوع</span>
          </button>

          <button
            id="filter-period-month"
            onClick={() => setSelectedPeriod('month')}
            className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedPeriod === 'month'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>هذا الشهر</span>
          </button>

          <button
            id="filter-period-all"
            onClick={() => setSelectedPeriod('all')}
            className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedPeriod === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <span>كل السجل</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Earnings */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>صافي ربح السائق</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-tight">
            {formatDZD(stats.totalNet)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            بعد خصم عمولة المنصة ({commissionPercent}%)
          </p>
        </div>

        {/* Gross Fare */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>إجمالي الأجرة المحصلة</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 font-mono">
            {formatDZD(stats.totalGross)}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            المبلغ المستلم كلياً من الركاب
          </p>
        </div>

        {/* Platform Commission Deducted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-red-500 font-bold">
            <span>عمولة المنصة ({commissionPercent}%)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 font-mono font-bold">
              مستقطعة
            </span>
          </div>
          <div className="text-xl md:text-2xl font-black text-red-600 font-mono">
            -{formatDZD(stats.totalCommission)}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            رسوم الصيانة وتشغيل الخوادم
          </p>
        </div>

        {/* Trips and Distance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>الرحلات والمسافات</span>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
            <span>{stats.count}</span>
            <span className="text-xs text-slate-500 font-normal">رحلة</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-base text-blue-600 font-bold">{stats.totalDistance}</span>
            <span className="text-xs text-slate-500 font-normal">كم</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            معدل الأجرة: {formatDZD(stats.avgFare)} / رحلة
          </p>
        </div>
      </div>

      {/* Visual Chart Component (مكون رسوم بيانية بسيط لتوزيع إجمالي الأرباح) */}
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                مخطط الأرباح البياني ({selectedPeriod === 'today' ? 'أرباح اليوم بالساعات' : selectedPeriod === 'week' ? 'أرباح أيام الأسبوع' : 'أرباح أسابيع الشهر'})
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                توزيع بياني لصافي الأرباح المحققة في كل فترة زمنية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-bold text-slate-600">
              <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" />
              صافي الربح
            </span>
          </div>
        </div>

        {/* Responsive Bar Chart Visualizer */}
        <div className="pt-4 pb-2 px-2 bg-slate-50/80 rounded-2xl border border-slate-100">
          <div className="flex items-end justify-between gap-2 md:gap-4 h-44 md:h-52 px-2">
            {chartData.map((item, idx) => {
              const heightPercent = maxChartVal > 0 ? Math.max(Math.round((item.earnings / maxChartVal) * 100), 8) : 8;
              const isZero = item.earnings === 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg pointer-events-none whitespace-nowrap z-20">
                    <div>{item.label}: <span className="text-amber-400 font-mono font-black">{formatDZD(item.earnings)}</span></div>
                    {item.subLabel && <div className="text-[9px] text-slate-400">{item.subLabel}</div>}
                  </div>

                  {/* Value Above Bar */}
                  <div className="text-[10px] md:text-xs font-mono font-bold text-slate-700 mb-1.5">
                    {item.earnings > 0 ? formatDZD(item.earnings) : '—'}
                  </div>

                  {/* The Bar */}
                  <div className="w-full max-w-[48px] bg-slate-200/80 rounded-t-xl overflow-hidden flex items-end relative" style={{ height: '70%' }}>
                    <div
                      className={`w-full transition-all duration-500 ease-out rounded-t-xl relative ${
                        isZero 
                          ? 'bg-slate-300' 
                          : 'bg-gradient-to-t from-amber-500 via-amber-400 to-amber-300 shadow-sm'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {!isZero && (
                        <div className="absolute inset-x-0 top-0 h-1 bg-amber-200/90" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Labels */}
                  <div className="mt-2 text-center">
                    <span className="text-xs font-black text-slate-800 block">
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trips Table & Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <span>قائمة تفاصيل الرحلات</span>
              <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                {filteredRecords.length} رحلة
              </span>
            </h3>
          </div>

          {/* Quick Filter: Search & Payment Method */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالحي أو الرمز..."
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 w-36 md:w-48"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            {/* Payment Method Pills */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'all'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setPaymentFilter('cash')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'cash'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                نقداً 💵
              </button>
              <button
                onClick={() => setPaymentFilter('wallet')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paymentFilter === 'wallet'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                محفظة 💳
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Trips List */}
        <div className="space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-sm space-y-2">
              <p className="font-bold">لا توجد رحلات مسجلة في هذا النطاق الزمني أو معايير البحث.</p>
              <p className="text-xs text-slate-400">جرب تغيير الفترة (اليوم، الأسبوع، الشهر) أو إفراغ خانة البحث.</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400/80 transition-colors shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
              >
                {/* Route Information */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      #{record.rideId}
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{record.pickupName}</span>
                      <span className="text-slate-400 text-xs px-1">←</span>
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span>{record.dropoffName}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(record.timestamp)} الساعة {formatTime(record.timestamp)}</span>
                    </span>
                    {record.distanceKm && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{record.distanceKm} كم</span>
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {record.paymentMethod === 'cash' ? '💵 نقداً كاش' : '💳 دفع رقمي / محفظة'}
                    </span>
                  </div>
                </div>

                {/* Pricing & Net Breakdown */}
                <div className="flex items-center justify-between md:justify-end gap-3 md:gap-5 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                  <div className="text-left">
                    <div className="text-[10px] text-slate-500 font-bold">الأجرة الإجمالية:</div>
                    <div className="font-mono font-bold text-slate-800 text-xs">
                      {formatDZD(record.grossFare)}
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-[10px] text-red-500 font-bold">عمولة (-{record.platformCommissionPercent}%):</div>
                    <div className="font-mono font-bold text-red-600 text-xs">
                      -{formatDZD(record.platformCommissionDeducted)}
                    </div>
                  </div>

                  <div className="text-left bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 font-bold">صافي الربح:</div>
                    <div className="font-mono font-black text-emerald-700 text-sm md:text-base">
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
