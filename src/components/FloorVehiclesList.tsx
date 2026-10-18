import React, { useState } from 'react';
import {
  Car,
  Bike,
  Truck,
  AlertTriangle,
  Clock,
  User,
  Trash2,
  Search,
  Filter,
  Eye,
  Camera,
  CheckCircle,
  Layers,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ParkingRecord } from '../types/parking';

interface Props {
  records: ParkingRecord[];
  currentFloor: string;
  floorsOrder?: string[];
  onDeleteRecord: (id: string) => void;
  onViewHistory: (plate: string) => void;
}

export const FloorVehiclesList: React.FC<Props> = ({
  records,
  currentFloor,
  floorsOrder = ['P-2', 'P-3', 'P-4', 'P-5'],
  onDeleteRecord,
  onViewHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'overstay' | 'auto' | 'moto'>('all');
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({});

  // Filter records
  const filtered = records.filter((r) => {
    if (currentFloor !== 'ALL' && r.floor !== currentFloor) {
      return false;
    }
    if (filterType === 'overstay' && r.daysParked < 2) return false;
    if (filterType === 'auto' && r.vehicleType !== 'automobile') return false;
    if (filterType === 'moto' && r.vehicleType !== 'motorcycle') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().replace(/\s+/g, '');
      const plate = r.plate.toUpperCase().replace(/\s+/g, '');
      const col = r.column.toUpperCase();
      const br = r.brand.toUpperCase();
      const colr = r.color.toUpperCase();
      const flr = r.floor.toUpperCase();
      const stf = r.staffName.toUpperCase();
      const note = (r.notes || '').toUpperCase();
      return (
        plate.includes(q) ||
        col.includes(q) ||
        br.includes(q) ||
        colr.includes(q) ||
        flr.includes(q) ||
        stf.includes(q) ||
        note.includes(q)
      );
    }
    return true;
  });

  // Group records by floor according to floorsOrder
  const allFloorsInResult = Array.from(
    new Set([...floorsOrder, ...filtered.map((r) => r.floor)])
  );

  const groupedByFloor: { floor: string; records: ParkingRecord[] }[] = [];

  for (const fl of allFloorsInResult) {
    const floorRecs = filtered
      .filter((r) => r.floor === fl)
      .sort((a, b) => a.column.localeCompare(b.column, undefined, { numeric: true }));

    if (floorRecs.length > 0) {
      groupedByFloor.push({ floor: fl, records: floorRecs });
    }
  }

  // Toggle collapse for a floor
  const toggleCollapse = (floor: string) => {
    setCollapsedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>
                {currentFloor === 'ALL'
                  ? 'Katlardan Sıralı Kalan Araçlar'
                  : `${currentFloor} Kalan Araçlar`}
              </span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {filtered.length} Araç
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Otopark kat sırasına ve kolon numaralarına göre sıralı liste
          </p>
        </div>

        {/* Action Controls: Search Button & Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* SEARCH BUTTON */}
          <button
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

          {/* Filter Pills */}
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilterType('overstay')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterType === 'overstay'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-950 text-amber-400/80 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            2+ Gün
          </button>
          <button
            onClick={() => setFilterType('auto')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterType === 'auto'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Car className="w-3 h-3" />
            Oto
          </button>
          <button
            onClick={() => setFilterType('moto')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterType === 'moto'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bike className="w-3 h-3" />
            Motor
          </button>
        </div>
      </div>

      {/* SEARCH BAR (Toggled or active) */}
      {(isSearchOpen || searchQuery) && (
        <div className="relative mb-4 animate-in slide-in-from-top-2 duration-200">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Plaka (34 ABC 789), kolon (B-14), kat, marka veya renk ara..."
            className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-amber-500/50 rounded-2xl text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Sequential Floor Grouped List */}
      {groupedByFloor.length === 0 ? (
        <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
          <Car className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-300">
            {searchQuery
              ? `"${searchQuery}" aramasına uygun araç bulunamadı.`
              : 'Kayıtlı araç bulunmuyor.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Araçlar eklendikçe kat sırasına ve kolonlarına göre burada listelenir.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByFloor.map(({ floor, records: floorRecs }) => {
            const isCollapsed = collapsedFloors[floor];

            return (
              <div
                key={floor}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-md"
              >
                {/* Floor Section Header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(floor)}
                  className="w-full px-4 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-black text-sm sm:text-base text-white tracking-wide">
                      {floor}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-amber-300 border border-slate-700">
                      {floorRecs.length} Araç
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-[11px] hidden sm:inline">
                      {isCollapsed ? 'Genişlet' : 'Daralt'}
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Cards Grid for this Floor */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    {floorRecs.map((item) => {
                      const isMultiDay = item.daysParked >= 2;
                      const isHighRisk = item.daysParked >= 4;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            isHighRisk
                              ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/70'
                              : isMultiDay
                              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
                              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                          }`}
                        >
                          {/* Top Row: Plate & Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Turkish Plate Mini Frame */}
                              <div className="flex items-center rounded-lg overflow-hidden border border-slate-600 bg-white shadow-sm shrink-0">
                                <div className="bg-blue-700 px-1.5 py-1 text-[9px] font-black text-white self-stretch flex items-center justify-center">
                                  TR
                                </div>
                                <span className="font-mono-plate font-black text-sm px-2 py-0.5 text-slate-950 tracking-wider">
                                  {item.plate}
                                </span>
                              </div>

                              {/* Column Badge */}
                              <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs">
                                Kolon: {item.column}
                              </span>
                            </div>

                            {/* Stay Duration Badge (+1 gün) */}
                            <div className="shrink-0">
                              {isHighRisk ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/30 text-red-300 border border-red-500/50 text-[11px] font-black animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-red-400" />
                                  {item.daysParked}. GÜN (Şüpheli)
                                </span>
                              ) : isMultiDay ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {item.daysParked}. Gün (+1 Gün)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  <CheckCircle className="w-3 h-3" />
                                  1. Gece (Yeni)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                                Marka & Renk
                              </span>
                              <span className="text-white font-bold flex items-center gap-1 mt-0.5">
                                {item.vehicleType === 'motorcycle' ? (
                                  <Bike className="w-3.5 h-3.5 text-sky-400" />
                                ) : item.vehicleType === 'van' ? (
                                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                                {item.brand} • {item.color}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                                Bulunduğu Yer
                              </span>
                              <span className="text-slate-300 font-semibold mt-0.5 block">
                                {item.floor} / {item.column}
                              </span>
                            </div>
                          </div>

                          {item.notes && (
                            <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-200/90 italic">
                              "{item.notes}"
                            </div>
                          )}

                          {item.photoUrl && (
                            <div className="flex items-center gap-2">
                              <img
                                src={item.photoUrl}
                                alt="Fotoğraf"
                                className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                              />
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Camera className="w-3 h-3 text-amber-400" /> Fotoğraf Kayıtlı
                              </span>
                            </div>
                          )}

                          {/* Footer: Staff & Actions */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{item.staffName}</span>
                              <span className="text-slate-600">•</span>
                              <span>
                                {new Date(item.timestamp).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onViewHistory(item.plate)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Araç Geçmişini Gör"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                Geçmiş
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `${item.plate} plakalı aracı bugünkü sayım listesinden silmek istediğinize emin misiniz?`
                                    )
                                  ) {
                                    onDeleteRecord(item.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
