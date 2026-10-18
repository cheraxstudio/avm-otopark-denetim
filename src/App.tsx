import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  ClipboardList,
  AlertTriangle,
  FileSpreadsheet,
  Share2,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Lock,
  Unlock,
  Radio,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ParkingRecord,
  DailySummary,
  StaffUser,
  MallConfig,
  AuditSessionState,
} from './types/parking';
import { Header } from './components/Header';
import { QuickEntryCard } from './components/QuickEntryCard';
import { FloorVehiclesList } from './components/FloorVehiclesList';
import { MultiDayTracker } from './components/MultiDayTracker';
import { ExportShareModal } from './components/ExportShareModal';
import { HistoryModal } from './components/HistoryModal';
import { LoginView } from './components/LoginView';
import { AutomationDashboard } from './components/AutomationDashboard';

const DEFAULT_MALL_CONFIG: MallConfig = {
  mallName: 'AVM Otopark Yönetim Sistemi',
  floors: ['P-2', 'P-3', 'P-4', 'P-5'],
  columnLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'M'],
  vehicleTypes: [
    { id: 'automobile', label: 'Otomobil', icon: 'Car' },
    { id: 'motorcycle', label: 'Motosiklet', icon: 'Bike' },
    { id: 'van', label: 'Hafif Ticari / Van', icon: 'Truck' },
  ],
  completeButtonText: 'Araç Bitti (Bugünkü Girişi Bitir)',
  saveButtonText: 'ARACI KAYDET',
  whatsappPhone: '',
};

