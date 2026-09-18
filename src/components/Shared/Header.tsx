import React, { useState } from 'react';
import { AppRole } from '../../types';
import { Car, User, Shield, Compass, Sparkles, MapPin, Database, Smartphone } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SupabaseModal } from './SupabaseModal';
import { FlutterStructureModal } from './FlutterStructureModal';

interface HeaderProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  activeDriversCount: number;
  onOpenDriverAuth?: (mode: 'login' | 'register') => void;
  activeDriverName?: string;
  isDriverLoggedIn?: boolean;
  onDriverLogout?: () => void;
  activeTab: 'main' | 'map';
  onTabChange: (tab: 'main' | 'map') => void;
  pendingRidesCount?: number;
  isAdminAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  activeDriversCount,
  onOpenDriverAuth,
  activeDriverName,
  isDriverLoggedIn,
  onDriverLogout,
  activeTab,
  onTabChange,
  pendingRidesCount = 0,
  isAdminAuthenticated = false,
}) => {
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [flutterModalOpen, setFlutterModalOpen] = useState(false);
  const isSupabaseLive = isSupabaseConfigured();

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl font-['Cairo',sans-serif]">
      {/* Top Banner with Local Identity & Realtime Status */}
      <div className="bg-slate-900 border-b border-slate-800/80 text-white px-4 py-1.5 text-[11px] font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-md font-mono font-black shadow-xs">
            الولاية 32
          </span>
          <span className="text-slate-200">المنظومة الرقمية لسيارات الأجرة والتنقل · الأبيض سيدي الشيخ</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
          {/* Flutter Project Structure Trigger */}
          <button
            onClick={() => setFlutterModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30"
            title="معاينة هيكل مشروع Flutter والملفات المنشأة"
          >
            <Smartphone className="w-3 h-3 text-blue-400" />
            <span>مشروع Flutter 📱</span>
          </button>

          {/* Supabase Status Trigger */}
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              isSupabaseLive
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            }`}
            title="مشروع Supabase المتصل"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>{isSupabaseLive ? 'Supabase متصل 🟢' : 'ربط Supabase ⚡'}</span>
          </button>

          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {activeDriversCount} تاكسي متصل
          </span>
        </div>
      </div>

      {/* Main Bar: Logo, Roles & Main/Map Page Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & City Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('main')}>
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg border border-amber-500/40 bg-slate-900 flex items-center justify-center shrink-0">
              <img
                src="/assets/icon-192.png"
                alt="شعار تاكسي الأبيض سيدي الشيخ"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-base sm:text-lg tracking-tight">
                  تاكسي الأبيض سيدي الشيخ
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/40">
                  تتبع مباشر GPS 🛰️
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-amber-400 inline" />
                شوارع وأحياء الأبيض سيدي الشيخ وضواحيها
              </p>
            </div>
          </div>
        </div>

        {/* Page Switcher Tabs: Page 1 (Main/Simple) vs Page 2 (Map) */}
        <div className="flex items-center justify-center bg-slate-900 p-1 rounded-2xl border border-slate-800 gap-1 shadow-inner">
          {/* Tab 1: Main Simple View */}
          <button
            id="nav-tab-main"
            onClick={() => onTabChange('main')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'main'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>📱</span>
            <span>الواجهة الرئيسية</span>
            {pendingRidesCount > 0 && currentRole === 'driver' && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {pendingRidesCount} طلب
              </span>
            )}
          </button>

          {/* Tab 2: Map View */}
          <button
            id="nav-tab-map"
            onClick={() => onTabChange('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🗺️</span>
            <span>الخارطة المباشرة</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'map' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {activeDriversCount} 🚕
            </span>
          </button>
        </div>

        {/* Roles Switcher: Customer vs Driver vs Admin */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {/* Customer Button */}
            <button
              id="role-btn-customer"
              onClick={() => onRoleChange('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                currentRole === 'customer'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span>🟢</span>
              <span>الزبون</span>
            </button>

            {/* Driver Button */}
            <button
              id="role-btn-driver"
              onClick={() => onRoleChange('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                currentRole === 'driver'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span>🚕</span>
              <span>
                {isDriverLoggedIn && activeDriverName
                  ? activeDriverName
                  : 'السائق (دخول 🔒)'}
              </span>
            </button>

            {/* Admin Button */}
            <button
              id="role-btn-admin"
              onClick={() => onRoleChange('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${isAdminAuthenticated ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>
                {isAdminAuthenticated ? 'الإدارة' : 'الإدارة 🔒'}
              </span>
            </button>
          </div>

          {/* Quick Driver Registration Trigger */}
          {onOpenDriverAuth && (
            <button
              id="btn-header-register-taxi"
              onClick={() => onOpenDriverAuth('register')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md transition flex items-center gap-1 cursor-pointer"
              title="تسجيل صاحب سيارة أجرة جديد"
            >
              <span>➕</span>
              <span className="hidden sm:inline">تسجيل تاكسي</span>
            </button>
          )}
        </div>
      </div>


      {/* Supabase Status Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Flutter Architecture Modal */}
      <FlutterStructureModal
        isOpen={flutterModalOpen}
        onClose={() => setFlutterModalOpen(false)}
      />
    </header>
  );
};
