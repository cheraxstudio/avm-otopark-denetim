import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  User,
  Share2,
  RefreshCw,
  Flashlight,
  LogOut,
  Shield,
  Building,
} from 'lucide-react';
import { StaffUser } from '../types/parking';

interface Props {
  currentUser: StaffUser;
  mallName: string;
  onLogout: () => void;
  onOpenExportModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalParkedCount: number;
  multiDayCount: number;
  isAutomationTab: boolean;
  onSwitchToAutomation: () => void;
  onSwitchToStaffView: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  mallName,
  onLogout,
  onOpenExportModal,
  onRefresh,
  isRefreshing,
  totalParkedCount,
  multiDayCount,
  isAutomationTab,
  onSwitchToAutomation,
  onSwitchToStaffView,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          weekday: 'short',
        }) +
          ' • ' +
          now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFlashlight = () => {
    setIsFlashlightOn(!isFlashlightOn);
  };

  return (
    <>
      {isFlashlightOn && (
        <div
          onClick={() => setIsFlashlightOn(false)}
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center cursor-pointer p-6 animate-in fade-in"
        >
          <Flashlight className="w-20 h-20 text-slate-900 animate-pulse mb-4" />
          <p className="text-2xl font-black text-slate-950 text-center">
            FENER MODU AÇIK
          </p>
          <p className="text-sm font-semibold text-slate-600 mt-2 text-center">
            Karanlık otopark katında plaka okumak için tam aydınlatma. Kapatmak için ekrana dokunun.
          </p>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Logo and title */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
                <Car className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate max-w-[180px] sm:max-w-none">
                    {mallName || 'AVM OTOPARK'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    CANLI
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{timeStr}</span>
                </div>
              </div>
            </div>

            {/* Actions & User */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Flashlight screen brightener for dark floors */}
              <button
                onClick={toggleFlashlight}
                title="Ekran Feneri Aç"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                <Flashlight className="w-4 h-4" />
              </button>

              {/* Refresh live sync */}
              <button
                onClick={onRefresh}
                title="Veri Merkezini Yenile"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>

              {/* Admin Switcher if role is admin */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={isAutomationTab ? onSwitchToStaffView : onSwitchToAutomation}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    isAutomationTab
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30'
                      : 'bg-slate-900 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/40'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isAutomationTab ? 'Saha Ekranına Geç' : 'Otomasyon Birimi'}
                  </span>
                  <span className="sm:hidden">{isAutomationTab ? 'Saha' : 'Otomasyon'}</span>
                </button>
              )}

              {/* User badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200">
                <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-white font-bold truncate max-w-[110px]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {currentUser.role === 'admin' ? 'Otomasyon Birimi' : 'Saha Personeli'}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                title="Oturumu Kapat"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central status bar */}
          <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">Otomasyon Merkezi Senkronize</span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="hidden sm:inline">Tüm telefonlardan anlık akış</span>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Toplam Araç: <strong className="text-white">{totalParkedCount}</strong>
              </span>
              {multiDayCount > 0 && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  ⚠️ 2+ Gün: <strong>{multiDayCount}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
