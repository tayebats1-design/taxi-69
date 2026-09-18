import React, { useState } from 'react';
import { 
  Share2, 
  ShieldCheck, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  Phone, 
  ExternalLink, 
  Car, 
  MapPin, 
  Clock, 
  Smartphone,
  X,
  AlertCircle
} from 'lucide-react';
import { Driver, RideRequest } from '../../types';

interface TripSafetyShareProps {
  activeRide: RideRequest;
  assignedDriver: Driver | null;
  className?: string;
  buttonVariant?: 'compact' | 'full' | 'banner';
}

export const TripSafetyShare: React.FC<TripSafetyShareProps> = ({
  activeRide,
  assignedDriver,
  className = '',
  buttonVariant = 'full',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!assignedDriver) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const nowTime = new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

  const statusLabel = 
    activeRide.status === 'driver_arriving' ? 'السائق في الطريق لموقع الانطلاق' :
    activeRide.status === 'driver_arrived' ? 'السائق وصل وينتظر الركوب' :
    activeRide.status === 'in_progress' ? 'الرحلة جارية حالياً نحو الوجهة' : 'رحلة نشطة';

  // Build the rich safety text to share
  const shareText = `🛡️ مشاركة تفاصيل رحلة تاكسي آمنة (الأبيض سيدي الشيخ)
─────────────────────
👤 السائق: ${assignedDriver.name}
🚗 السيارة: ${assignedDriver.carModel} (${assignedDriver.carColor})
🔢 لوحة الترقيم: ${assignedDriver.plateNumber}
${assignedDriver.showPhoneToCustomer === false ? '🔒 هاتف السائق: محمي بطلب السائق (خاص بإدارة المنظومة)' : `📞 هاتف السائق: ${assignedDriver.phone}`}
⭐ التقييم: ${assignedDriver.rating} نجوم (${assignedDriver.totalTrips} رحلة مكتملة)

📍 الانطلاق: ${activeRide.pickupDistrict.nameAr}
🏁 الوجهة: ${activeRide.dropoffDistrict.nameAr}
⏱️ التوقيت: ${nowTime} (${statusLabel})
${activeRide.estimatedPrice ? `💰 الأجرة: ${activeRide.estimatedPrice} دج` : ''}

🔗 تتبع الرحلة والتطبيق:
${currentUrl || 'تطبيق تاكسي الأبيض سيدي الشيخ'}
─────────────────────
أشارككم هذه التفاصيل لحفظ الأمان وسلامة التنقل.`;

  // 1. Native Web Share API (Works on mobile browsers like Chrome, Safari, Android, iOS)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `تفاصيل رحلة تاكسي: ${assignedDriver.name} (${assignedDriver.plateNumber})`,
          text: shareText,
          url: currentUrl || undefined,
        });
        setShareFeedback('تم فتح نافذة المشاركة بنجاح');
        setTimeout(() => setShareFeedback(null), 3500);
      } catch (err) {
        // User cancelled or share failed, open fallback modal
        if ((err as Error)?.name !== 'AbortError') {
          setIsModalOpen(true);
        }
      }
    } else {
      // Fallback: Open social apps modal
      setIsModalOpen(true);
    }
  };

  // 2. Copy to clipboard
  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        // Fallback for older environments
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setShareFeedback('تم نسخ تفاصيل السائق والرحلة بنجاح إلى الحافظة!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3500);
    } catch {
      setShareFeedback('تعذر النسخ التلقائي، يمكنك تحديد النص ونسخه يدوياً');
    }
  };

  // 3. Social Apps URL Builders
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;

  return (
    <>
      {/* Trigger Buttons depending on chosen variant */}
      {buttonVariant === 'banner' && (
        <div className={`p-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl border border-emerald-500/40 shadow-md flex flex-wrap items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <span>ميزة أمان الراكب والأسرة</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                شارك بيانات السائق ولوحة السيارة فوراً مع عائلتك على الواتساب أو الرسائل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-950" />
              <span>مشاركة الرحلة الآن</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
              title="خيارات المشاركة المتعددة"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>خيارات</span>
            </button>
          </div>
        </div>
      )}

      {buttonVariant === 'compact' && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${className}`}
          title="مشاركة تفاصيل السائق والرحلة للأمان"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>مشاركة للأمان 🛡️</span>
        </button>
      )}

      {buttonVariant === 'full' && (
        <div className={`space-y-2 ${className}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>مشاركة تفاصيل الرحلة للأمان</span>
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-slate-300"
              title="تطبيقات التواصل الاجتماعي"
            >
              <Smartphone className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Comprehensive Social Share & Security Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-150 font-['Cairo',sans-serif]">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-emerald-500/40 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 md:p-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs text-amber-300 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-1.5">
                    <span>مشاركة تفاصيل الرحلة للأمان</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                      أمان العائلة
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    أرسل بيانات السائق ورقم اللوحة لأحد أفراد أسرتك أو أصدقائك
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 md:p-5 space-y-4 overflow-y-auto text-right">
              {/* Quick Info Summary Card */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <img
                      src={assignedDriver.avatar}
                      alt={assignedDriver.name}
                      className="w-11 h-11 rounded-xl object-cover border border-amber-400"
                    />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{assignedDriver.name}</h4>
                      <p className="text-xs text-slate-600 font-bold">
                        {assignedDriver.carModel} · {assignedDriver.carColor}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-500 font-bold">لوحة الترقيم</div>
                    <div className="px-2.5 py-1 bg-amber-100 text-amber-950 font-mono font-black text-xs rounded-lg border border-amber-300">
                      {assignedDriver.plateNumber}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">الانطلاق:</span>
                    <span className="font-extrabold text-slate-800">{activeRide.pickupDistrict.nameAr}</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">الوجهة:</span>
                    <span className="font-extrabold text-slate-800">{activeRide.dropoffDistrict.nameAr}</span>
                  </div>
                </div>
              </div>

              {/* Share via Social Apps Grid */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-900 block">
                  اختر تطبيق المشاركة على هاتفك:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-emerald-900 group shadow-2xs cursor-pointer active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <MessageCircle className="w-5 h-5 fill-white" />
                    </div>
                    <span className="text-xs font-black">واتساب</span>
                    <span className="text-[10px] text-emerald-700">WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-sky-900 group shadow-2xs cursor-pointer active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <Send className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black">تيليجرام</span>
                    <span className="text-[10px] text-sky-700">Telegram</span>
                  </a>

                  {/* SMS Message */}
                  <a
                    href={smsUrl}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-indigo-900 group shadow-2xs cursor-pointer active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black">رسالة SMS</span>
                    <span className="text-[10px] text-indigo-700">Messages</span>
                  </a>

                  {/* Native Device Share Sheet */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-amber-950 group shadow-2xs cursor-pointer active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black">تطبيقات أخرى</span>
                    <span className="text-[10px] text-amber-800">كل التطبيقات</span>
                  </button>
                </div>
              </div>

              {/* Formatted Message Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    معاينة نص الرسالة المرسلة:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ النص كاملاً</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl text-xs font-mono whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto border border-slate-800 select-all">
                  {shareText}
                </div>
              </div>

              {/* Feedback toast banner */}
              {shareFeedback && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{shareFeedback}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ التفاصيل' : 'نسخ النص'}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال ومشاركة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
