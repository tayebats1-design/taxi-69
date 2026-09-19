import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  ArrowRight, 
  Share2, 
  PlusSquare, 
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk_builder' | 'flutter'>('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // Manual browser guide alert or fallback
      setActiveTab('pwa');
    }
  };

  const handleCopyAppUrl = () => {
    try {
      const url = window.location.origin;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-ezxp5jvl2wpij7wtno3aus-101194866373.europe-west2.run.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-300 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  تثبيت التطبيق على الهاتف (APK / PWA)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/40">
                  الأبيض سيدي الشيخ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                طرق تشغيل وتثبيت التطبيق بصيغة APK أصلية أو تطبيق جوال فوري
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'pwa'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>تثبيت فوري بدون متجر (PWA)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black">
              أسهل وأسرع
            </span>
          </button>

          <button
            onClick={() => setActiveTab('apk_builder')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'apk_builder'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>تحويل إلى ملف APK أندرويد</span>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-black">
              ملف .apk
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flutter')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'flutter'
                ? 'border-blue-600 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-500" />
            <span>مشروع Flutter Native</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-sm">
          {/* TAB 1: PWA Immediate Install (Same experience as native APK) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm font-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-950 text-sm">
                      تثبيت التطبيق مباشرة على هاتفك الآن
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      يعمل التطبيق كـ <strong>Progressive Web App (PWA)</strong> معتمد؛ يُثبت على هاتفك مثل أي تطبيق APK من Google Play بأيقونة رسمية، ويعمل في وضع ملء الشاشة بدون شريط المتصفح وبنظام الإشعارات والتتبع GPS.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200 flex flex-col sm:flex-row items-center gap-2">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallPwa}
                      disabled={isInstalling}
                      className="w-full sm:w-auto flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>اضغط هنا لتثبيت التطبيق على الشاشة الرئيسية فوراً</span>
                    </button>
                  ) : isInstalled ? (
                    <div className="w-full py-2.5 px-4 bg-emerald-100 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>التطبيق مثبت بالفعل على جهازك في وضع التطبيق الكامل! ✓</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstallPwa}
                      className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>طلب التثبيت المباشر</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopyAppUrl}
                    className="w-full sm:w-auto py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="نسخ رابط التطبيق لفتحه على الهاتف"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط التطبيق'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions for Android Chrome */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h5 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px]">
                    1
                  </span>
                  <span>طريقة التثبيت السريع عبر متصفح الهاتف (Android / Chrome):</span>
                </h5>
                <ol className="text-xs text-slate-600 space-y-2 pr-5 list-decimal leading-relaxed">
                  <li>افتح رابط التطبيق في متصفح <strong>Google Chrome</strong> على هاتفك.</li>
                  <li>اضغط على زر الخيارات (<strong>الثلاث نقاط ⋮</strong>) أعلى المتصفح.</li>
                  <li>اختر <strong>"تثبيت التطبيق" (Install App)</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية" (Add to Home screen)</strong>.</li>
                  <li>سيظهر التطبيق فوراً على شاشة هاتفك بأيقونة <strong>تاكسي الأبيض سيدي الشيخ</strong> ويعمل كتطبيق كامل ومستقل.</li>
                </ol>
              </div>

              {/* Instructions for iOS iPhone */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h5 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px]">
                    2
                  </span>
                  <span>لمستخدمي آيفون (iOS / Safari):</span>
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  اضغط على زر المشاركة (
                  <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" />
                  ) في متصفح Safari، ثم اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> (Add to Home Screen).
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Generate Real Android .APK File */}
          {activeTab === 'apk_builder' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm font-black">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-indigo-950 text-sm">
                      كيفية استخراج وتحميل ملف APK أندرويد حقيقي (.apk)
                    </h4>
                    <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                      يمكنك تحويل هذا التطبيق فوراً إلى ملف APK جاهز للتثبيت على هواتف الأندرويد وإرساله للسائقين والزبائن عبر واتساب أو تليغرام، باستخدام أدوات تحويل PWA إلى APK المعتمدة من Google:
                    </p>
                  </div>
                </div>
              </div>

              {/* Tool 1: PWABuilder (Official Microsoft / Google Tool) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono font-black text-xs">
                      الخيار الموصى به ⭐
                    </span>
                    <h5 className="font-black text-slate-900 text-sm">PWABuilder (بناء APK في دقيقة واحدة)</h5>
                  </div>
                  <a
                    href={`https://www.pwabuilder.com/?url=${encodeURIComponent(appUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>فتح PWABuilder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <ol className="text-xs text-slate-600 space-y-2 pr-5 list-decimal leading-relaxed">
                  <li>
                    انسخ رابط التطبيق:
                    <div className="my-1.5 p-2 bg-slate-100 rounded-xl flex items-center justify-between text-[11px] font-mono select-all text-slate-900">
                      <span className="truncate max-w-[280px] sm:max-w-md">{appUrl}</span>
                      <button
                        onClick={handleCopyAppUrl}
                        className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-800 font-sans font-bold text-[10px] shrink-0 cursor-pointer"
                      >
                        {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
                      </button>
                    </div>
                  </li>
                  <li>توجه لموقع <strong>PWABuilder.com</strong> والصق الرابط، ثم اضغط <strong>Start</strong>.</li>
                  <li>اضغط على <strong>Android Package (Generate APK / AAB)</strong>.</li>
                  <li>اختر <strong>Download APK</strong> لتحميل حزمة التثبيت المباشرة لهواتف سامسونج، شاومي، وأوبو.</li>
                </ol>
              </div>

              {/* Tool 2: WebIntoApp */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-900 text-sm">خيار بديل: WebIntoApp / AppsGeyser</h5>
                  <a
                    href="https://www.webintoapp.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>فتح WebIntoApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  يمكنك أيضاً إدخال رابط التطبيق في أي صانع APK مجاني مثل WebIntoApp أو Hermit وسيقوم بتوليد ملف <code>saykh_taxi.apk</code> جاهز للتحميل والتثبيت فوراً.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Flutter Native Project */}
          {activeTab === 'flutter' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm font-black">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-blue-950 text-sm">
                      مشروع كود Flutter الأصلي (saykh_taxi)
                    </h4>
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      يحتوي هذا المشروع على مجلد كامل <code>saykh_taxi/</code> مبني بتقنية Flutter و Dart مع Firebase و Google Maps، جاهز للتجميع المباشر عبر Android Studio أو سطر الأوامر.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto">
                <p className="text-emerald-400 font-bold font-sans text-xs mb-1">
                  أوامر تجميع APK من مشروع Flutter المحلي:
                </p>
                <p className="text-slate-400"># 1. الدخول لمجلد مشروع Flutter</p>
                <p className="text-amber-300">cd saykh_taxi</p>
                <p className="text-slate-400 mt-2"># 2. تثبيت الحزم</p>
                <p className="text-amber-300">flutter pub get</p>
                <p className="text-slate-400 mt-2"># 3. بناء ملف APK الإنتاجي</p>
                <p className="text-emerald-300 font-bold">flutter build apk --release</p>
                <p className="text-slate-400 mt-2"># تجد الملف الناتج في:</p>
                <p className="text-blue-300">build/app/outputs/flutter-apk/app-release.apk</p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                يمكنك أيضاً استعراض جميع ملفات Dart وشاشات الركاب والسائقين في شريط التنقل العلوي عبر زر <strong>"مشروع Flutter 📱"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>تطبيق آمن معتمد لبلدية الأبيض سيدي الشيخ</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
