import React, { useState } from 'react';
import { Shield, Lock, KeyRound, ArrowRight, Eye, EyeOff, AlertCircle, RotateCcw } from 'lucide-react';

interface AdminPinGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminPinGate: React.FC<AdminPinGateProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const storedPin = localStorage.getItem('saykh_admin_pin') || '1234';

    if (pin === storedPin) {
      setErrorMsg(null);
      onSuccess();
    } else {
      setErrorMsg('الرقم السري غير صحيح! يرجى المحاولة مرة أخرى.');
      setPin('');
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const handleResetPinToDefault = () => {
    localStorage.setItem('saykh_admin_pin', '1234');
    setIsResetConfirmOpen(false);
    setErrorMsg('تمت استعادة الرقم السري الافتراضي (1234) بنجاح!');
    setPin('1234');
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-indigo-500/30 text-right space-y-6 font-['Cairo',sans-serif] animate-in zoom-in-95 duration-200">
      {/* Header with Shield Icon */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-lg border border-slate-800">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-xl font-black text-slate-900">
          بوابة الإدارة المركزية ⚙️
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          لوحة تحكم تاكسي الأبيض سيدي الشيخ (ضبط التسعيرات، إدارة السائقين وحذفهم، المراقبة والمالية)
        </p>
      </div>

      {/* Security Info Card */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2.5">
        <Lock className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <span className="font-bold block">منطقة محمية برقم سري (Admin PIN)</span>
          <span className="text-[11px] text-slate-500">الرقم السري الافتراضي للمنظومة: <strong className="font-mono text-indigo-600 font-black">1234</strong> (ويمكنك تغييره بعد الدخول)</span>
        </div>
      </div>

      {/* PIN Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            أدخل الرقم السري للإدارة:
          </label>
          <div className="relative flex items-center">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => {
                setPin(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="••••"
              autoFocus
              className="w-full text-center text-2xl tracking-widest font-mono font-black py-3 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 outline-hidden text-slate-900 transition shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute left-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title={showPin ? 'إخفاء الرقم' : 'إظهار الرقم'}
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Virtual Numpad for Touch / Quick Input */}
        <div className="grid grid-cols-3 gap-2 pt-1" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 text-slate-800 text-lg font-black rounded-xl transition cursor-pointer font-mono shadow-2xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 text-slate-800 text-lg font-black rounded-xl transition cursor-pointer font-mono shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 text-base font-bold rounded-xl transition cursor-pointer active:scale-95"
          >
            ⌫
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={pin.length === 0}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>دخول لوحة التحكم 🔑</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            العودة لواجهة الزبائن ↩️
          </button>
        </div>
      </form>

      {/* Forgot / Reset PIN Accordion */}
      <div className="pt-2 border-t border-slate-100 text-center">
        {!isResetConfirmOpen ? (
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[11px] text-slate-400 hover:text-indigo-600 transition underline cursor-pointer"
          >
            نسيت الرقم السري؟ استعادة الرقم الافتراضي (1234)
          </button>
        ) : (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2 animate-in fade-in">
            <p className="text-amber-900 font-bold">
              هل ترغب في إعادة تعيين الرقم السري إلى الافتراضي (1234)؟
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResetPinToDefault}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                نعم، استعادة 1234
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
