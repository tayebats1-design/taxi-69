import React, { useState } from 'react';
import { District, Driver, PricingConfig, RideRequest, DriverDocument } from '../../types';
import { OFFICIAL_DISTRICTS } from '../../data/districts';
import { formatDZD } from '../../utils/distance';
import { 
  Shield, 
  Car, 
  Users, 
  DollarSign, 
  Sliders, 
  Trash2, 
  Plus, 
  Check, 
  CheckCircle, 
  X, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  BarChart3,
  Moon,
  Zap,
  Eye,
  EyeOff,
  FileCheck,
  Percent,
  Compass,
  KeyRound,
  Lock,
  Pencil
} from 'lucide-react';
import { CustomerManagementTab } from './CustomerManagementTab';

interface AdminDashboardProps {
  drivers: Driver[];
  districts: District[];
  pricingConfig: PricingConfig;
  onUpdatePricing: (pricing: PricingConfig) => void;
  onUpdateDriverStatus: (driverId: string, status: 'approved' | 'rejected' | 'pending') => void;
  onAddDriver: (driver: Omit<Driver, 'id' | 'rating' | 'totalTrips'>) => void;
  onDeleteDriver: (driverId: string) => void;
  onAddDistrict: (district: Omit<District, 'id'>) => void;
  onDeleteDistrict: (districtId: string) => void;
  onUpdateDistrict?: (district: District) => void;
  activeRide: RideRequest | null;
  recentRides?: RideRequest[];
  onViewOnMap?: () => void;
  onLockAdmin?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  drivers,
  districts,
  pricingConfig,
  onUpdatePricing,
  onUpdateDriverStatus,
  onAddDriver,
  onDeleteDriver,
  onAddDistrict,
  onDeleteDistrict,
  onUpdateDistrict,
  activeRide,
  recentRides = [],
  onViewOnMap,
  onLockAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'drivers' | 'customers' | 'districts' | 'finance'>('overview');
  
  // Pricing Form State (محرك التسعير: فتح العداد، الكيلومتر، الذروة، دقيقة الانتظار)
  const [pricingForm, setPricingForm] = useState<PricingConfig>(pricingConfig);
  const [pricingSavedToast, setPricingSavedToast] = useState(false);

  // Selected driver for document auditing
  const [inspectingDriver, setInspectingDriver] = useState<Driver | null>(null);

