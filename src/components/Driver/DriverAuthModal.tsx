import React, { useState } from 'react';
import { Driver, District } from '../../types';
import { OFFICIAL_DISTRICTS } from '../../data/districts';
import { 
  Car, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  MapPin, 
  Calendar, 
  Sparkles,
  LogIn,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

interface DriverAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  onLoginSuccess: (driver: Driver) => void;
  onRegisterSuccess: (newDriver: Driver) => void;
  initialMode?: 'login' | 'register';
}

export const DriverAuthModal: React.FC<DriverAuthModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onLoginSuccess,
  onRegisterSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // phone or email
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [carModel, setCarModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [carYear, setCarYear] = useState<number>(2021);
  const [carColor, setCarColor] = useState('أبيض ناصع');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [showPhoneToCustomer, setShowPhoneToCustomer] = useState<boolean>(true);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  if (!isOpen) return null;

  // Clean phone input for comparisons
  const normalizeIdentifier = (val: string) => val.replace(/\s+/g, '').toLowerCase();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = normalizeIdentifier(loginIdentifier);
    if (!identifier) {
      setLoginError('يرجى إدخال رقم الهاتف أو البريد الإلكتروني المسجل.');
      return;
    }

    // Find driver matching either normalized phone or email
    const matchedDriver = drivers.find(d => {
      const normPhone = normalizeIdentifier(d.phone);
      const normEmail = normalizeIdentifier(d.email || '');
      return normPhone === identifier || normEmail === identifier;
    });

    if (!matchedDriver) {
      setLoginError('لم يتم العثور على سائق مسجل بهذا الرقم أو البريد الإلكتروني. يرجى التحقق أو إنشاء حساب جديد.');
      return;
    }

    // Validate password if provided on the driver
    if (matchedDriver.password && loginPassword && matchedDriver.password !== loginPassword) {
      setLoginError('كلمة المرور غير صحيحة. يرجى إعادة المحاولة.');
      return;
    }

    // Successful login
    onLoginSuccess(matchedDriver);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    // Validation
    if (!name.trim() || name.trim().length < 3) {
      setRegisterError('يرجى كتابة الاسم الكامل بالشكل الصحيح.');
      return;
    }
    const cleanPhone = normalizeIdentifier(phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      setRegisterError('يرجى إدخال رقم هاتف صحيح (مثال: 0661234567).');
      return;
    }
    const cleanEmail = normalizeIdentifier(email);
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRegisterError('يرجى إدخال بريد إلكتروني صالح للتواصل وتسجيل الدخول.');
      return;
    }
    if (!password || password.length < 3) {
      setRegisterError('يرجى تعيين كلمة مرور أو رمز سري لا يقل عن 3 أحرف/أرقام.');
      return;
    }
    if (!carModel.trim()) {
      setRegisterError('يرجى تحديد نوع وموديل سيارة الأجرة.');
      return;
    }
    if (!plateNumber.trim()) {
      setRegisterError('يرجى إدخال رقم لوحة الترقيم (Matricule).');
      return;
    }

    // Check duplicate
    const exists = drivers.some(d => 
      normalizeIdentifier(d.phone) === cleanPhone || 
      normalizeIdentifier(d.email || '') === cleanEmail
    );
    if (exists) {
      setRegisterError('يوجد بالفعل حساب سائق مسجل بهذا الهاتف أو البريد الإلكتروني. يمكنك تسجيل الدخول مباشرة.');
      return;
    }

    // Determine default district coordinates (بدون إلزام السائق بتحديد حي تمركز محدد)
    const defaultDistrict = OFFICIAL_DISTRICTS[0];

    // Color hex mapping
    let colorHex = '#f8fafc';
    if (carColor.includes('رمادي') || carColor.includes('فضي')) colorHex = '#94a3b8';
    if (carColor.includes('أسود')) colorHex = '#1e293b';
    if (carColor.includes('أزرق') || carColor.includes('كحلي')) colorHex = '#1e3a8a';
    if (carColor.includes('أحمر')) colorHex = '#b91c1c';
    if (carColor.includes('أصفر')) colorHex = '#eab308';

    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      showPhoneToCustomer: showPhoneToCustomer, // إظهار أو إخفاء عن الزبون (الإدارة وحدها تراه عند الإخفاء)
      email: email.trim().toLowerCase(),
      password: password,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      carModel: carModel.trim(),
      carColor: carColor,
      carColorHex: colorHex,
      plateNumber: plateNumber.trim(),
      carYear: Number(carYear) || 2021,
      licenseNumber: licenseNumber.trim() || `TX-32-${Math.floor(10000 + Math.random() * 90000)}`,
      rating: 5.0,
      totalTrips: 0,
      isOnline: true,
      status: 'available',
      registeredAt: Date.now(),
      approvalStatus: 'approved',
      currentLocation: {
        lat: defaultDistrict.lat + (Math.random() - 0.5) * 0.003,
        lng: defaultDistrict.lng + (Math.random() - 0.5) * 0.003,
        districtId: defaultDistrict.id,
        heading: Math.floor(Math.random() * 360),
      }
    };

    setRegisterSuccess(true);
    setTimeout(() => {
      onRegisterSuccess(newDriver);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="driver-auth-modal"
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-auto"
      >
        {/* Header with Title & Mode Switcher */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/40 shadow-inner bg-slate-900/50 flex items-center justify-center shrink-0">
              <img src="/assets/icon-192.png" alt="أيقونة تاكسي الأبيض سيدي الشيخ" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/25 text-white inline-block mb-1">
                بوابة أصحاب سيارات الأجرة · ولاية البيض (32)
              </span>
              <h2 className="text-xl sm:text-2xl font-black">
                {mode === 'login' ? 'تسجيل دخول السائق' : 'لوحة تسجيل صاحب سيارة أجرة جديد'}
              </h2>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mt-5 flex items-center bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              id="tab-driver-login"
              onClick={() => { setMode('login'); setLoginError(null); setRegisterError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              id="tab-driver-register"
              onClick={() => { setMode('register'); setLoginError(null); setRegisterError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل صاحب سيارة جديد</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {mode === 'login' ? (
            /* ==================== LOGIN FORM ==================== */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  أهلاً بك زميلنا السائق في الأبيض سيدي الشيخ! سجّل دخولك الآن باستخدام <strong className="font-bold">رقم هاتفك</strong> أو <strong className="font-bold">بريدك الإلكتروني</strong> لتفعيل حالة التواجد واستقبال طلبات الزبائن مباشرة.
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Identifier Input (Phone or Email) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>رقم الهاتف أو البريد الإلكتروني</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-driver-login-identifier"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="مثال: 0661245512 أو lakhdar@taxi-abiodh.dz"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-sans"
                    dir="ltr"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  يمكنك الدخول إما برقم هاتفك الجزائري (06 / 07 / 05) أو بريدك الإلكتروني المسجل.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>كلمة المرور / الرمز السري</span>
                  </span>
                  <span className="text-[11px] text-slate-400">الافتراضي للحسابات التجريبية: 123</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-driver-login-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-driver-login"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول إلى مقصورة السائق</span>
              </button>

              {/* Fast Test / Demo Accounts Picker */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-2">
                  ⚡ حسابات تجريبية جاهزة للدخول السريع:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {drivers.slice(0, 4).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setLoginIdentifier(d.phone);
                        setLoginPassword(d.password || '123');
                        onLoginSuccess(d);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 flex items-center gap-2.5 text-right transition cursor-pointer group"
                    >
                      <img src={d.avatar} alt={d.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-700">{d.name}</div>
                        <div className="text-[10px] text-slate-500 truncate" dir="ltr">{d.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* ==================== REGISTRATION FORM ==================== */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              {registerSuccess ? (
                <div className="py-10 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">تم تسجيل الحساب بنجاح!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    تمت إضافة سيارتك لأسطول تاكسي الأبيض سيدي الشيخ. يمكنك الآن تسجيل الدخول دائماً برقم هاتفك أو بريدك الإلكتروني.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">انضم لشبكة سائقي الأبيض سيدي الشيخ:</strong>
                      سجل بياناتك وسيارتك، وسيصبح رقم هاتفك والبريد الإلكتروني هما مفتاح حسابك لتسجيل الدخول في أي وقت.
                    </div>
                  </div>

                  {registerError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  {/* Section 1: Personal Credentials */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                      <User className="w-4 h-4 text-amber-600" />
                      <span>1. البيانات الشخصية ومعلومات الدخول</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للسائق *</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="مثال: أحمد بلحاج"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (للتواصل والدخول) *</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0661 00 00 00"
                          dir="ltr"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                          required
                        />

                        {/* اختيارين أسفل رقم الهاتف: إظهار للزبون أو إخفاء عن الزبون */}
                        <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-slate-200/90 space-y-2">
                          <span className="text-[11px] font-black text-slate-800 block">
                            خيارات خصوصية وظهور رقم الهاتف:
                          </span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {/* الخيار الأول: إظهار للزبون */}
                            <button
                              type="button"
                              onClick={() => setShowPhoneToCustomer(true)}
                              className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                                showPhoneToCustomer
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>إظهار للزبون 👁️</span>
                            </button>

                            {/* الخيار الثاني: إخفاء عن الزبون */}
                            <button
                              type="button"
                              onClick={() => setShowPhoneToCustomer(false)}
                              className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                                !showPhoneToCustomer
                                  ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>إخفاء عن الزبون 🔒</span>
                            </button>
                          </div>

                          <div className="text-[10px] rounded-lg px-2 py-1.5 font-medium leading-relaxed">
                            {showPhoneToCustomer ? (
                              <p className="text-emerald-700 bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200/50">
                                ✓ سيظهر رقمك للزبون لتسهيل الاتصال المباشر بك عند قبول المشوار.
                              </p>
                            ) : (
                              <p className="text-amber-800 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/50">
                                🔒 <strong className="font-bold">الإدارة وحدها ترى رقم هاتفك</strong> عند الإخفاء، ولن يظهر للزبون نهائياً لحفظ خصوصيتك وسيكون التواصل عبر المنصة.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني (للدخول لاحقاً) *</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ahmed@gmail.com"
                          dir="ltr"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور / الرمز السري *</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="اختر كلمة مرور"
                          dir="ltr"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Vehicle Data */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                      <Car className="w-4 h-4 text-amber-600" />
                      <span>2. بيانات سيارة الأجرة والترقيم</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">نوع وموديل السيارة *</label>
                        <input
                          type="text"
                          value={carModel}
                          onChange={(e) => setCarModel(e.target.value)}
                          placeholder="مثال: رونو سيمبول / داسيا لوغان"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">رقم لوحة الترقيم (Matricule) *</label>
                        <input
                          type="text"
                          value={plateNumber}
                          onChange={(e) => setPlateNumber(e.target.value)}
                          placeholder="مثال: 08432-121-32"
                          dir="ltr"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">سنة الصنع</label>
                        <select
                          value={carYear}
                          onChange={(e) => setCarYear(Number(e.target.value))}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          {Array.from({ length: 15 }, (_, i) => 2026 - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">لون المركبة</label>
                        <select
                          value={carColor}
                          onChange={(e) => setCarColor(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="أبيض ناصع">أبيض ناصع (Blanc)</option>
                          <option value="رمادي فضي">رمادي فضي (Gris)</option>
                          <option value="أسود ميتاليك">أسود (Noir)</option>
                          <option value="أزرق كحلي">أزرق (Bleu)</option>
                          <option value="أصفر تاكسي">أصفر تاكسي (Jaune)</option>
                          <option value="أحمر عنابي">أحمر (Rouge)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Licensing */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>3. رخصة الثقة واعتماد سيارة الأجرة</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم رخصة الثقة / رخصة استغلال التاكسي (اختياري)
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="مثال: TX-32-09821 أو رقم الدفتر"
                        dir="ltr"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        📍 يتم تحديد موقعك وتمركزك آلياً عبر نظام الملاحة والتتبع GPS فور فتح التطبيق.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="btn-submit-driver-register"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>إتمام التسجيل والبدء كصاحب تاكسي</span>
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
