import React, { useState, useEffect } from 'react';
import { 
  isSupabaseConfigured, 
  SUPABASE_SQL_SCHEMA, 
  SUPABASE_CONFIG,
  testSupabaseConnection,
  syncDriverToSupabase,
  getSupabase
} from '../../lib/supabase';
import { INITIAL_DRIVERS } from '../../data/mockDrivers';
import { Database, CheckCircle, AlertCircle, Copy, Check, RefreshCw, UploadCloud, X } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    connected: boolean;
    tablesExist: boolean;
    message: string;
  } | null>(null);

  const isConnected = isSupabaseConfigured();

  const handleTestConnection = async () => {
    setIsChecking(true);
    try {
      const res = await testSupabaseConnection();
      setCheckResult(res);
    } catch (err: any) {
      setCheckResult({
        connected: false,
        tablesExist: false,
        message: err.message || 'حدث خطأ في فحص الاتصال',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeedDrivers = async () => {
    setIsSeeding(true);
    let successCount = 0;
    for (const d of INITIAL_DRIVERS) {
      const ok = await syncDriverToSupabase(d);
      if (ok) successCount++;
    }
    setIsSeeding(false);
    handleTestConnection();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 text-right space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold bg-emerald-600 text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">ربط مشروعك في Supabase</h3>
              <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                {SUPABASE_CONFIG.url.replace('https://', '')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          checkResult?.tablesExist
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : checkResult?.connected
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          {checkResult?.tablesExist ? (
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs flex-1">
            <div className="font-black text-sm">
              {checkResult?.tablesExist
                ? 'قاعدة البيانات متصلة والجداول تعمل بنجاح! 🟢'
                : checkResult?.connected
                ? 'المشروع متصل - يتبقى تشغيل كود إنشاء الجداول ⚡'
                : 'جاري فحص الاتصال بـ Supabase...'}
            </div>
            <p className="mt-1 opacity-90 leading-relaxed text-[11px]">
              {checkResult?.message || 'يتم التحقق من الاتصال بمشروعك في Supabase...'}
            </p>

            {/* Test connection button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isChecking}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
                <span>إعادة فحص الاتصال</span>
              </button>

              {checkResult?.tablesExist && (
                <button
                  onClick={handleSeedDrivers}
                  disabled={isSeeding}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white flex items-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>{isSeeding ? 'جاري الرفع...' : 'مزامنة السائقين الآن'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="font-black text-slate-900 text-xs">خطوة واحدة سهلة لتفعيل الجداول:</div>
          <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] text-slate-600 leading-relaxed">
            <li>افتح مشروعك في Supabase واضغط على <strong>SQL Editor</strong>.</li>
            <li>اضغط على <strong>New Query</strong> والصق الكود الموجود أسفله.</li>
            <li>اضغط <strong>Run</strong> لتجهيز جدولي <code>drivers</code> و <code>rides</code> مع التزامن المباشر.</li>
          </ol>
        </div>

        {/* SQL Schema Code Box */}
        <div className="relative">
          <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-xl text-[11px] font-mono">
            <span>supabase_schema.sql</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ كود SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-emerald-300 p-3 rounded-b-xl text-[10px] font-mono overflow-x-auto max-h-40 text-left" dir="ltr">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          تم، إغلاق
        </button>
      </div>
    </div>
  );
};
