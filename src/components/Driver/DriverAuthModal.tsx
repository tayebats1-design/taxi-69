import React, { useState, useEffect, useRef } from 'react';
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
  EyeOff,
  Clock,
  RotateCcw,
  Send,
  Check,
  Smartphone,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { 
  sendOTP, 
  verifyOTP, 
  getResendCooldownRemaining, 
  normalizePhoneNumber,
  normalizeEmail,
  isValidEmail,
  getEmailProviderInfo,
  detectCarrierName 
} from '../../services/otpService';
import { listenForWebOTP, formatAlgerianPhoneE164 } from '../../services/smsService';
import { sounds } from '../../utils/audio';

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
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // phone or email
  const [loginDriverEmail, setLoginDriverEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Login OTP State
  const [loginOtpStep, setLoginOtpStep] = useState<'phone' | 'otp'>('phone');
  const [loginOtpDigits, setLoginOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);
  const [loginOtpExpiry, setLoginOtpExpiry] = useState(300);
  const [isLoginOtpLoading, setIsLoginOtpLoading] = useState(false);

  // Register State
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
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

  // Register OTP State
  const [driverOtpDigits, setDriverOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [driverOtpCooldown, setDriverOtpCooldown] = useState(0);
  const [driverOtpExpiry, setDriverOtpExpiry] = useState(300);
  const [isDriverOtpLoading, setIsDriverOtpLoading] = useState(false);

  // Input refs for 6 digits
  const regOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const loginOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timers
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setDriverOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setDriverOtpExpiry(prev => (prev > 0 ? prev - 1 : 0));
      setLoginOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setLoginOtpExpiry(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Listen for real SMS arriving on SIM card via WebOTP API
  useEffect(() => {
    if (!isOpen || (registerStep !== 'otp' && loginOtpStep !== 'otp')) return;

    const abortController = new AbortController();
    listenForWebOTP(abortController.signal).then((smsCode) => {
      if (smsCode && smsCode.length >= 6) {
        const clean = smsCode.replace(/\D/g, '').slice(0, 6);
        if (clean.length === 6) {
          const digits = clean.split('');
          if (registerStep === 'otp') {
            setDriverOtpDigits(digits);
            setRegisterError(null);
            sounds.playArrivalChime();
          } else if (loginOtpStep === 'otp') {
            setLoginOtpDigits(digits);
            setLoginError(null);
            sounds.playArrivalChime();
          }
        }
      }
    });

    return () => {
      abortController.abort();
    };
  }, [isOpen, registerStep, loginOtpStep]);

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

    // Validation passes -> Send Email OTP to Driver's email via Supabase
    setIsDriverOtpLoading(true);
    sendOTP({
      email: cleanEmail,
      phone: cleanPhone,
      userType: 'driver',
      userName: name.trim(),
    }).then(otpRes => {
      setIsDriverOtpLoading(false);
      if (otpRes.success) {
        setRegisterStep('otp');
        setDriverOtpDigits(['', '', '', '', '', '']);
        setDriverOtpCooldown(60);
        setDriverOtpExpiry(300);
        setTimeout(() => regOtpRefs.current[0]?.focus(), 150);
      } else {
        setRegisterError(otpRes.message);
        if (otpRes.cooldownRemaining) setDriverOtpCooldown(otpRes.cooldownRemaining);
      }
    }).catch(() => {
      setIsDriverOtpLoading(false);
      setRegisterError('فشل إرسال رمز التحقق عبر خدمة Supabase البريدية. يرجى التأكد من البريد والمحاولة مرة أخرى.');
    });
  };

  // Verify OTP for driver registration
  const handleVerifyDriverRegisterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegisterError(null);
    const code = driverOtpDigits.join('');
    if (code.length !== 6) {
      setRegisterError('يرجى إدخال أرقام رمز التحقق الـ 6 كاملة.');
      return;
    }

    setIsDriverOtpLoading(true);
    try {
      const res = await verifyOTP({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        inputCode: code,
        userType: 'driver',
        userName: name.trim(),
      });
      setIsDriverOtpLoading(false);

      if (res.success) {
        const defaultDistrict = OFFICIAL_DISTRICTS[0];
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
          showPhoneToCustomer: showPhoneToCustomer,
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
          isVerified: true, // تفعيل الحساب وتوثيقه برمز OTP
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
        sounds.playArrivalChime();
        setTimeout(() => {
          onRegisterSuccess(newDriver);
          onClose();
        }, 1200);
      } else {
        setRegisterError(res.message);
      }
    } catch {
      setIsDriverOtpLoading(false);
      setRegisterError('حدث خطأ أثناء مطابقة الرمز. يرجى إعادة المحاولة.');
    }
  };

  // Driver Login with OTP
  const handleSendDriverLoginOtp = async () => {
    setLoginError(null);
    const identifier = normalizeIdentifier(loginIdentifier);
    const cleanEmail = normalizeEmail(loginIdentifier);
    const isEmailInput = isValidEmail(cleanEmail);

    if (!identifier && !cleanEmail) {
      setLoginError('يرجى إدخال البريد الإلكتروني أو رقم هاتف السائق المسجل أولاً.');
      return;
    }

    let matched: Driver | undefined;
    if (isEmailInput) {
      matched = drivers.find(d => normalizeEmail(d.email || '') === cleanEmail);
    } else {
      matched = drivers.find(d => normalizeIdentifier(d.phone) === identifier);
    }

    if (!matched) {
      setLoginError('لم يتم العثور على سائق مسجل بهذا البريد أو الرقم. يرجى التأكد أو إنشاء حساب سائق جديد.');
      return;
    }

    const destEmail = matched.email || (isEmailInput ? cleanEmail : '');
    setLoginDriverEmail(destEmail);

    setIsLoginOtpLoading(true);
    try {
      const res = await sendOTP({
        email: destEmail,
        phone: matched.phone,
        userType: 'driver',
        userName: matched.name,
      });
      setIsLoginOtpLoading(false);
      if (res.success) {
        setLoginOtpStep('otp');
        setLoginOtpDigits(['', '', '', '', '', '']);
        setLoginOtpCooldown(60);
        setLoginOtpExpiry(300);
        setTimeout(() => loginOtpRefs.current[0]?.focus(), 150);
      } else {
        setLoginError(res.message);
        if (res.cooldownRemaining) setLoginOtpCooldown(res.cooldownRemaining);
      }
    } catch {
      setIsLoginOtpLoading(false);
      setLoginError('تعذر إرسال رمز التحقق عبر البريد. يرجى المحاولة لاحقاً.');
    }
  };

  const handleVerifyDriverLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    const code = loginOtpDigits.join('');
    if (code.length !== 6) {
      setLoginError('يرجى كتابة رمز التحقق المكون من 6 أرقام.');
      return;
    }

    const identifier = normalizeIdentifier(loginIdentifier);
    const cleanEmail = normalizeEmail(loginIdentifier);
    const isEmailInput = isValidEmail(cleanEmail);

    let matched: Driver | undefined;
    if (isEmailInput) {
      matched = drivers.find(d => normalizeEmail(d.email || '') === cleanEmail);
    } else {
      matched = drivers.find(d => normalizeIdentifier(d.phone) === identifier);
    }
    if (!matched) return;

    setIsLoginOtpLoading(true);
    try {
      const res = await verifyOTP({
        email: loginDriverEmail || matched.email,
        phone: matched.phone,
        inputCode: code,
        userType: 'driver',
        userName: matched.name,
      });
      setIsLoginOtpLoading(false);
      if (res.success) {
        sounds.playArrivalChime();
        onLoginSuccess({ ...matched, isVerified: true });
        onClose();
      } else {
        setLoginError(res.message);
      }
    } catch {
      setIsLoginOtpLoading(false);
      setLoginError('حدث خطأ أثناء فحص رمز التحقق.');
    }
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
            <div className="space-y-4">
              {/* Login Method Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setLoginError(null); }}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>دخول بكلمة المرور 🔑</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('otp'); setLoginError(null); }}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    loginMethod === 'otp'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>دخول سريع برمز OTP 📱</span>
                </button>
              </div>

              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginMethod === 'password' ? (
                /* Method 1: Password Login */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      أهلاً بك زميلنا السائق! أدخل رقم هاتفك أو بريدك الإلكتروني المسجل وكلمة المرور للدخول إلى مقصورة القيادة.
                    </p>
                  </div>

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
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-driver-login"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>دخول إلى مقصورة السائق</span>
                  </button>
                </form>
              ) : (
                /* Method 2: OTP Fast Login */
                <div className="space-y-4">
                  {loginOtpStep === 'phone' ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
                        <Smartphone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <p>
                          الدخول السريع والآمن برمز OTP دون الحاجة لكلمة مرور. أدخل رقم هاتفك المسجل لتلقي رسالة SMS فورية.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>رقم هاتف السائق المسجل:</span>
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl focus-within:border-emerald-500 focus-within:bg-white transition" dir="ltr">
                          <div className="flex items-center gap-1 border-r border-slate-300 pr-2 mr-1 shrink-0">
                            <span className="text-sm">🇩🇿</span>
                            <span className="text-xs font-bold text-slate-700 font-mono">+213</span>
                          </div>
                          <input
                            type="tel"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            placeholder="0661 24 55 12"
                            className="w-full bg-transparent text-sm font-bold text-slate-900 outline-hidden font-mono"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>موبيليس · جازي · أوريدو</span>
                          {loginIdentifier.length >= 2 && (
                            <span className="font-bold text-emerald-700">{detectCarrierName(loginIdentifier)}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendDriverLoginOtp}
                        disabled={isLoginOtpLoading || !loginIdentifier.trim()}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        {isLoginOtpLoading ? (
                          <span>جاري إرسال الرمز... ⏳</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>إرسال رمز الدخول السريع (OTP) 📩</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* OTP verification step in Login */
                    <form onSubmit={handleVerifyDriverLoginOtp} className="space-y-4">
                      <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="font-extrabold text-xs block text-emerald-950">
                              رمز الدخول السريع عبر البريد الإلكتروني (Email OTP):
                            </span>
                            <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                              تم إرسال رمز الـ OTP إلى بريدك الإلكتروني <strong className="font-mono text-emerald-950" dir="ltr">{loginDriverEmail || loginIdentifier}</strong> عبر خدمة Supabase المجانية بدون تكلفة SMS.
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).</span>
                          </div>
                          <a
                            href={getEmailProviderInfo(loginDriverEmail || loginIdentifier).url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 shrink-0 bg-emerald-100/60 px-2 py-1 rounded-lg"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>فتح {getEmailProviderInfo(loginDriverEmail || loginIdentifier).name}</span>
                          </a>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">البريد أو الحساب:</span>
                          <span className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                            {loginDriverEmail || loginIdentifier}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLoginOtpStep('phone')}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                        >
                          تغيير الحساب
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block text-center">
                          أدخل رمز التحقق المكون من 6 أرقام:
                        </label>
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
                          {loginOtpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                loginOtpRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/\D/g, '');
                                if (clean.length > 1) {
                                  const pasted = clean.slice(0, 6).split('');
                                  const updated = [...loginOtpDigits];
                                  pasted.forEach((d, i) => { if (i < 6) updated[i] = d; });
                                  setLoginOtpDigits(updated);
                                  loginOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
                                  return;
                                }
                                const updated = [...loginOtpDigits];
                                updated[idx] = clean;
                                setLoginOtpDigits(updated);
                                if (clean && idx < 5) loginOtpRefs.current[idx + 1]?.focus();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !loginOtpDigits[idx] && idx > 0) {
                                  loginOtpRefs.current[idx - 1]?.focus();
                                }
                              }}
                              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border-2 transition outline-hidden ${
                                digit
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                                  : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>الصلاحية: {Math.floor(loginOtpExpiry / 60)}:{loginOtpExpiry % 60 < 10 ? '0' : ''}{loginOtpExpiry % 60}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoginOtpLoading || loginOtpDigits.join('').length !== 6}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        {isLoginOtpLoading ? (
                          <span>جاري التحقق... ⏳</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>تأكيد الرمز والدخول لمقصورة السائق ✅</span>
                          </>
                        )}
                      </button>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">لم تصلك الرسالة؟</span>
                        <button
                          type="button"
                          onClick={handleSendDriverLoginOtp}
                          disabled={loginOtpCooldown > 0 || isLoginOtpLoading}
                          className={`flex items-center gap-1 font-bold text-xs transition cursor-pointer ${
                            loginOtpCooldown > 0
                              ? 'text-slate-400 cursor-not-allowed'
                              : 'text-emerald-700 hover:text-emerald-900 underline'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{loginOtpCooldown > 0 ? `إعادة الإرسال (${loginOtpCooldown}ث)` : 'إعادة الإرسال الآن 🔄'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

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
            </div>
          ) : (
            /* ==================== REGISTRATION FORM ==================== */
            <div className="max-h-[68vh] overflow-y-auto pr-1">
              {registerSuccess ? (
                <div className="py-10 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">تم توثيق وتفعيل حساب السائق بنجاح! 🟢</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    تم التحقق من رقم الهاتف وتفعيل سيارتك برمز OTP في أسطول تاكسي الأبيض سيدي الشيخ.
                  </p>
                </div>
              ) : registerStep === 'otp' ? (
                /* Registration Step 2: OTP Verification */
                <form onSubmit={handleVerifyDriverRegisterOtp} className="space-y-4 py-2 animate-in fade-in">
                  <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-extrabold text-xs block text-amber-950">
                          رمز توثيق السائق عبر البريد الإلكتروني (Email OTP):
                        </span>
                        <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
                          تم إرسال رمز التحقق إلى بريدك الإلكتروني <strong className="font-mono text-amber-950" dir="ltr">{email}</strong> مجاناً عبر خدمة Supabase وبدون أي تكلفة SMS.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200 text-[11px] text-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).</span>
                      </div>
                      <a
                        href={getEmailProviderInfo(email).url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 shrink-0 bg-amber-100/60 px-2 py-1 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح {getEmailProviderInfo(email).name}</span>
                      </a>
                    </div>
                  </div>

                  {registerError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">بريد السائق المعتمد:</span>
                      <span className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                        {email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegisterStep('form')}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      تعديل البيانات
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block text-center">
                      أدخل رمز التحقق المكون من 6 أرقام:
                    </label>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
                      {driverOtpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            regOtpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '');
                            if (clean.length > 1) {
                              const pasted = clean.slice(0, 6).split('');
                              const updated = [...driverOtpDigits];
                              pasted.forEach((d, i) => { if (i < 6) updated[i] = d; });
                              setDriverOtpDigits(updated);
                              regOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
                              return;
                            }
                            const updated = [...driverOtpDigits];
                            updated[idx] = clean;
                            setDriverOtpDigits(updated);
                            if (clean && idx < 5) regOtpRefs.current[idx + 1]?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !driverOtpDigits[idx] && idx > 0) {
                              regOtpRefs.current[idx - 1]?.focus();
                            }
                          }}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border-2 transition outline-hidden ${
                            digit
                              ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                              : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-amber-500 focus:bg-white'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>الصلاحية: {Math.floor(driverOtpExpiry / 60)}:{driverOtpExpiry % 60 < 10 ? '0' : ''}{driverOtpExpiry % 60}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isDriverOtpLoading || driverOtpDigits.join('').length !== 6}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDriverOtpLoading ? (
                      <span>جاري التحقق وتفعيل الحساب... ⏳</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد الرمز وإتمام التسجيل كصاحب تاكسي ✅</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">لم تصلك الرسالة؟</span>
                    <button
                      type="button"
                      onClick={() => handleRegisterSubmit({ preventDefault: () => {} } as React.FormEvent)}
                      disabled={driverOtpCooldown > 0 || isDriverOtpLoading}
                      className={`flex items-center gap-1 font-bold text-xs transition cursor-pointer ${
                        driverOtpCooldown > 0
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-amber-700 hover:text-amber-900 underline'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{driverOtpCooldown > 0 ? `إعادة الإرسال (${driverOtpCooldown}ث)` : 'إعادة إرسال الرمز 🔄'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Registration Step 1: Form */
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">انضم لشبكة سائقي الأبيض سيدي الشيخ:</strong>
                      سجل بياناتك وسيارتك، وسيتم التحقق من هاتفك برمز OTP لتفعيل حسابك وضمان أمانك.
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
                    disabled={isDriverOtpLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {isDriverOtpLoading ? (
                      <span>جاري إرسال رمز التحقق... ⏳</span>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        <span>متابعة والتحقق برمز البريد (Email OTP) ✉️</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
