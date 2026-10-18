import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Bike,
  Truck,
  Plus,
  AlertTriangle,
  Check,
  Camera,
  X,
  MapPin,
  Volume2,
  VolumeX,
  Lock,
  Flag,
  RefreshCw,
  Ban,
  AlertOctagon,
} from 'lucide-react';
import {
  normalizePlate,
  formatTurkishPlate,
  COMMON_BRANDS,
  COMMON_COLORS,
} from '../utils/plateFormatter';
import { VehicleType, StaffUser, MallConfig, AuditSessionState } from '../types/parking';

interface Props {
  currentFloor: string;
  onSelectFloor: (floor: string) => void;
  staff: StaffUser;
  mallConfig: MallConfig;
  sessionState: AuditSessionState;
  onFinishRound: () => void;
  onRefreshSession: () => void;
  onRecordSaved: (record: any) => void;
  todayRecordsCount: number;
  floorRecordsCount: number;
}

function playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

export const QuickEntryCard: React.FC<Props> = ({
  currentFloor,
  onSelectFloor,
  staff,
  mallConfig,
  sessionState,
  onFinishRound,
  onRefreshSession,
  onRecordSaved,
  floorRecordsCount,
}) => {
  const [plateInput, setPlateInput] = useState('');
  const [columnInput, setColumnInput] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('automobile');
  const [brand, setBrand] = useState('Renault');
  const [customBrand, setCustomBrand] = useState('');
  const [color, setColor] = useState('Beyaz');
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [duplicateErrorMsg, setDuplicateErrorMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const plateInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const floors = mallConfig?.floors || ['P-2', 'P-3', 'P-4', 'P-5'];
  const columnLetters = mallConfig?.columnLetters || ['A', 'B', 'C', 'D', 'E', 'M'];

  // Query server when plate input changes
  useEffect(() => {
    const clean = normalizePlate(plateInput);
    if (clean.length < 5) {
      setLookupResult(null);
      setDuplicateErrorMsg(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const res = await fetch(`/api/lookup/${clean}`);
        const data = await res.json();
        if (data.found) {
          setLookupResult(data);

          // Check if already registered TODAY (duplicate protection)
          if (data.isAlreadyRegisteredToday) {
            setDuplicateErrorMsg(
              `🚫 DİKKAT: "${data.plate}" plakalı araç bugün zaten sisteme eklenmiştir! (${data.registeredTodayRecord?.floor} / Kolon ${data.registeredTodayRecord?.column} - Kaydeden: ${data.registeredTodayRecord?.staffName}). Aynı plaka bugün iki kez eklenemez!`
            );
          } else {
            setDuplicateErrorMsg(null);
          }

          if (data.brand && data.brand !== 'Bilinmiyor') {
            if (COMMON_BRANDS.includes(data.brand)) {
              setBrand(data.brand);
            } else {
              setBrand('Diğer');
              setCustomBrand(data.brand);
            }
          }
          if (data.color) setColor(data.color);
          if (data.vehicleType) setVehicleType(data.vehicleType);
        } else {
          setLookupResult(null);
          setDuplicateErrorMsg(null);
        }
      } catch (err) {
        console.error('Lookup failed', err);
      } finally {
        setIsLookingUp(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [plateInput]);

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatTurkishPlate(raw);
    setPlateInput(formatted);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = normalizePlate(plateInput);
    if (!cleanPlate) {
      setDuplicateErrorMsg('Lütfen geçerli bir araç plakası giriniz.');
      plateInputRef.current?.focus();
      return;
    }
    if (!columnInput.trim()) {
      setDuplicateErrorMsg('Lütfen kolon numarası giriniz (Örn: A-12).');
      return;
    }

    if (lookupResult?.isAlreadyRegisteredToday) {
      setDuplicateErrorMsg(
        `🚫 AYNI PLAKA İKİ KEZ YAZILAMAZ! "${formatTurkishPlate(
          plateInput
        )}" plakalı araç bugün zaten sisteme eklenmiştir (${lookupResult.registeredTodayRecord?.floor} / Kolon ${lookupResult.registeredTodayRecord?.column}).`
      );
      return;
    }

    setIsLoading(true);
    setDuplicateErrorMsg(null);

    try {
      const finalBrand = brand === 'Diğer' ? customBrand.trim() || 'Diğer' : brand;

      const payload = {
        plate: formatTurkishPlate(plateInput),
        floor: currentFloor,
        column: columnInput.trim().toUpperCase(),
        vehicleType,
        brand: finalBrand,
        color,
        notes: notes.trim(),
        photoUrl: photoData || undefined,
        staffName: staff.fullName,
        staffId: staff.id,
        userRole: staff.role,
      };

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.duplicate) {
          setDuplicateErrorMsg(data.error);
        }
        throw new Error(data.error || 'Kayıt sırasında hata oluştu.');
      }

      if (soundEnabled) {
        playSuccessBeep();
      }

      onRecordSaved(data.record);

      const msg =
        data.record.daysParked > 1
          ? `⚠️ ${data.record.plate} kaydedildi! ${data.record.daysParked}. GÜN (+1 Gün Eklendi)`
          : `✅ ${data.record.plate} başarıyla kaydedildi!`;
      setSaveSuccessMsg(msg);
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      setPlateInput('');
      setNotes('');
      setPhotoData(null);
      setLookupResult(null);
      setDuplicateErrorMsg(null);

      // Increment column number suggestion
      const colMatch = columnInput.match(/^([A-Z]+)[-\s]?(\d+)$/i);
      if (colMatch) {
        const letter = colMatch[1].toUpperCase();
        const num = parseInt(colMatch[2], 10) + 1;
        setColumnInput(`${letter}-${num}`);
      }

      setTimeout(() => {
        plateInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setDuplicateErrorMsg(err.message || 'Kayıt sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // CHECK PERMISSION FOR STAFF
  const isStaffForbidden =
    staff.role !== 'admin' &&
    (!sessionState.isEntryPermitted ||
      sessionState.isLockedForStaff ||
      (sessionState.authorizedStaffId && sessionState.authorizedStaffId !== staff.id));

  if (isStaffForbidden) {
    const isAnotherStaffAssigned =
      sessionState.authorizedStaffId && sessionState.authorizedStaffId !== staff.id;

    return (
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-black text-white">
            {isAnotherStaffAssigned
              ? 'Bugünkü Araç Ekleme İzni Başka Personelde'
              : 'Araç Ekleme İzni Kapalı'}
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
            {isAnotherStaffAssigned
              ? `Bugünkü sayım için yetkili personel: ${sessionState.authorizedStaffName || 'Diğer Personel'}. Sizin araç ekleme izniniz bulunmuyor.`
              : 'Araç ekleme bittiğinde veya sayım tamamlandığında yetki otomatik olarak kaldırılır. Yeni araç eklemek için Otomasyon Biriminin izin vermesi gerekmektedir.'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-amber-300 max-w-md mx-auto">
          🔒 <strong>Otomasyon Birimi</strong> arayüzünden günün görevli personeli seçilip yetki verildiğinde bu ekran otomatik olarak açılacaktır.
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={onRefreshSession}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Yetki Durumunu Kontrol Et / Yenile</span>
          </button>
        </div>
      </div>
    );
  }

  const isDuplicateDetected = Boolean(lookupResult?.isAlreadyRegisteredToday);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
      {/* Floor Selector Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-amber-400" />
            Bulunduğunuz Katı Seçin:
          </label>
          <span className="text-xs text-slate-400 font-medium">
            Bu Katta: <strong className="text-amber-400">{floorRecordsCount}</strong> Araç
          </span>
        </div>

        {/* Floor Buttons Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {floors.map((floor) => {
            const isSelected = currentFloor === floor;
            return (
              <button
                key={floor}
                type="button"
                onClick={() => onSelectFloor(floor)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{floor}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Fast Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kolon & Turkish Plate Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Kolon Numarası */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kolon Numarası <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={columnInput}
                onChange={(e) => setColumnInput(e.target.value.toUpperCase())}
                placeholder="Örn: B-14, A-02"
                required
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold tracking-wider text-base focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {/* Quick Letter chips for Column */}
            <div className="flex gap-1 mt-1.5 overflow-x-auto pb-1">
              {columnLetters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => {
                    const num = columnInput.replace(/^[A-Z]+[-\s]?/i, '');
                    setColumnInput(num ? `${letter}-${num}` : `${letter}-`);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {/* TURKISH LICENSE PLATE INPUT */}
          <div className="sm:col-span-8">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Araç Plakası</span>
                <span className="text-red-400">*</span>
                {isLookingUp && (
                  <span className="text-[11px] text-amber-400 animate-pulse font-normal">
                    (Merkezde taranıyor...)
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                title={soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>

            {/* Turkish Plate Visual Frame */}
            <div
              className={`relative flex items-center rounded-xl overflow-hidden border-2 transition-all bg-white shadow-inner ${
                isDuplicateDetected
                  ? 'border-red-500 ring-2 ring-red-500/40'
                  : 'border-slate-700 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30'
              }`}
            >
              <div className="w-10 sm:w-12 bg-blue-700 self-stretch flex flex-col items-center justify-between py-1.5 px-1 text-white select-none shrink-0">
                <span className="text-[10px] leading-none opacity-80">★ ★</span>
                <span className="font-extrabold text-xs sm:text-sm tracking-wider leading-none">
                  TR
                </span>
                <span className="text-[10px] leading-none opacity-80">★ ★</span>
              </div>

              <input
                ref={plateInputRef}
                type="text"
                value={plateInput}
                onChange={handlePlateChange}
                placeholder="34 ABC 789"
                required
                className="w-full px-3 py-2.5 sm:py-3 bg-white text-slate-950 font-mono-plate font-black text-xl sm:text-2xl uppercase tracking-widest placeholder:text-slate-400 focus:outline-none"
              />

              {plateInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPlateInput('');
                    setLookupResult(null);
                    setDuplicateErrorMsg(null);
                    plateInputRef.current?.focus();
                  }}
                  className="p-2 mr-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DUPLICATE WARNING BANNER (AYNI PLAKA İKİ KEZ YAZILAMAZ) */}
        {isDuplicateDetected && (
          <div className="animate-in slide-in-from-top duration-300 rounded-2xl p-4 border bg-red-950/80 border-red-500 shadow-xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 text-xs">
              <span className="font-black text-red-200 text-sm block">
                🚫 AYNI PLAKA İKİ KEZ EKLENEMEZ!
              </span>
              <p className="text-red-300 mt-1 leading-relaxed">
                <strong>{plateInput}</strong> plakalı araç bugün zaten sisteme eklenmiştir.
                Bulunduğu yer:{' '}
                <strong className="text-white">
                  {lookupResult.registeredTodayRecord?.floor} / Kolon{' '}
                  {lookupResult.registeredTodayRecord?.column}
                </strong>
                . Kaydeden Personel:{' '}
                <strong className="text-white">
                  {lookupResult.registeredTodayRecord?.staffName}
                </strong>
                . Sistem mükerrer kayıtları engeller.
              </p>
            </div>
          </div>
        )}

        {/* MULTI-DAY SYSTEM NOTIFICATION BANNER (+1 GÜN MANTIĞI - SADECE GEÇMİŞ GÜNLERDEN GELENLER İÇİN) */}
        {!isDuplicateDetected && lookupResult && lookupResult.found && (
          <div className="animate-in slide-in-from-top duration-300 rounded-2xl p-3.5 border bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-500/50 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase">
                    Önceki Günden Kalan Araç!
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    Toplam: {lookupResult.estimatedDaysParkedIfAddedToday}. Gün (+1 Gün Eklendi)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Bu araç <strong>{lookupResult.firstSeenDate}</strong> tarihinden beri otoparkta.
                  Dün bulunduğu yer:{' '}
                  <span className="text-amber-300 font-bold">
                    {lookupResult.previousFloor} / Kolon {lookupResult.previousColumn}
                  </span>
                  . Araç bilgileri otomatik dolduruldu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Type, Brand & Color */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Araç Tipi
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setVehicleType('automobile')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  vehicleType === 'automobile'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Otomobil</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('motorcycle')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  vehicleType === 'motorcycle'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Motosiklet</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('van')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  vehicleType === 'van'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Ticari/Van</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Araç Markası
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
            >
              {COMMON_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {brand === 'Diğer' && (
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Marka adını yazın..."
                className="mt-1.5 w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Araç Rengi
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
            >
              {COMMON_COLORS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Color Swatches */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] text-slate-500 shrink-0">Hızlı Renk:</span>
          {COMMON_COLORS.slice(0, 8).map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-transform flex items-center gap-1.5 shrink-0 ${
                color === c.name
                  ? 'ring-2 ring-amber-400 scale-105 border-transparent'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
              style={{ backgroundColor: c.bg, color: c.text }}
            >
              <span
                className="w-2 h-2 rounded-full border border-black/20"
                style={{ backgroundColor: c.bg }}
              />
              {c.name}
            </button>
          ))}
        </div>

        {/* Clean Note Input (Hızlı Hazır Notlar Kullanıcının İsteği Üzerine Kaldırıldı) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Özel Durum Notu (Opsiyonel)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Varsa özel bir açıklama veya not yazabilirsiniz..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Photo evidence option */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-slate-300 hover:text-amber-400 transition-colors"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>{photoData ? 'Fotoğraf Eklendi (Değiştir)' : 'Plaka / Araç Fotoğrafı Ekle'}</span>
          </button>
          {photoData && (
            <div className="flex items-center gap-2">
              <img
                src={photoData}
                alt="Kanıt"
                className="w-8 h-8 rounded-lg object-cover border border-amber-500"
              />
              <button
                type="button"
                onClick={() => setPhotoData(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {saveSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Submit & "Araç Bitti" Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isLoading || isDuplicateDetected}
            className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] ${
              isDuplicateDetected
                ? 'bg-red-900/60 text-red-200 border border-red-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/40 cursor-pointer disabled:opacity-50'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Otomasyona İletiliyor...
              </span>
            ) : isDuplicateDetected ? (
              <>
                <Ban className="w-5 h-5" />
                <span>AYNI PLAKA İKİ KEZ EKLENEMEZ</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>
                  {lookupResult?.found
                    ? `${mallConfig.saveButtonText || 'ARACI KAYDET'} (${lookupResult.estimatedDaysParkedIfAddedToday}. GÜN +1)`
                    : mallConfig.saveButtonText || 'ARACI KAYDET'}
                </span>
              </>
            )}
          </button>

          {/* "Araç Bitti" Button -> Finishes round, automatically revokes permission */}
          <button
            type="button"
            onClick={onFinishRound}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Flag className="w-4 h-4 text-amber-400" />
            <span>{mallConfig.completeButtonText || 'Araç Bitti (Bugünkü Girişi Bitir)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