  // State for in-app Driver Delete confirmation modal (مصلح بنسبة 100% بدون window.confirm)
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // State for District Edit / Delete / Add Modals (تعديل وحذف وإضافة الأحياء)
  const [districtToEdit, setDistrictToEdit] = useState<District | null>(null);
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null);
  const [isAddDistrictOpen, setIsAddDistrictOpen] = useState(false);
  const [districtSuccessToast, setDistrictSuccessToast] = useState<string | null>(null);

  // District Form state
  const [distFormNameAr, setDistFormNameAr] = useState('');
  const [distFormNameFr, setDistFormNameFr] = useState('');
  const [distFormCategory, setDistFormCategory] = useState<District['category']>('residential');
  const [distFormLat, setDistFormLat] = useState<number>(32.8980);
  const [distFormLng, setDistFormLng] = useState<number>(0.5480);
  const [distFormPopular, setDistFormPopular] = useState<boolean>(false);
  const [distFormDescription, setDistFormDescription] = useState('');

  // State for Admin PIN Change Modal
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessToast, setPinSuccessToast] = useState<string | null>(null);

  // Financial calculations
  const totalCompletedTrips = (recentRides.length || 0) + 120; // local history + base stats
  const totalRevenue = totalCompletedTrips * 280; // avg ride 280 DZD
  const commissionRate = pricingConfig.platformCommissionRate || 0.15;
  const platformEarnings = Math.round(totalRevenue * commissionRate);
  const activeDriversCount = drivers.filter(d => d.isOnline).length;
  const pendingDriversCount = drivers.filter(d => d.approvalStatus === 'pending').length;

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePricing(pricingForm);
    setPricingSavedToast(true);
    setTimeout(() => setPricingSavedToast(false), 3000);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('saykh_admin_pin') || '1234';

    if (currentPinInput !== storedPin) {
      setPinError('الرقم السري الحالي غير صحيح!');
      return;
    }
    if (newPinInput.length < 4) {
      setPinError('يجب أن يتكون الرقم السري الجديد من 4 أرقام على الأقل!');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError('تأكيد الرقم السري غير متطابق!');
      return;
    }

    localStorage.setItem('saykh_admin_pin', newPinInput);
    setPinError(null);
    setIsChangePinOpen(false);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinSuccessToast('تم تغيير الرقم السري للإدارة بنجاح! احتفظ بالرقم الجديد.');
    setTimeout(() => setPinSuccessToast(null), 4000);
  };

  // Handlers for District Management (إدارة الأحياء: إضافة وتعديل وحذف)
  const handleOpenEditDistrict = (dist: District) => {
    setDistrictToEdit(dist);
    setDistFormNameAr(dist.nameAr);
    setDistFormNameFr(dist.nameFr || '');
    setDistFormCategory(dist.category || 'residential');
    setDistFormLat(dist.lat);
    setDistFormLng(dist.lng);
    setDistFormPopular(Boolean(dist.popular));
    setDistFormDescription(dist.description || '');
  };

  const handleSaveDistrictEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtToEdit) return;

    const updated: District = {
      ...districtToEdit,
      nameAr: distFormNameAr.trim(),
      nameFr: distFormNameFr.trim() || undefined,
      category: distFormCategory,
      lat: Number(distFormLat),
      lng: Number(distFormLng),
      popular: distFormPopular,
      description: distFormDescription.trim() || undefined,
    };

    if (onUpdateDistrict) {
      onUpdateDistrict(updated);
    }
    setDistrictToEdit(null);
    setDistrictSuccessToast(`تم تعديل بيانات حي "${updated.nameAr}" بنجاح ✏️`);
    setTimeout(() => setDistrictSuccessToast(null), 4000);
  };

  const handleOpenAddDistrict = () => {
    setIsAddDistrictOpen(true);
    setDistFormNameAr('');
    setDistFormNameFr('');
    setDistFormCategory('residential');
    setDistFormLat(32.8980);
    setDistFormLng(0.5480);
    setDistFormPopular(false);
    setDistFormDescription('');
  };

  const handleSaveNewDistrict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distFormNameAr.trim()) return;

    const newDist: Omit<District, 'id'> = {
      nameAr: distFormNameAr.trim(),
      nameFr: distFormNameFr.trim() || undefined,
      category: distFormCategory,
      lat: Number(distFormLat),
      lng: Number(distFormLng),
      popular: distFormPopular,
      description: distFormDescription.trim() || undefined,
    };

    onAddDistrict(newDist);
    setIsAddDistrictOpen(false);
    setDistrictSuccessToast(`تمت إضافة الحي الجديد "${newDist.nameAr}" إلى الخارطة بنجاح ➕`);
    setTimeout(() => setDistrictSuccessToast(null), 4000);
  };

  const handleConfirmDeleteDistrict = () => {
    if (!districtToDelete) return;
    const name = districtToDelete.nameAr;
    onDeleteDistrict(districtToDelete.id);
    setDistrictToDelete(null);
    setDistrictSuccessToast(`تم حذف حي "${name}" من النظام 🗑️`);
    setTimeout(() => setDistrictSuccessToast(null), 4000);
  };

  return (
    <div className="bg-white rounded-3xl p-4 md:p-6 shadow-xl border-2 border-indigo-500/20 space-y-6 font-['Cairo',sans-serif]">
      {/* Toast for PIN Changed */}
      {pinSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{pinSuccessToast}</span>
          </div>
          <button onClick={() => setPinSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast for District Operations */}
      {districtSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{districtSuccessToast}</span>
          </div>
          <button onClick={() => setDistrictSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">
              لوحة التحكم والإدارة (Admin Dashboard)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة المستخدمين والسائقين، محرك التسعير، المراقبة الحية والتقارير المالية
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Change PIN Button */}
          <button
            type="button"
            onClick={() => {
              setIsChangePinOpen(true);
              setPinError(null);
            }}
            className="px-3 py-2 bg-indigo-700/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-indigo-500/50"
            title="تغيير الرقم السري للإدارة"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تغيير الرقم السري 🔑</span>
          </button>

          {/* Lock Admin Button */}
          {onLockAdmin && (
            <button
              type="button"
              onClick={onLockAdmin}
              className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-rose-500/50"
              title="قفل لوحة الإدارة وتأمينها"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل الإدارة 🔒</span>
            </button>
          )}

          {onViewOnMap && (
            <button
              onClick={onViewOnMap}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🗺️ المراقبة على الخارطة</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation: Overview / Pricing / Drivers / Districts / Finance */}
      <div className="flex items-center justify-start overflow-x-auto bg-slate-100 p-1.5 rounded-2xl gap-1.5 text-xs font-black">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>المراقبة الحية والإحصائيات</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pricing' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>محرك التسعير والذروة</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'drivers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>إدارة السائقين والوثائق</span>
          {pendingDriversCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {pendingDriversCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>إدارة الزبائن والمستخدمين</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'finance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>التقارير المالية والعمولات</span>
        </button>

        <button
          onClick={() => setActiveTab('districts')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'districts' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>أحياء الأبيض سيدي الشيخ ({districts.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & LIVE MONITORING (المراقبة الحية والإحصائيات) */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Key KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-right">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>السائقون المتصلون الآن</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-slate-900">{activeDriversCount} سيارة</div>
              <p className="text-[11px] text-emerald-700 font-bold">من أصل {drivers.length} سائق مسجل</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>الرحلات الجارية الآن</span>
                <Radio className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{activeRide ? '1 رحلة نشطة' : '0 رحلات'}</div>
              <p className="text-[11px] text-slate-500">مراقبة حية على مدار الساعة</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>إجمالي رحلات المنظومة</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalCompletedTrips} رحلة</div>
              <p className="text-[11px] text-indigo-700 font-bold">+18% هذا الأسبوع</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>أرباح المنصة من العمولة</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">{formatDZD(platformEarnings)}</div>
              <p className="text-[11px] text-slate-500">بنسبة اقتطاع {Math.round(commissionRate * 100)}%</p>
            </div>
          </div>

          {/* Active Ride Live Monitoring Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                <span>المراقبة الحية للرحلة النشطة (Live Ride Monitoring):</span>
              </h4>
              {onViewOnMap && (
                <button
                  onClick={onViewOnMap}
                  className="text-xs text-indigo-700 font-bold hover:underline cursor-pointer"
                >
                  عرض الموقع على الخارطة 🗺️
                </button>
              )}
            </div>

            {activeRide ? (
              <div className="bg-white p-4 rounded-xl border border-emerald-300 space-y-2 text-xs text-right">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">
                    الراكب: {activeRide.customerName} ({activeRide.customerPhone})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                    الحالة: {activeRide.status}
                  </span>
                </div>
                <div className="text-slate-600">
                  المسار: من <strong>{activeRide.pickupDistrict.nameAr}</strong> إلى <strong>{activeRide.dropoffDistrict.nameAr}</strong> ({activeRide.distanceKm} كم)
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">التكلفة التقديرية:</span>
                  <strong className="text-emerald-700 font-mono text-sm">{formatDZD(activeRide.estimatedPrice)}</strong>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                لا توجد رحلات جارية في هذه اللحظة. تظهر أي رحلة جديدة هنا تلقائياً فور طلبها.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRICING ENGINE & SURGE (محرك التسعير: سعر البداية، الكيلومتر، الانتظار، والتسعير الديناميكي) */}
      {activeTab === 'pricing' && (
        <form onSubmit={handleSavePricing} className="space-y-4 animate-in fade-in">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-right space-y-1">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>محرك التسعير الديناميكي (Pricing Engine)</span>
            </h4>
            <p className="text-xs text-slate-600">
              تحديد التكلفة بناءً على معادلة المسافة والوقت، وتفعيل التسعير الديناميكي (Surge Pricing) في أوقات الذروة والمطر ونقص السائقين.
            </p>
          </div>

          {pricingSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ وتحديث قواعد التسعير بنجاح! تطبق فوراً على جميع الرحلات.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-right text-xs">
            {/* Base Fare */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">فتح العداد (سعر البداية Base Fare):</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-bold">دج</span>
                <input
                  type="number"
                  value={pricingForm.baseFare}
                  onChange={e => setPricingForm({ ...pricingForm, baseFare: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="0"
                  step="10"
                />
              </div>
            </div>

            {/* Per Km Rate */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">سعر الكيلومتر الواحد (Per Km Rate):</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-bold">دج</span>
                <input
                  type="number"
                  value={pricingForm.perKmRate}
                  onChange={e => setPricingForm({ ...pricingForm, perKmRate: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="0"
                  step="5"
                />
              </div>
            </div>

            {/* Waiting Minute Rate */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">سعر دقيقة الانتظار (Waiting / Min):</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-bold">دج</span>
                <input
                  type="number"
                  value={pricingForm.waitingPerMinute || 10}
                  onChange={e => setPricingForm({ ...pricingForm, waitingPerMinute: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="0"
                  step="5"
                />
              </div>
            </div>

            {/* Minimum Fare */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">الحد الأدنى للرحلة (Minimum Fare):</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-bold">دج</span>
                <input
                  type="number"
                  value={pricingForm.minimumFare}
                  onChange={e => setPricingForm({ ...pricingForm, minimumFare: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="50"
                  step="10"
                />
              </div>
            </div>

            {/* Platform Commission */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">نسبة عمولة المنصة (Platform Fee %):</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <Percent className="w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={Math.round((pricingForm.platformCommissionRate || 0.15) * 100)}
                  onChange={e => setPricingForm({ ...pricingForm, platformCommissionRate: Number(e.target.value) / 100 })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="5"
                  max="30"
                  step="1"
                />
              </div>
            </div>

            {/* Dynamic Surge Multiplier (التسعير الديناميكي) */}
            <div className="space-y-1">
              <label className="font-bold text-amber-900 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>معامل الذروة (Surge Multiplier):</span>
              </label>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-2 rounded-xl">
                <span className="text-amber-800 font-black">x</span>
                <input
                  type="number"
                  value={pricingForm.surgeMultiplier || 1.0}
                  onChange={e => setPricingForm({ ...pricingForm, surgeMultiplier: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-slate-900 outline-hidden font-mono"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Surge Reason Input */}
          <div className="space-y-1 text-right text-xs">
            <label className="font-bold text-slate-700">سبب الذروة المعلن للمستخدمين (اختياري):</label>
            <input
              type="text"
              value={pricingForm.surgeReason || ''}
              onChange={e => setPricingForm({ ...pricingForm, surgeReason: e.target.value })}
              placeholder="مثلاً: وقت خروج المدارس والدوامات، أو حالة طقس ممطرة، أو ارتفاع الطلب في وسط المدينة..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Night Mode Surcharge Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="font-black text-slate-900">التعريفة الليلية (Night Surcharge)</div>
                <div className="text-slate-500 text-[11px]">إضافة مبلغ ثابت ({pricingForm.nightSurcharge} دج) على الرحلات الليلية</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pricingForm.nightModeEnabled}
                onChange={e => setPricingForm({ ...pricingForm, nightModeEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            تحديث وتطبيق إعدادات التسعير على المنظومة
          </button>
        </form>
      )}

      {/* TAB 3: DRIVERS & DOCUMENT AUDIT (إدارة السائقين وفحص الوثائق والتراخيص) */}
      {activeTab === 'drivers' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm text-slate-900">
              قائمة السائقين وتدقيق الوثائق الرسمية ({drivers.length})
            </h4>
          </div>

          {/* Drivers List */}
          <div className="space-y-3">
            {drivers.map(d => (
              <div
                key={d.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition space-y-3 text-right"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={d.avatar}
                      alt={d.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-black text-slate-900 text-sm">{d.name}</h5>
                        {d.approvalStatus === 'approved' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                            معتمد 🟢
                          </span>
                        ) : d.approvalStatus === 'pending' ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold">
                            قيد المراجعة 🟡
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold">
                            مرفوض 🔴
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold mt-1">
                        <span>{d.carModel} · {d.plateNumber}</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-bold" dir="ltr">
                          📞 {d.phone}
                        </span>
                        {d.showPhoneToCustomer === false ? (
                          <span className="text-[10px] bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>مخفي عن الزبون (خاص بالإدارة)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>ظاهر للزبون</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Approve / Reject / Inspect Documents */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setInspectingDriver(d)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>تدقيق الوثائق ({d.documents?.length || 0})</span>
                    </button>

                    {d.approvalStatus !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => onUpdateDriverStatus(d.id, 'approved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        اعتماد السائق
                      </button>
                    )}

                    {d.approvalStatus !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => onUpdateDriverStatus(d.id, 'rejected')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        إيقاف
                      </button>
                    )}

                    {/* Delete Driver Button (حذف السائق نهائياً بواسطة الإدارة) */}
                    <button
                      type="button"
                      onClick={() => setDriverToDelete(d)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="حذف حساب السائق نهائياً من المنظومة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف السائق 🗑️</span>
                    </button>
                  </div>
                </div>

                {/* Driver Stats Footnote */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>التقييم: ⭐ {d.rating} ({d.totalTrips} رحلة)</span>
                  <span>الرصيد: <strong className="font-mono text-slate-800">{formatDZD(d.wallet?.balance || 0)}</strong></span>
                  <span>الحالة: {d.isOnline ? '🟢 متصل' : '⚪ غير متصل'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Custom In-App Driver Deletion Confirmation Modal (مصلح بالكامل لحل مشكلة iframe) */}
          {driverToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border-2 border-rose-500/30 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-black text-slate-900 text-lg">تأكيد حذف السائق نهائياً</h4>
                  <p className="text-xs text-slate-600">
                    هل أنت متأكد من رغبتك في حذف السائق <strong className="text-slate-900">{driverToDelete.name}</strong>؟
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {driverToDelete.carModel} · لوحة: {driverToDelete.plateNumber} · هاتف: {driverToDelete.phone}
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 font-bold space-y-1.5 text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-600">⚠️</span>
                    <span>سيتم حذف الحساب نهائياً من قاعدة بيانات المنظومة.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-600">⚠️</span>
                    <span>لن يتمكن السائق من تسجيل الدخول أو استقبال أي رحلات بعد الآن.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-600">⚠️</span>
                    <span>إذا كان السائق متصلاً في التطبيق حالياً، فسيتم إنهاء جلسته فوراً.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteDriver(driverToDelete.id);
                      setDriverToDelete(null);
                    }}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                  >
                    تأكيد الحذف نهائياً 🗑️
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    إلغاء التراجع
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Inspection Modal */}
          {inspectingDriver && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-black text-slate-900 text-base">تدقيق وثائق السائق</h4>
                    <p className="text-xs text-slate-500">{inspectingDriver.name} · {inspectingDriver.carModel}</p>
                  </div>
                  <button
                    onClick={() => setInspectingDriver(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(inspectingDriver.documents || []).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">لم يقم السائق برفع أي وثائق بعد.</p>
                  ) : (
                    (inspectingDriver.documents || []).map(doc => (
                      <div key={doc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{doc.titleAr}</div>
                          <div className="text-[10px] text-slate-400">
                            الحالة: {doc.status === 'verified' ? 'معتمدة' : 'قيد الفحص'}
                          </div>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 rounded-lg text-[11px] font-bold border border-slate-200 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateDriverStatus(inspectingDriver.id, 'approved');
                      setInspectingDriver(null);
                    }}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    اعتماد كافة الوثائق
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectingDriver(null)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOMER MANAGEMENT (إدارة الزبائن والتحكم بعد التسجيل) */}
      {activeTab === 'customers' && (
        <div className="animate-in fade-in">
          <CustomerManagementTab />
        </div>
      )}

      {/* TAB 4: FINANCIAL REPORTS & COMMISSIONS (التقارير المالية والعمولات) */}
      {activeTab === 'finance' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-right space-y-1">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-700" />
              <span>التقارير المالية وحصيلة العمولات</span>
            </h4>
            <p className="text-xs text-slate-600">
              متابعة الإيرادات الإجمالية، عمولات المنصة المستحقة ({Math.round(commissionRate * 100)}%)، ومستحقات السائقين النقدية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold">حجم التداول الإجمالي</span>
              <div className="text-2xl font-black text-slate-900 font-mono">{formatDZD(totalRevenue)}</div>
              <p className="text-[10px] text-slate-400">إجمالي مبالغ الرحلات المنفذة</p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-xs text-emerald-800 font-bold">صافي عمولة التطبيق</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">{formatDZD(platformEarnings)}</div>
              <p className="text-[10px] text-emerald-600">دخل المنصة القابل للسحب</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold">مستحقات السائقين الصافية</span>
              <div className="text-2xl font-black text-slate-800 font-mono">{formatDZD(totalRevenue - platformEarnings)}</div>
              <p className="text-[10px] text-slate-400">محصلة نقداً بيد السائقين</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DISTRICTS MANAGEMENT (إدارة أحياء ومعالم الأبيض سيدي الشيخ: تعديل، حذف، إضافة) */}
      {activeTab === 'districts' && (
        <div className="space-y-4 animate-in fade-in text-right">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>أحياء ومعالم مدينة الأبيض سيدي الشيخ ({districts.length} حي)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك هنا تعديل أسماء وإحداثيات الأحياء، حذف المناطق غير المرغوبة، أو إضافة أحياء وتوسعات جديدة.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddDistrict}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حي أو معلم جديد ➕</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {districts.map(dist => (
              <div
                key={dist.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs space-y-3 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{dist.nameAr}</div>
                    {dist.nameFr && (
                      <div className="text-[10px] text-slate-400 font-mono">{dist.nameFr}</div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono mt-1" dir="ltr">
                      📍 {dist.lat.toFixed(4)}, {dist.lng.toFixed(4)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {dist.popular && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black">
                        شائع ⭐
                      </span>
                    )}
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {dist.category === 'historic' ? '🏛️ تاريخي' : dist.category === 'facility' ? '🏥 منشأة' : dist.category === 'education' ? '🎓 تعليمي' : dist.category === 'transport' ? '⛽ نقل' : '🏡 سكني'}
                    </span>
                  </div>
                </div>

                {dist.description && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                    {dist.description}
                  </p>
                )}

                {/* Actions: Edit & Delete buttons */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditDistrict(dist)}
                    className="flex-1 py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>تعديل المنطقة ✏️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistrictToDelete(dist)}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
                    title="حذف هذا الحي نهائياً"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف 🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Edit District (تعديل بيانات المنطقة) */}
          {districtToEdit && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      <Pencil className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">تعديل بيانات المنطقة</h4>
                      <p className="text-[11px] text-slate-500">{districtToEdit.nameAr}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDistrictToEdit(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveDistrictEdit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      اسم الحي أو المعلم بالعربية *:
                    </label>
                    <input
                      type="text"
                      value={distFormNameAr}
                      onChange={e => setDistFormNameAr(e.target.value)}
                      placeholder="مثال: حي الوفاء، حي الشعبة..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الاسم بالحروف اللاتينية (اختياري):
                    </label>
                    <input
                      type="text"
                      value={distFormNameFr}
                      onChange={e => setDistFormNameFr(e.target.value)}
                      placeholder="مثال: Hay El-Ouafea"
                      dir="ltr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        تصنيف المنطقة:
                      </label>
                      <select
                        value={distFormCategory}
                        onChange={e => setDistFormCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="residential">🏡 حي سكني</option>
                        <option value="historic">🏛️ موقع تاريخي وتراثي</option>
                        <option value="facility">🏥 منشأة صحية أو إدارية</option>
                        <option value="education">🎓 قطاع تعليمي / مدارس</option>
                        <option value="transport">⛽ محطة أو نقطة نقل</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={distFormPopular}
                          onChange={e => setDistFormPopular(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>منطقة شائعة ومطلوبة ⭐</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        خط العرض (Latitude) *:
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={distFormLat}
                        onChange={e => setDistFormLat(Number(e.target.value))}
                        dir="ltr"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        خط الطول (Longitude) *:
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={distFormLng}
                        onChange={e => setDistFormLng(Number(e.target.value))}
                        dir="ltr"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      وصف إضافي أو معالم مميزة (اختياري):
                    </label>
                    <input
                      type="text"
                      value={distFormDescription}
                      onChange={e => setDistFormDescription(e.target.value)}
                      placeholder="مثال: بالقرب من المسجد العتيق أو متوسطة..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                    >
                      حفظ تعديلات المنطقة 💾
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistrictToEdit(null)}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Add New District (إضافة حي أو معلم جديد) */}
          {isAddDistrictOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">إضافة حي أو معلم جديد</h4>
                      <p className="text-[11px] text-slate-500">مدينة الأبيض سيدي الشيخ (ولاية البيض 32)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddDistrictOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveNewDistrict} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      اسم الحي أو المعلم بالعربية *:
                    </label>
                    <input
                      type="text"
                      value={distFormNameAr}
                      onChange={e => setDistFormNameAr(e.target.value)}
                      placeholder="مثال: حي الوفاء الجديد..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الاسم بالحروف اللاتينية (اختياري):
                    </label>
                    <input
                      type="text"
                      value={distFormNameFr}
                      onChange={e => setDistFormNameFr(e.target.value)}
                      placeholder="مثال: Nouveau Quartier"
                      dir="ltr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        تصنيف المنطقة:
                      </label>
                      <select
                        value={distFormCategory}
                        onChange={e => setDistFormCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                      >
                        <option value="residential">🏡 حي سكني</option>
                        <option value="historic">🏛️ موقع تاريخي وتراثي</option>
                        <option value="facility">🏥 منشأة صحية أو إدارية</option>
                        <option value="education">🎓 قطاع تعليمي / مدارس</option>
                        <option value="transport">⛽ محطة أو نقطة نقل</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={distFormPopular}
                          onChange={e => setDistFormPopular(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>منطقة شائعة ومطلوبة ⭐</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        خط العرض (Latitude) *:
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={distFormLat}
                        onChange={e => setDistFormLat(Number(e.target.value))}
                        dir="ltr"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        خط الطول (Longitude) *:
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={distFormLng}
                        onChange={e => setDistFormLng(Number(e.target.value))}
                        dir="ltr"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      وصف إضافي للموقع (اختياري):
                    </label>
                    <input
                      type="text"
                      value={distFormDescription}
                      onChange={e => setDistFormDescription(e.target.value)}
                      placeholder="وصف مختصر للمكان..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                    >
                      إضافة الحي إلى الخارطة ➕
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddDistrictOpen(false)}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: In-App District Delete Confirmation (مصلح بدون window.confirm لحل أي مشاكل في iframe) */}
          {districtToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border-2 border-rose-500/30 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-black text-slate-900 text-lg">تأكيد حذف الحي</h4>
                  <p className="text-xs text-slate-600">
                    هل أنت متأكد من رغبتك في حذف <strong className="text-slate-900 text-sm">"{districtToDelete.nameAr}"</strong> من قائمة الأحياء والخارطة؟
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                    ({districtToDelete.lat.toFixed(4)}, {districtToDelete.lng.toFixed(4)})
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteDistrict}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                  >
                    تأكيد حذف المنطقة نهائياً 🗑️
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistrictToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    إلغاء التراجع
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change PIN Modal (نافذة تغيير الرقم السري للإدارة) */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">تغيير الرقم السري للإدارة</h4>
                  <p className="text-[11px] text-slate-500">حماية لوحة تحكم تاكسي الأبيض سيدي الشيخ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsChangePinOpen(false);
                  setPinError(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  الرقم السري الحالي:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={currentPinInput}
                  onChange={e => setCurrentPinInput(e.target.value)}
                  placeholder="الرقم السري الحالي (الافتراضي 1234)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono text-center tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  الرقم السري الجديد (4 أرقام على الأقل):
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPinInput}
                  onChange={e => setNewPinInput(e.target.value)}
                  placeholder="أدخل الرقم السري الجديد..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono text-center tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  تأكيد الرقم السري الجديد:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPinInput}
                  onChange={e => setConfirmPinInput(e.target.value)}
                  placeholder="أعد كتابة الرقم السري الجديد..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-600 font-mono text-center tracking-widest"
                  required
                />
              </div>

              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                >
                  حفظ الرقم السري الجديد 💾
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePinOpen(false);
                    setPinError(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
