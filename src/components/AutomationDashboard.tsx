import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Settings,
  Lock,
  Unlock,
  Radio,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Share2,
  Save,
  Clock,
  Car,
  Bike,
  Truck,
  Shield,
  Eye,
  Phone,
  Calendar,
  X,
  UserCheck,
  Search,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  StaffUser,
  MallConfig,
  ParkingRecord,
  DailySummary,
  AuditSessionState,
} from '../types/parking';

interface Props {
  records: ParkingRecord[];
  summary: DailySummary;
  mallConfig: MallConfig;
  onUpdateConfig: (newConfig: MallConfig) => void;
  onOpenExportModal: () => void;
  onViewHistory: (plate: string) => void;
  currentUser: StaffUser;
}

export const AutomationDashboard: React.FC<Props> = ({
  records,
  summary,
  mallConfig,
  onUpdateConfig,
  onOpenExportModal,
  onViewHistory,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'live_feed' | 'staff_mgmt' | 'mall_config'>('live_feed');
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [sessionState, setSessionState] = useState<AuditSessionState>({
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: false,
  });

  // Selected duty staff in Automation UI
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Live feed search query
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New staff form state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newShift, setNewShift] = useState('Gece Vardiyası (00:00 - 08:00)');
  const [newRole, setNewRole] = useState<'staff' | 'admin'>('staff');
  const [staffActionMsg, setStaffActionMsg] = useState<string | null>(null);

  // Mall config editing state (local draft, will not be wiped by polling)
  const [configDraft, setConfigDraft] = useState<MallConfig>(mallConfig);
  const [newFloorInput, setNewFloorInput] = useState('');
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  // In-app confirmation dialog states (to avoid blocked window.confirm in iframes)
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);
  const [floorToDelete, setFloorToDelete] = useState<string | null>(null);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  // Fetch staff and session status without overwriting user drafts or selections
  const fetchStaffAndSession = async () => {
    try {
      const [staffRes, sessionRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/session/status'),
      ]);
      const sData = await staffRes.json();
      const sessData = await sessionRes.json();
      if (sData.success && Array.isArray(sData.staff)) {
        setStaffList((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(sData.staff)) return prev;
          return sData.staff;
        });
        setSelectedStaffId((prev) => {
          if (prev) return prev;
          const firstStaff = sData.staff.find((u: StaffUser) => u.role === 'staff');
          return firstStaff ? firstStaff.id : '';
        });
      }
      if (sessData.success && sessData.session) {
        setSessionState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(sessData.session)) return prev;
          return sessData.session;
        });
        setSelectedStaffId((prev) => {
          if (prev) return prev;
          return sessData.session.authorizedStaffId || '';
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStaffAndSession();
    const interval = setInterval(fetchStaffAndSession, 6000);
    return () => clearInterval(interval);
  }, []);

  // Grant or Revoke permission for selected duty staff
  const handleSetDutyPermission = async (isPermitted: boolean) => {
    if (!selectedStaffId) {
      setStaffActionMsg('⚠️ Lütfen günün görevli personelini seçiniz.');
      setTimeout(() => setStaffActionMsg(null), 3500);
      return;
    }
    try {
      const res = await fetch('/api/session/set-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaffId,
          isPermitted,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionState(data.session);
        setStaffActionMsg(`✅ ${data.message}`);
        setTimeout(() => setStaffActionMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setStaffActionMsg('❌ Yetki güncellenirken hata oluştu.');
      setTimeout(() => setStaffActionMsg(null), 3500);
    }
  };

  // Add staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim()) {
      setStaffActionMsg('⚠️ Lütfen ad soyad ve telefon numarasını giriniz.');
      setTimeout(() => setStaffActionMsg(null), 3500);
      return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          phone: newPhone.trim(),
          badgeNumber: newBadge.trim(),
          shift: newShift,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStaffActionMsg(`✅ ${data.staff.fullName} başarıyla eklendi! (Kullanıcı Adı: ${data.staff.username})`);
      setTimeout(() => setStaffActionMsg(null), 5000);

      setNewFullName('');
      setNewPhone('');
      setNewBadge('');
      setIsAddStaffOpen(false);
      if (data.allStaff) {
        setStaffList(data.allStaff);
      } else {
        fetchStaffAndSession();
      }
    } catch (err: any) {
      setStaffActionMsg(`❌ ${err.message || 'Personel eklenemedi.'}`);
      setTimeout(() => setStaffActionMsg(null), 5000);
    }
  };

  // Confirm and execute Staff Deletion
  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const res = await fetch(`/api/staff/${staffToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setStaffActionMsg(`🗑️ ${staffToDelete.name} sistemden çıkarıldı.`);
        setTimeout(() => setStaffActionMsg(null), 3500);
        if (data.staff) {
          setStaffList(data.staff);
        } else {
          fetchStaffAndSession();
        }
      } else {
        setStaffActionMsg(`❌ ${data.error || 'Personel silinemedi.'}`);
        setTimeout(() => setStaffActionMsg(null), 3500);
      }
    } catch (e) {
      setStaffActionMsg('❌ Personel silinirken hata oluştu.');
      setTimeout(() => setStaffActionMsg(null), 3500);
    } finally {
      setStaffToDelete(null);
    }
  };

  // Toggle staff active state
  const handleToggleStaffActive = async (user: StaffUser) => {
    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await res.json();
      if (res.ok && data.allStaff) {
        setStaffList(data.allStaff);
      } else {
        fetchStaffAndSession();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Floor Management (Add with immediate server sync)
  const handleDirectAddFloor = async (floorName: string) => {
    const clean = floorName.trim();
    if (!clean) return;
    try {
      const res = await fetch('/api/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const nextConfig = { ...configDraft, floors: data.floors };
      setConfigDraft(nextConfig);
      onUpdateConfig(nextConfig);
      setNewFloorInput('');
      setConfigSavedMsg(`✅ "${clean}" katı başarıyla eklendi!`);
      setTimeout(() => setConfigSavedMsg(null), 3000);
    } catch (err: any) {
      setConfigSavedMsg(`❌ ${err.message || 'Kat eklenemedi.'}`);
      setTimeout(() => setConfigSavedMsg(null), 3500);
    }
  };

  // Confirm and execute Floor Deletion
  const confirmDeleteFloor = async () => {
    if (!floorToDelete) return;
    if (configDraft.floors.length <= 1) {
      setConfigSavedMsg('⚠️ Sistemde en az 1 kat tanımlı kalmalıdır.');
      setTimeout(() => setConfigSavedMsg(null), 3000);
      setFloorToDelete(null);
      return;
    }
    try {
      const res = await fetch(`/api/floors/${encodeURIComponent(floorToDelete)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const nextConfig = { ...configDraft, floors: data.floors };
      setConfigDraft(nextConfig);
      onUpdateConfig(nextConfig);
      setConfigSavedMsg(`🗑️ "${floorToDelete}" katı silindi.`);
      setTimeout(() => setConfigSavedMsg(null), 3000);
    } catch (err: any) {
      setConfigSavedMsg(`❌ ${err.message || 'Kat silinemedi.'}`);
      setTimeout(() => setConfigSavedMsg(null), 3500);
    } finally {
      setFloorToDelete(null);
    }
  };

  const handleSetPresetFloors = async (presetFloors: string[]) => {
    try {
      const res = await fetch('/api/floors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floors: presetFloors }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const nextConfig = { ...configDraft, floors: data.floors };
      setConfigDraft(nextConfig);
      onUpdateConfig(nextConfig);
      setConfigSavedMsg(`✅ Katlar "${presetFloors.join(', ')}" olarak güncellendi!`);
      setTimeout(() => setConfigSavedMsg(null), 3500);
    } catch (err: any) {
      setConfigSavedMsg(`❌ ${err.message || 'Katlar güncellenemedi.'}`);
      setTimeout(() => setConfigSavedMsg(null), 3500);
    }
  };

  const handleMoveFloor = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= configDraft.floors.length) return;

    const reordered = [...configDraft.floors];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      const res = await fetch('/api/floors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floors: reordered }),
      });
      const data = await res.json();
      if (res.ok) {
        const nextConfig = { ...configDraft, floors: data.floors };
        setConfigDraft(nextConfig);
        onUpdateConfig(nextConfig);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear All Data for Production Launch (Non-blocking modal confirmation)
  const confirmClearAllData = async () => {
    try {
      const res = await fetch('/api/records/clear-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setIsClearDataModalOpen(false);
        const nextConfig = { ...configDraft, floors: data.floors || ['P-2', 'P-3', 'P-4', 'P-5'] };
        setConfigDraft(nextConfig);
        onUpdateConfig(nextConfig);
        setConfigSavedMsg('✅ Tüm örnek veriler sıfırlandı. Otopark katları P-2, P-3, P-4, P-5 olarak güncellendi. Sistem gerçek kullanıma hazır!');
        setTimeout(() => setConfigSavedMsg(null), 5000);
      }
    } catch (e) {
      setConfigSavedMsg('❌ Sıfırlama sırasında hata oluştu.');
      setTimeout(() => setConfigSavedMsg(null), 4000);
    }
  };

  // Save Mall Config
  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configDraft),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateConfig(data.config);
        setConfigDraft(data.config);
        setConfigSavedMsg('✅ AVM kat ve buton ayarları başarıyla kaydedildi!');
        setTimeout(() => setConfigSavedMsg(null), 4000);
      }
    } catch (err: any) {
      setConfigSavedMsg(`❌ Ayarlar kaydedilemedi: ${err.message}`);
      setTimeout(() => setConfigSavedMsg(null), 4000);
    }
  };

  // Filter records in Live Feed
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toUpperCase().replace(/\s+/g, '');
    return (
      r.plate.toUpperCase().replace(/\s+/g, '').includes(q) ||
      r.column.toUpperCase().includes(q) ||
      r.floor.toUpperCase().includes(q) ||
      r.brand.toUpperCase().includes(q) ||
      r.color.toUpperCase().includes(q) ||
      r.staffName.toUpperCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Banner / System Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{configDraft.mallName}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                  Otomasyon & Yönetim Paneli
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Görevli personel yetkilendirme, canlı veri izleme ve kat/buton konfigürasyonu
              </p>
            </div>
          </div>

          <button
            onClick={onOpenExportModal}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-md shadow-emerald-950 transition-all shrink-0 self-start sm:self-auto"
          >
            <Share2 className="w-4 h-4" />
            <span>Rapor & WhatsApp Paylaş</span>
          </button>
        </div>

        {/* GÖREVLİ PERSONEL VE ARAÇ EKLEME İZNİ YÖNETİMİ (KULLANICININ İSTEDİĞİ MERKEZİ KONTROL) */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  Günün Görevli Personeli ve Araç Ekleme İzni
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sadece yetki verilen personel araç ekleyebilir. Personel "Araç Bitti" dediğinde izin otomatik kalkar.
                </p>
              </div>
            </div>

            {/* Select Staff & Permission Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Görevli Personel Seçin --</option>
                {staffList
                  .filter((u) => u.role === 'staff' && u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
              </select>

              {sessionState.isEntryPermitted ? (
                <button
                  type="button"
                  onClick={() => handleSetDutyPermission(false)}
                  className="px-3 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/50 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>İzni Durdur (Kilitle)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetDutyPermission(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all active:scale-95"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Araç Ekleme İzni Ver</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Status Alert */}
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              sessionState.isEntryPermitted
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  sessionState.isEntryPermitted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {sessionState.isEntryPermitted ? (
                  <>
                    <strong>İZİN AÇIK:</strong> Günün görevli personeli [
                    <strong className="text-white">
                      {sessionState.authorizedStaffName || 'Seçili Personel'}
                    </strong>
                    ] şu anda araç ekleyebilir. Personel <em>"Araç Bitti"</em> butonuna bastığı an
                    izin <strong>otomatik olarak kalkacaktır</strong>.
                  </>
                ) : (
                  <>
                    <strong>İZİN KAPALI:</strong> Araç ekleme yetkisi kapalıdır (veya personel araç
                    eklemeyi bitirdiğinden izin otomatik kalkmıştır).
                  </>
                )}
              </span>
            </div>

            {sessionState.completed && (
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300 shrink-0">
                Araç Bitti İşaretlendi
              </span>
            )}
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('live_feed')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'live_feed'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-current animate-pulse" />
            <span>Anlık Veri Akışı ({records.length} Araç)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('staff_mgmt')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'staff_mgmt'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personel Yönetimi ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mall_config')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'mall_config'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>AVM Kat & Buton Kurgusu</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE FEED (KATLARA GÖRE SIRALI & ARAMA BUTONLU) */}
      {activeSubTab === 'live_feed' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Toplam Araç</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {summary.totalParkedToday}
              </span>
              <span className="text-[10px] text-emerald-400 mt-1 block">Tüm katlar canlı</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Otomobil</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {summary.totalAutomobile}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Binek araçlar</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Motosiklet</span>
              <span className="text-2xl font-black text-sky-400 mt-1 block">
                {summary.totalMotorcycle}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Motor ve Scooter</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">2+ Gün Kalan Araçlar</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {summary.multiDayCount}
              </span>
              <span className="text-[10px] text-amber-300 mt-1 block">Otomatik +1 gün artışı</span>
            </div>
          </div>

          {/* Live Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Katlardan Sıralı Gelen Araç Akışı
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Eklenen araçlar otopark kat sırasına ve kolonlarına göre sıralı listelenmektedir.
                </p>
              </div>

              {/* SEARCH BUTTON IN AUTOMATION */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSearchOpen || searchQuery
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Araç Ara</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            {(isSearchOpen || searchQuery) && (
              <div className="relative mb-4 animate-in slide-in-from-top-2 duration-200">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Plaka (34 ABC 789), kat, kolon, marka veya personel adı ara..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="pb-3 px-3">Kat / Kolon</th>
                    <th className="pb-3 px-3">Plaka</th>
                    <th className="pb-3 px-3">Tip / Marka / Renk</th>
                    <th className="pb-3 px-3">Bekleme Süresi (+1)</th>
                    <th className="pb-3 px-3">Kaydeden Personel</th>
                    <th className="pb-3 px-3">Saat</th>
                    <th className="pb-3 px-3 text-right">Tarihçe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {searchQuery
                          ? `"${searchQuery}" aramasına uygun araç bulunamadı.`
                          : 'Henüz araç kaydı girilmedi. Personel araç ekledikçe buraya düşecektir.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const isMultiDay = r.daysParked >= 2;
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-800/50 transition-colors ${
                            r.daysParked >= 4
                              ? 'bg-red-950/20'
                              : isMultiDay
                              ? 'bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-semibold text-slate-200">
                            <span className="text-amber-400 font-bold">{r.floor}</span> • Kolon{' '}
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
                              {r.column}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center rounded overflow-hidden border border-slate-600 bg-white shadow-sm inline-flex">
                              <span className="bg-blue-700 px-1 py-0.5 text-[8px] font-black text-white">
                                TR
                              </span>
                              <span className="font-mono-plate font-black text-xs px-1.5 py-0.5 text-slate-950 tracking-wider">
                                {r.plate}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {r.brand} ({r.color})
                          </td>
                          <td className="py-3 px-3">
                            {r.daysParked > 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {r.daysParked}. Gün (+1 Gün)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                                1. Gün (Yeni)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-medium">{r.staffName}</td>
                          <td className="py-3 px-3 text-slate-400 font-mono">
                            {new Date(r.timestamp).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onViewHistory(r.plate)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                              title="Detaylı Tarihçe"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STAFF MANAGEMENT */}
      {activeSubTab === 'staff_mgmt' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {staffActionMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
              {staffActionMsg}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Sistemi Kullanacak Personeller</h3>
              <p className="text-xs text-slate-400">
                Kullanıcı adı personelin adı-soyadı bitişiktir. Şifresi cep telefon numarasıdır.
              </p>
            </div>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Yeni Personel Ekle</span>
            </button>
          </div>

          {/* Add Staff Drawer */}
          {isAddStaffOpen && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/50 shadow-xl space-y-4 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Yeni Personel Kaydı
                </h4>
                <button
                  onClick={() => setIsAddStaffOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Personel Adı Soyadı <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Örn: Ali Veli"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Otomatik kullanıcı adı:{' '}
                    <strong className="text-amber-400">
                      {newFullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'aliveli'}
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Cep Telefon Numarası (Giriş Şifresi) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05xxxxxxxxx"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Sicil / Yaka Numarası
                  </label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="Örn: GÜV-105"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Vardiya Bilgisi
                  </label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Gece Vardiyası (00:00 - 08:00)">Gece Vardiyası (00:00 - 08:00)</option>
                    <option value="Sinema Kapanış Ekibi">Sinema Kapanış Ekibi</option>
                    <option value="Akşam Vardiyası (16:00 - 24:00)">Akşam Vardiyası (16:00 - 24:00)</option>
                    <option value="Gündüz Vardiyası (08:00 - 16:00)">Gündüz Vardiyası (08:00 - 16:00)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStaffOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    Personeli Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffList.map((user) => (
              <div
                key={user.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  user.active
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{user.fullName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {user.role === 'admin' ? 'Otomasyon' : 'Saha'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleStaffActive(user)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        user.active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {user.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div>
                      Kullanıcı Adı: <strong className="text-amber-400">{user.username}</strong>
                    </div>
                    <div>
                      Şifre (Telefon): <strong className="text-slate-200">{user.phone}</strong>
                    </div>
                    {user.badgeNumber && <div>Sicil No: {user.badgeNumber}</div>}
                    {user.shift && <div className="text-[11px] text-slate-500">{user.shift}</div>}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                  {user.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => setStaffToDelete({ id: user.id, name: user.fullName })}
                      className="px-2.5 py-1 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Personeli Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Çıkar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MALL CONFIGURATION */}
      {activeSubTab === 'mall_config' && (
        <div className="space-y-5 animate-in fade-in duration-200 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          {configSavedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
              {configSavedMsg}
            </div>
          )}

          <div>
            <h3 className="text-base font-black text-white">AVM Kat ve Buton Düzenleme</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kat isimlerini ve buton metinlerini düzenleyerek sistemi AVM mimarinize göre kurgulayabilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                AVM Adı / Tesis Başlığı
              </label>
              <input
                type="text"
                value={configDraft.mallName}
                onChange={(e) => setConfigDraft({ ...configDraft, mallName: e.target.value })}
                placeholder="Örn: Akasya AVM Otopark Yönetimi"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Varsayılan WhatsApp Rapor Numarası
              </label>
              <input
                type="text"
                value={configDraft.whatsappPhone}
                onChange={(e) => setConfigDraft({ ...configDraft, whatsappPhone: e.target.value })}
                placeholder="Örn: 0532xxxxxxx (Güvenlik / Otopark Amiri)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                "Araç Bitti (Girişi Kapat)" Buton Metni
              </label>
              <input
                type="text"
                value={configDraft.completeButtonText}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, completeButtonText: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                "ARACI KAYDET" Buton Metni
              </label>
              <input
                type="text"
                value={configDraft.saveButtonText}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, saveButtonText: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Floors Customization Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Otopark Katları Yönetimi (Ekle / Çıkart / Sırala)
                </label>
                <p className="text-[11px] text-slate-400">
                  Katları buradan anında ekleyebilir, silebilir veya sırasını değiştirebilirsiniz.
                </p>
              </div>

              {/* Quick Preset button */}
              <button
                type="button"
                onClick={() => handleSetPresetFloors(['P-2', 'P-3', 'P-4', 'P-5'])}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>⚡ Katları P-2, P-3, P-4, P-5 Yap</span>
              </button>
            </div>

            {/* Interactive Floors Cards List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {configDraft.floors.map((floor, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 group hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-sm text-amber-300 truncate">
                      {floor}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveFloor(idx, 'up')}
                        title="Yukarı Taşı"
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
                      >
                        ▲
                      </button>
                    )}
                    {/* Move Down */}
                    {idx < configDraft.floors.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveFloor(idx, 'down')}
                        title="Aşağı Taşı"
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
                      >
                        ▼
                      </button>
                    )}
                    {/* Direct Delete Floor */}
                    <button
                      type="button"
                      onClick={() => setFloorToDelete(floor)}
                      title={`"${floor}" Katını Sil`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Add Floor Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDirectAddFloor(newFloorInput);
              }}
              className="flex gap-2 max-w-md pt-1"
            >
              <input
                type="text"
                value={newFloorInput}
                onChange={(e) => setNewFloorInput(e.target.value)}
                placeholder="Yeni kat adı (Örn: P-6, Zemin, Açık Kat)"
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newFloorInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Kat Ekle</span>
              </button>
            </form>
          </div>

          {/* Reset All Data for Real Production Deployment */}
          <div className="pt-4 border-t border-slate-800 bg-red-950/20 -mx-5 -mb-5 p-5 rounded-b-3xl border-t border-red-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Gerçek Canlı Uygulamaya Geçiş (Temiz Başlangıç)
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tüm örnek/deneme araçları silinir (0 araç), katlar P-2, P-3, P-4, P-5 olarak güncellenir ve sistem sıfırdan başlar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsClearDataModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950 transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Örnek Verileri Sıfırla (Sıfırdan Başla)</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>AVM Ayarlarını Kaydet ve Uygula</span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE STAFF MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-white">Personeli Çıkar</h3>
              <p className="text-xs text-slate-300 mt-2">
                <strong>"{staffToDelete.name}"</strong> adlı personeli sistemden çıkarmak istediğinize emin misiniz?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-950"
              >
                Evet, Çıkar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE FLOOR MODAL */}
      {floorToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-white">Katı Listeden Kaldır</h3>
              <p className="text-xs text-slate-300 mt-2">
                <strong>"{floorToDelete}"</strong> katını sistemden kaldırmak istediğinize emin misiniz?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFloorToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteFloor}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Evet, Katı Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR ALL SAMPLES MODAL */}
      {isClearDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Tüm Örnek Verileri Sıfırla</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tüm örnek/deneme araç kayıtları tamamen silinecektir (0 araç).
                <br />
                Otopark katları <strong>P-2, P-3, P-4, P-5</strong> olarak güncellenecek ve sistem gerçek canlı kullanıma sıfırdan başlayacaktır.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearDataModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmClearAllData}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-950"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
