import React, { useState, useEffect, useRef } from 'react';
import { 
  sendOTP, 
  verifyOTP, 
  getResendCooldownRemaining, 
  normalizePhoneNumber,
  detectCarrierName 
} from '../../services/otpService';
import { CustomerUser } from '../../types';
import { 
  ShieldCheck, 
  Phone, 
  User, 
  ArrowRight, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Smartphone, 
  X,
  Send,
  Check,
  MessageSquare
} from 'lucide-react';
import { listenForWebOTP, formatAlgerianPhoneE164 } from '../../services/smsService';
import { sounds } from '../../utils/audio';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialName?: string;
  userType: 'customer' | 'driver';
  onVerificationSuccess: (result: { phone: string; name: string; customer?: CustomerUser }) => void;
  titleAr?: string;
  subtitleAr?: string;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialName = '',
  userType,
  onVerificationSuccess,
  titleAr,
  subtitleAr,
}) => {
  // Step: 'phone' (1. إدخال رقم الهاتف) vs 'otp' (2. إدخال الرمز والتأكيد)
  const [step, setStep] = useState<'phone' | 'otp'>(initialPhone ? 'phone' : 'phone');
  
  // Inputs
  const [name, setName] = useState(initialName || (userType === 'driver' ? 'كابتن السائق' : 'زبون الأبيض سيدي الشيخ'));
  const [phone, setPhone] = useState(initialPhone || '');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  // Timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(300); // 5 minutes
  
  // Input refs for 6-digit auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync initial values
  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
    if (initialName) {
      setName(initialName);
    }
  }, [initialPhone, initialName]);

  // Resend countdown timer (60s)
  useEffect(() => {
    if (!isOpen || step !== 'otp') return;

    // Check existing cooldown
    const remaining = getResendCooldownRemaining(phone, userType);
    setResendCooldown(remaining);

    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, step, phone, userType]);

  // Listen for real SMS arriving on SIM card via WebOTP API
  useEffect(() => {
    if (!isOpen || step !== 'otp') return;

    const abortController = new AbortController();
    listenForWebOTP(abortController.signal).then((smsCode) => {
      if (smsCode && smsCode.length >= 6) {
        const clean = smsCode.replace(/\D/g, '').slice(0, 6);
        if (clean.length === 6) {
          setOtpDigits(clean.split(''));
          setErrorMsg(null);
          sounds.playArrivalChime();
        }
      }
    });

    return () => {
      abortController.abort();
    };
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Handle Step 1: Send OTP
  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const clean = normalizePhoneNumber(phone);
    if (!clean || clean.length < 9) {
      setErrorMsg('يرجى كتابة رقم هاتف صحيح مكون من 10 أرقام (مثال: 0661234567)');
      setIsLoading(false);
      return;
    }

    try {
      const result = await sendOTP({
        phone: clean,
        userType,
        userName: name.trim() || 'المستخدم',
      });

      setIsLoading(false);

      if (result.success) {
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setExpirySeconds(300); // 5 minutes
        // Focus first OTP digit
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMsg(result.message);
        if (result.cooldownRemaining) {
          setResendCooldown(result.cooldownRemaining);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('حدث خطأ أثناء إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
    }
  };

  // Handle Digit Change
  const handleDigitChange = (index: number, val: string) => {
    // Only numbers
    const cleanChar = val.replace(/\D/g, '');
    
    // Handle paste of whole 6-digit code
    if (cleanChar.length > 1) {
      const pastedDigits = cleanChar.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    // Auto move to next input
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2: Confirm OTP
  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('يرجى إدخال جميع أرقام رمز التحقق الـ 6.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOTP({
        phone,
        inputCode: fullCode,
        userType,
        userName: name.trim(),
      });

      setIsLoading(false);

      if (result.success) {
        setIsVerified(true);
        setSuccessMsg(result.message);
        sounds.playArrivalChime();

        setTimeout(() => {
          onVerificationSuccess({
            phone: normalizePhoneNumber(phone),
            name: name.trim(),
            customer: result.customer,
          });
          onClose();
        }, 1300);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('حدث خطأ أثناء التحقق من الرمز. يرجى إعادة المحاولة.');
    }
  };

  const carrier = detectCarrierName(phone);
  const minutes = Math.floor(expirySeconds / 60);
  const seconds = expirySeconds % 60;
  const expiryFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-['Cairo',sans-serif]">
      <div 
        id="otp-verification-modal"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {userType === 'driver' ? '🚕' : '🟢'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span className="text-[11px] font-bold text-emerald-100">
                  {userType === 'driver' ? 'توثيق حساب السائق (Driver OTP)' : 'توثيق حساب الزبون (Customer OTP)'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-0.5">
                {titleAr || (userType === 'driver' ? 'التحقق وتفعيل حساب السائق' : 'التحقق برمز الـ OTP وتفعيل الحساب')}
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 mt-2">
            {subtitleAr || 'نظام التوثيق الرسمي لضمان أمان الرحلات ومصداقية المستخدمين بالأبيض سيدي الشيخ'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Success Banner */}
          {isVerified && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="font-black text-emerald-900 text-sm">
                تم التحقق وتفعيل الحساب بنجاح!
              </div>
              <p className="text-xs text-emerald-700">
                حسابك الآن موثق برمز OTP ومفعل في قاعدة بيانات تاكسي الأبيض سيدي الشيخ.
              </p>
            </div>
          )}

          {!isVerified && (
            <>
              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: Phone Number Input (شاشة إدخال رقم الهاتف) */}
              {step === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  {/* Name field (if customer or custom name) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الاسم الكامل:
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl focus-within:border-emerald-500 focus-within:bg-white transition">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="الاسم واللقب..."
                        className="w-full bg-transparent text-xs font-bold text-slate-900 outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Phone field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        رقم الهاتف المحمول:
                      </label>
                      <span className="text-[10px] text-slate-500">
                        الجزائر (+213)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl focus-within:border-emerald-500 focus-within:bg-white transition" dir="ltr">
                      <div className="flex items-center gap-1.5 border-r border-slate-300 pr-2 mr-1 shrink-0">
                        <span className="text-sm">🇩🇿</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">+213</span>
                      </div>
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0661 23 45 67"
                        className="w-full bg-transparent text-xs font-bold text-slate-900 outline-hidden font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>يدعم متعاملي الهاتف: موبيليس (06)، جازي (07)، أوريدو (05)</span>
                      {phone.length >= 2 && (
                        <span className="font-bold text-emerald-700">{carrier}</span>
                      )}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>جاري إرسال رمز التحقق... ⏳</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>إرسال رمز التحقق (OTP) عبر SMS 📩</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP Code Input (شاشة إدخال الرمز) */}
              {step === 'otp' && (
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  {/* Delivery notification: explicitly to SIM card */}
                  <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-extrabold text-xs block text-emerald-950">
                          الرمز يصل مباشرة إلى شريحة الهاتف (SIM):
                        </span>
                        <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                          تم إرسال رسالة SMS نصية إلى شريحة SIM التابعة للرقم <strong className="font-mono text-emerald-950" dir="ltr">{formatAlgerianPhoneE164(phone)}</strong> عبر شبكة <strong>{carrier}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>🔒 لا يظهر الرمز داخل التطبيق لحماية الخصوصية.</span>
                      </div>
                      <a
                        href={`sms:${formatAlgerianPhoneE164(phone)}`}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>فتح الرسائل</span>
                      </a>
                    </div>
                  </div>

                  {/* Sent Phone Notification Header */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">رقم الهاتف المحدد:</span>
                      <span className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                        {normalizePhoneNumber(phone)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                    >
                      تغيير الرقم
                    </button>
                  </div>

                  {/* 6-Digit OTP Inputs */}
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

                    {/* Expiration Timer Indicator */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-2 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>صلاحية الرمز تنتهي بعد:</span>
                      <span className={`font-bold ${expirySeconds < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                        {expiryFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span>جاري مطابقة الرمز وتفعيل الحساب... ⏳</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد الرمز وتفعيل الحساب الآن ✅</span>
                      </>
                    )}
                  </button>

                  {/* Resend Button with 60s Countdown Timer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">لم يصلك الرمز؟</span>

                    <button
                      type="button"
                      onClick={() => handleSendOTP()}
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
                          ? `إعادة إرسال الرمز بعد (${resendCooldown}ث)`
                          : 'إعادة إرسال رمز التحقق الآن 🔄'}
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
