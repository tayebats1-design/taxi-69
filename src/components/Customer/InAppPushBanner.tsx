import React, { useState, useEffect } from 'react';
import { 
  PushNotificationPayload, 
  subscribeToPushNotifications 
} from '../../services/pushNotification';
import { Bell, X, MapPin, Sparkles, Navigation } from 'lucide-react';

export const InAppPushBanner: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<PushNotificationPayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPushNotifications((notification) => {
      setCurrentNotification(notification);
      setIsVisible(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8500);

    return () => clearTimeout(timer);
  }, [isVisible, currentNotification]);

  if (!isVisible || !currentNotification) {
    return null;
  }

  return (
    <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md animate-in slide-in-from-top-4 duration-300 font-['Cairo',sans-serif]">
      <div className="bg-slate-950/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-400/90 ring-4 ring-amber-400/20">
        {/* Header: App Brand + Push badge + Dismiss button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-xs">
              🚕
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-white">تاكسي الأبيض سيدي الشيخ</span>
              <span className="text-[10px] text-slate-400">· إشعار دفع Push</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentNotification.isTest && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-[9px] border border-amber-400/40">
                تجريبي 🧪
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">الآن</span>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="إغلاق الإشعار"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification Body */}
        <div className="pt-2.5 flex items-start gap-3">
          {/* Pulsing Alert Radar Icon */}
          <div className="relative w-10 h-10 shrink-0 mt-0.5">
            <div className="absolute inset-0 rounded-xl bg-amber-400/30 animate-ping" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              <Bell className="w-5 h-5 fill-slate-950 animate-bounce" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-black text-xs sm:text-sm text-amber-300">
                {currentNotification.title}
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-200 mt-1 leading-relaxed">
              {currentNotification.body}
            </p>

            {/* Distance & Proximity Highlights */}
            {currentNotification.distanceMeters !== undefined && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>المسافة: {currentNotification.distanceMeters} متر</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 font-black text-[10px] border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>أقل من 100 متر (قريب جداً)</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive action buttons */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            حسناً، أنا مستعد 🚕
          </button>
        </div>
      </div>
    </div>
  );
};
