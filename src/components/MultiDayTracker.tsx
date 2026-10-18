import React from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  MapPin,
  Eye,
  FileText,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { ParkingRecord } from '../types/parking';

interface Props {
  records: ParkingRecord[];
  onViewHistory: (plate: string) => void;
  onOpenExportModal: () => void;
}

export const MultiDayTracker: React.FC<Props> = ({
  records,
  onViewHistory,
  onOpenExportModal,
}) => {
  const overstayVehicles = records
    .filter((r) => r.daysParked >= 2)
    .sort((a, b) => b.daysParked - a.daysParked);

  const abandonedRiskVehicles = overstayVehicles.filter((r) => r.daysParked >= 4);

  return (
    <div className="space-y-4">
      {/* Alert Header Box */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Uzun Süreli Kalan & Terk Araç Takibi
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                  +1 Gün Sistemi
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Her gece denetiminde aynı plakayı gören personeller sayesinde bekleme süresi otomatik +1 gün artırılır.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenExportModal}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95 shadow-md shadow-amber-500/20"
          >
            <FileText className="w-4 h-4" />
            <span>Kalan Araç Raporunu Paylaş</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Toplam Kalan (2+ Gün)</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5 block">
              {overstayVehicles.length}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Terk / Şüpheli (4+ Gün)</span>
            <span className="text-xl sm:text-2xl font-black text-red-400 mt-0.5 block">
              {abandonedRiskVehicles.length}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">En Uzun Bekleyen</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">
              {overstayVehicles.length > 0 ? `${overstayVehicles[0].daysParked} Gün` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Overstay Vehicles List */}
      {overstayVehicles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-base font-bold text-white">
            Tebrikler, Otoparkta 2 Günden Fazla Kalan Araç Yok!
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Sayımı yapılan tüm araçlar bu gece ilk kez tespit edildi. Önceki gecelerden kalan herhangi bir terk araç bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {overstayVehicles.map((v) => {
            const isHighRisk = v.daysParked >= 4;
            const isCritical = v.daysParked >= 7;

            return (
              <div
                key={v.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-red-950/30 border-red-500/60'
                    : isHighRisk
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Plate and Details */}
                  <div className="flex items-start gap-3">
                    {/* TR Plate */}
                    <div className="flex items-center rounded-lg overflow-hidden border border-slate-600 bg-white shadow shrink-0">
                      <div className="bg-blue-700 px-2 py-1.5 text-[10px] font-black text-white self-stretch flex items-center justify-center">
                        TR
                      </div>
                      <span className="font-mono-plate font-black text-base px-2.5 py-1 text-slate-950 tracking-wider">
                        {v.plate}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {v.brand} • {v.color}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {v.vehicleType === 'motorcycle' ? 'Motosiklet' : 'Otomobil'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1 text-amber-300 font-semibold">
                          <MapPin className="w-3.5 h-3.5" />
                          {v.floor} / Kolon {v.column}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          İlk Giriş: {v.firstSeenDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stay Counter & Risk Level Badge */}
                  <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-right">
                      <div
                        className={`text-lg sm:text-xl font-black ${
                          isCritical
                            ? 'text-red-400'
                            : isHighRisk
                            ? 'text-amber-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {v.daysParked} GÜNDÜR BURADA
                      </div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {isCritical
                          ? '🚨 7+ Gün - Çekici & Zabıta Bildirimi'
                          : isHighRisk
                          ? '⚠️ Terk Araç Şüphesi (4+ Gün)'
                          : '🟡 Dünden Devreden (+1 Gün)'}
                      </span>
                    </div>

                    <button
                      onClick={() => onViewHistory(v.plate)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tarihçe</span>
                    </button>
                  </div>
                </div>

                {v.notes && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400 font-bold">Personel Notu:</span>
                    <span>{v.notes}</span>
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
