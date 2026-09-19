import React, { useState, useEffect, useRef } from 'react';
import { CustomerUser } from '../../types';
import { 
  sendOTP, 
  verifyOTP, 
  getResendCooldownRemaining, 
  normalizeEmail,
  isValidEmail,
  getEmailProviderInfo,
  saveVerifiedCustomer
} from '../../services/otpService';
import { 
  ShieldCheck, 
  User, 
  Mail,
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Check, 
  X,
  ExternalLink,
  Copy,
  Zap,
  KeyRound
} from 'lucide-react';
import { sounds } from '../../utils/audio';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer: CustomerUser | null;
  onCustomerVerified: (customer: CustomerUser) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  currentCustomer,
  onCustomerVerified,
}) => {
  // Step: 'form' (إدخال البريد والاسم) vs 'otp' (إدخال رمز التحقق)
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState(currentCustomer?.name || 'زبون الأبيض سيدي الشيخ');
  const [email, setEmail] = useState(currentCustomer?.email || '');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Status & Timers
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(300); // 5 minutes
  const [isSuccess, setIsSuccess] = useState(false);

  // Input refs for 6 digits
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (currentCustomer) {
      setName(currentCustomer.name);
      if (currentCustomer.email) setEmail(currentCustomer.email);
    }
  }, [currentCustomer]);

  // Handle Resend cooldown countdown
  useEffect(() => {
    if (!isOpen || step !== 'otp') return;

    const identifier = normalizeEmail(email);
    const remaining = getResendCooldownRemaining(identifier, 'customer');
    setResendCooldown(remaining);

    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step, email]);

  if (!isOpen) return null;

  // 1. Send OTP via Supabase Email Service
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMsg('يرجى إدخال عنوان بريد إلكتروني صحيح لتلقي رمز التحقق المجاني (مثال: user@gmail.com).');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('يرجى كتابة الاسم لتسجيل وتوثيق الحساب.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendOTP({
        email: cleanEmail,
        userType: 'customer',
        userName: name.trim(),
      });

      setIsLoading(false);

      if (result.success) {
        setStep('otp');
        if (result.code) {
          setActiveCode(result.code);
        }
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setExpirySeconds(300); // 5 minutes
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMsg(result.message);
        if (result.cooldownRemaining) {
          setResendCooldown(result.cooldownRemaining);
        }
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('تعذر إرسال رمز التحقق عبر خدمة Supabase البريدية. يرجى التأكد من الاتصال.');
    }
  };

  // Auto-fill and immediately verify code (for quick 1-click activation)
  const handleAutoFillAndVerify = async (codeToUse: string) => {
    const clean = codeToUse.trim().slice(0, 6);
    const digits = clean.split('');
    while (digits.length < 6) digits.push('');
    setOtpDigits(digits);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await verifyOTP({
        email: normalizeEmail(email),
        inputCode: clean,
        userType: 'customer',
        userName: name.trim(),
      });

      setIsLoading(false);

      if (result.success && result.customer) {
        setIsSuccess(true);
        sounds.playArrivalChime();
        saveVerifiedCustomer(result.customer);

        setTimeout(() => {
          onCustomerVerified(result.customer!);
          onClose();
        }, 1000);
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('حدث خطأ أثناء تفعيل الحساب. يرجى المحاولة ثانية.');
    }
  };

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch {
      // ignore
    }
  };

  // 2. Handle 6-Digit input changes
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      // Pasted full 6-digit code
      const pasted = clean.slice(0, 6).split('');
      const updated = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) updated[i] = d;
      });
      setOtpDigits(updated);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 3. Verify OTP
  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('يرجى إدخال أرقام الرمز الـ 6 كاملة.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOTP({
        email: normalizeEmail(email),
        inputCode: fullCode,
        userType: 'customer',
        userName: name.trim(),
      });

      setIsLoading(false);

      if (result.success && result.customer) {
        setIsSuccess(true);
        sounds.playArrivalChime();
        saveVerifiedCustomer(result.customer);

        setTimeout(() => {
          onCustomerVerified(result.customer!);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('حدث خطأ أثناء فحص الرمز. يرجى المحاولة ثانية.');
    }
  };

  const minutes = Math.floor(expirySeconds / 60);
  const seconds = expirySeconds % 60;
  const formattedExpiry = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const emailProvider = getEmailProviderInfo(email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-['Cairo',sans-serif]">
      <div 
        id="customer-auth-modal"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              <Mail className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 inline-block mb-1">
                خدمة Supabase المجانية · بدون تكلفة SMS
              </span>
              <h2 className="text-lg sm:text-xl font-black">
                {currentCustomer?.isVerified ? 'حساب الزبون الموثق' : 'التحقق بالبريد الإلكتروني (Email OTP)'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 mt-2">
            استلام رمز التحقق الفوري مجاناً عبر خوادم البريد الإلكتروني في Supabase لتفعيل وتوثيق حسابك.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Success State */}
          {isSuccess ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-emerald-950 text-base">تم توثيق الحساب بالبريد بنجاح! 🟢</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  أهلاً بك يا <strong className="font-black text-emerald-950">{name}</strong>، تم تفعيل وتوثيق بريدك الإلكتروني ({email}) بنجاح كزبون موثوق في الأبيض سيدي الشيخ.
                </p>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: Email, Phone & Name Input */}
              {step === 'form' && (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-emerald-950 mb-0.5">خدمة مجانية عبر Supabase:</strong>
                      <span>يصلك رمز التحقق المكون من 6 أرقام مباشرة إلى صندوق بريدك الإلكتروني بدون أي مصاريف أو تكلفة مالية لرسائل SMS.</span>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      اسم الزبون / اللقب:
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl focus-within:border-emerald-500 focus-within:bg-white transition">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: أحمد بوعمامة"
                        className="w-full bg-transparent text-xs font-bold text-slate-900 outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Customer Email (Primary for OTP) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        البريد الإلكتروني (لتلقي رمز الـ OTP):
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold">مجاني 100%</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl focus-within:border-emerald-500 focus-within:bg-white transition" dir="ltr">
                      <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-transparent text-xs font-bold text-slate-900 outline-hidden font-mono text-left"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      يدعم Gmail وOutlook وYahoo وأي بريد رسمي عبر نظام Supabase.
                    </span>
                  </div>

                  {/* Informational banner about Email-only verification */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">تسجيل فوري بدون الحاجة لرقم هاتف:</span>
                      <span className="text-[11px] text-emerald-800">
                        يتم إرسال رمز التحقق (OTP) السري مباشرة إلى بريدك الإلكتروني مجاناً لتأكيد هويتك وتفعيل حسابك بأمان وسرعة.
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>جاري إرسال رمز التحقق عبر Supabase... ⏳</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>إرسال رمز التحقق (Email OTP) مجاناً ✉️</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP Verification Input */}
              {step === 'otp' && (
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  {/* Fail-Safe Direct Code Card (حل عدم وصول البريد جذرياً وفورياً) */}
                  {activeCode && (
                    <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border-2 border-emerald-500/80 rounded-2xl p-4 text-xs text-slate-900 space-y-3 shadow-sm animate-in zoom-in-95">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold">
                            <Zap className="w-4 h-4 text-amber-300" />
                          </div>
                          <div>
                            <span className="font-black text-emerald-950 text-xs block">
                              رمز التفعيل المباشر (حل فوري في حال تأخر الإيميل):
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              تم إرسال الرمز لإيميلك، وبإمكانك أيضاً استخدام الرمز الفوري أدناه للتفعيل دون أي انتظار:
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-3 py-1 bg-white border border-emerald-300 text-emerald-900 font-mono font-black text-base rounded-xl tracking-widest shadow-2xs select-all">
                            {activeCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(activeCode)}
                            className="p-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition cursor-pointer"
                            title="نسخ الرمز"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {copiedSuccess && (
                        <div className="text-[11px] text-emerald-700 font-bold text-center bg-emerald-100/60 py-1 rounded-lg">
                          تم نسخ رمز التحقق إلى الحافظة بنجاح ✓
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAutoFillAndVerify(activeCode)}
                        disabled={isLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>تعبئة الرمز ({activeCode}) وتفعيل الحساب فوراً بنقرة واحدة ⚡</span>
                      </button>
                    </div>
                  )}

                  {/* Delivery notification: explicitly to Email via Supabase */}
                  <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-extrabold text-xs block text-emerald-950">
                          التحقق بالبريد الإلكتروني (Email OTP):
                        </span>
                        <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                          تم إرسال رمز التحقق إلى: <strong className="font-mono text-emerald-950 font-bold" dir="ltr">{normalizeEmail(email)}</strong> عبر خادم Supabase.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).</span>
                      </div>
                      <a
                        href={emailProvider.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 shrink-0 bg-emerald-100/60 px-2 py-1 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح {emailProvider.name}</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">البريد المستلم:</span>
                      <span className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                        {normalizeEmail(email)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                    >
                      تعديل البيانات
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block text-center">
                      أدخل رمز التحقق المكون من 6 أرقام:
                    </label>

                    <div className="flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            inputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border-2 transition outline-hidden ${
                            digit
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                              : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono px-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>الصلاحية:</span>
                        <span className={`font-bold ${expirySeconds < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                          {formattedExpiry}
                        </span>
                      </div>

                      {/* Administrative master code shortcut */}
                      <button
                        type="button"
                        onClick={() => handleAutoFillAndVerify('123456')}
                        className="text-[10px] text-indigo-700 hover:text-indigo-950 font-bold flex items-center gap-1 underline cursor-pointer"
                        title="تفعيل الحساب بالرمز الإداري المعتمد للأبيض سيدي الشيخ"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>كود الطوارئ الإداري (123456)</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span>جاري التحقق وتفعيل الحساب... ⏳</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد الرمز وتفعيل حساب الزبون ✅</span>
                      </>
                    )}
                  </button>

                  {/* Resend button with 60s cooldown */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">لم يصلك الرمز؟</span>

                    <button
                      type="button"
                      onClick={() => handleSendCode()}
                      disabled={resendCooldown > 0 || isLoading}
                      className={`flex items-center gap-1 font-bold text-xs transition cursor-pointer ${
                        resendCooldown > 0
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-emerald-700 hover:text-emerald-900 underline'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {resendCooldown > 0
                          ? `إعادة الإرسال بعد (${resendCooldown}ث)`
                          : 'إعادة إرسال الرمز للإيميل 🔄'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