export default function App() {
  // Current authenticated user
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('avm_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Mall Configuration (customizable per AVM)
  const [mallConfig, setMallConfig] = useState<MallConfig>(DEFAULT_MALL_CONFIG);

  // Session lock state
  const [sessionState, setSessionState] = useState<AuditSessionState>({
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: true,
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'quick_entry' | 'all_records' | 'overstay' | 'automation'>('quick_entry');
  const [currentFloor, setCurrentFloor] = useState<string>('P-2');

  // Data states
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [summary, setSummary] = useState<DailySummary>({
    date: new Date().toISOString().split('T')[0],
    totalParkedToday: 0,
    totalAutomobile: 0,
    totalMotorcycle: 0,
    totalVan: 0,
    multiDayCount: 0,
    abandonedRiskCount: 0,
    floorCounts: {},
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & In-App Dialogs
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [historyPlate, setHistoryPlate] = useState<string | null>(null);
  const [isFinishRoundModalOpen, setIsFinishRoundModalOpen] = useState(false);
  const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setAppToast({ message, type });
    setTimeout(() => setAppToast(null), 3500);
  };

  // Load backend data (records, summary, config, session) without resetting user input
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [recRes, sumRes, confRes, sessRes] = await Promise.all([
        fetch('/api/records'),
        fetch('/api/summary'),
        fetch('/api/config'),
        fetch('/api/session/status'),
      ]);

      const recData = await recRes.json();
      const sumData = await sumRes.json();
      const confData = await confRes.json();
      const sessData = await sessRes.json();

      if (recData.success && Array.isArray(recData.records)) {
        setRecords((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(recData.records)) return prev;
          return recData.records;
        });
      }
      if (sumData) {
        setSummary((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(sumData)) return prev;
          return sumData;
        });
      }
      if (confData.success && confData.config) {
        setMallConfig((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(confData.config)) return prev;
          return confData.config;
        });
        setCurrentFloor((prev) => {
          if (confData.config.floors && confData.config.floors.includes(prev)) {
            return prev;
          }
          return confData.config.floors?.[0] || 'P-2';
        });
      }
      if (sessData.success && sessData.session) {
        setSessionState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(sessData.session)) return prev;
          return sessData.session;
        });
      }
    } catch (err) {
      console.error('Failed to sync data with central server:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Sync on mount and background poll every 6 seconds without flickering
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(false), 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  // If user is admin and changes tab
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setActiveTab('automation');
    } else {
      setActiveTab('quick_entry');
    }
  }, [currentUser?.role]);

  const handleLogout = () => {
    localStorage.removeItem('avm_active_user');
    setCurrentUser(null);
  };

  // Staff clicks "Araç Bitti" -> finishes entry and automatically revokes permission
  const handleFinishRound = async () => {
    try {
      const res = await fetch('/api/session/finish-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: currentUser?.fullName || 'Saha Personeli',
          notes: `${records.length} araç kaydedildi ve sayım sonlandırıldı. İzin otomatik kalktı.`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionState(data.session);
        setIsFinishRoundModalOpen(false);
        showToast('✅ Bugünkü araç girişi tamamlandı. Araç ekleme izniniz otomatik olarak sonlandırıldı.', 'success');
        loadData(false);
      }
    } catch (e) {
      console.error(e);
      showToast('Giriş sonlandırılırken hata oluştu.', 'error');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData(false);
        showToast('Araç kaydı silindi.', 'info');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleResetDemoData = async () => {
    try {
      const res = await fetch('/api/records/clear-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setIsResetDataModalOpen(false);
        showToast('✅ ' + (data.message || 'Tüm örnek veriler sıfırlandı.'), 'success');
        loadData(true);
      }
    } catch (e) {
      showToast('Sıfırlama sırasında hata oluştu.', 'error');
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const currentFloorCount = records.filter((r) => r.floor === currentFloor).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        mallName={mallConfig.mallName}
        onLogout={handleLogout}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        totalParkedCount={records.length}
        multiDayCount={summary.multiDayCount}
        isAutomationTab={activeTab === 'automation'}
        onSwitchToAutomation={() => setActiveTab('automation')}
        onSwitchToStaffView={() => setActiveTab('quick_entry')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Navigation Tabs Bar */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center justify-between gap-1 overflow-x-auto shadow-md">
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('automation')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'automation'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4 text-current animate-pulse" />
              <span>Otomasyon Birimi</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('quick_entry')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'quick_entry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Hızlı Sayım Girişi</span>
          </button>

          <button
            onClick={() => setActiveTab('all_records')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'all_records'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Tüm Araçlar ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overstay')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'overstay'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
            <span>2+ Gün Kalanlar</span>
            {summary.multiDayCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'overstay'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {summary.multiDayCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp & Excel</span>
            <span className="sm:hidden">Paylaş</span>
          </button>
        </div>

        {/* TAB 0: OTOMASYON BİRİMİ DASHBOARD */}
        {activeTab === 'automation' && currentUser.role === 'admin' && (
          <AutomationDashboard
            records={records}
            summary={summary}
            mallConfig={mallConfig}
            onUpdateConfig={(newConfig) => setMallConfig(newConfig)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onViewHistory={(plate) => setHistoryPlate(plate)}
            currentUser={currentUser}
          />
        )}

        {/* TAB 1: QUICK ENTRY (KAT KAT HIZLI SAYIM & ARAÇ BİTTİ) */}
        {activeTab === 'quick_entry' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Vehicle Entry Card */}
            <QuickEntryCard
              currentFloor={currentFloor}
              onSelectFloor={setCurrentFloor}
              staff={currentUser}
              mallConfig={mallConfig}
              sessionState={sessionState}
              onFinishRound={() => setIsFinishRoundModalOpen(true)}
              onRefreshSession={() => loadData(true)}
              onRecordSaved={() => loadData(false)}
              todayRecordsCount={records.length}
              floorRecordsCount={currentFloorCount}
            />

            {/* List of vehicles logged on THIS floor */}
            <FloorVehiclesList
              records={records}
              currentFloor={currentFloor}
              floorsOrder={mallConfig.floors}
              onDeleteRecord={handleDeleteRecord}
              onViewHistory={(plate) => setHistoryPlate(plate)}
            />
          </div>
        )}

        {/* TAB 2: ALL VEHICLES */}
        {activeTab === 'all_records' && (
          <div className="animate-in fade-in duration-200">
            <FloorVehiclesList
              records={records}
              currentFloor="ALL"
              floorsOrder={mallConfig.floors}
              onDeleteRecord={handleDeleteRecord}
              onViewHistory={(plate) => setHistoryPlate(plate)}
            />
          </div>
        )}

        {/* TAB 3: MULTI-DAY OVERSTAY TRACKER (+1 GÜN SISTEMI) */}
        {activeTab === 'overstay' && (
          <div className="animate-in fade-in duration-200">
            <MultiDayTracker
              records={records}
              onViewHistory={(plate) => setHistoryPlate(plate)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          </div>
        )}

        {/* Quick Footer */}
        <div className="mt-8 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>{mallConfig.mallName}</span>
            <span>•</span>
            <span>Otomasyon Birimi ve Çoklu Personel Gece Takip Sistemi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsResetDataModalOpen(true)}
              className="text-slate-600 hover:text-slate-400 text-[11px] underline cursor-pointer"
            >
              Örnek Verileri Sıfırla
            </button>
            <span>v2.0 Canlı</span>
          </div>
        </div>
      </main>

      {/* IN-APP TOAST ALERT */}
      {appToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
              appToast.type === 'error'
                ? 'bg-red-950 border-red-500/50 text-red-200'
                : appToast.type === 'info'
                ? 'bg-sky-950 border-sky-500/50 text-sky-200'
                : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {appToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{appToast.message}</span>
            <button onClick={() => setAppToast(null)} className="ml-2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* FINISH ROUND CONFIRMATION MODAL */}
      {isFinishRoundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Bugünkü Girişi Bitir (Araç Bitti)</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Bugünkü araç sayımını bitirmek istediğinize emin misiniz?
                <br /><br />
                • Araç ekleme izniniz <strong>otomatik olarak kalkacaktır</strong>.
                <br />
                • Veriler anlık olarak <strong>Otomasyon Birimi</strong> ekranına iletilecektir.
                <br />
                • Tekrar ekleme yapabilmek için Otomasyon Biriminin izin vermesi gerekecektir.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFinishRoundModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleFinishRound}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Evet, Girişi Bitir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DATA CONFIRMATION MODAL */}
      {isResetDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Örnek Verileri Sıfırla</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tüm örnek/deneme araç verileri sıfırlanıp gerçek canlı kullanıma sıfırdan başlanacaktır.
                <br /><br />
                • Tüm araç kayıtları silinecektir (0 araç).
                <br />
                • Otopark katları <strong>P-2, P-3, P-4, P-5</strong> olarak güncellenecektir.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetDataModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-950"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT & WHATSAPP MODAL */}
      <ExportShareModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        summary={summary}
        staff={{
          name: currentUser.fullName,
          badgeNumber: currentUser.badgeNumber || '',
          shift: currentUser.shift || 'Gece Vardiyası',
          whatsappGroupNumber: mallConfig.whatsappPhone || '',
        }}
        onSessionCompleted={() => loadData(false)}
      />

      {/* VEHICLE HISTORY MODAL */}
      <HistoryModal
        plate={historyPlate}
        onClose={() => setHistoryPlate(null)}
      />
    </div>
  );
}
