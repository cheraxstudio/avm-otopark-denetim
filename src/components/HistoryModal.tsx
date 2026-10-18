import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Calendar,
  MapPin,
  User,
  Clock,
  Car,
  Bike,
  Truck,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { ParkingRecord } from '../types/parking';

interface Props {
  plate: string | null;
  onClose: () => void;
}

export const HistoryModal: React.FC<Props> = ({ plate, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    found: boolean;
    plate: string;
    latestRecord?: ParkingRecord;
    historyRecords?: ParkingRecord[];
    estimatedDaysParkedIfAddedToday?: number;
    firstSeenDate?: string;
  } | null>(null);

  useEffect(() => {
    if (!plate) return;
    setLoading(true);
    fetch(`/api/lookup/${encodeURIComponent(plate)}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [plate]);

  if (!plate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* TR Plate */}
            <div className="flex items-center rounded-lg overflow-hidden border border-slate-600 bg-white shadow-sm shrink-0">
              <div className="bg-blue-700 px-2 py-1 text-[10px] font-black text-white self-stretch flex items-center justify-center">
                TR
              </div>
              <span className="font-mono-plate font-black text-base px-2.5 py-0.5 text-slate-950 tracking-wider">
                {plate}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Araç Otopark Tarihçesi</h3>
              <p className="text-[11px] text-slate-400">Gün gün tespit ve kolon kayıtları</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Tarihçe yükleniyor...
            </div>
          ) : !data || !data.found ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Bu plaka için geçmiş kayıt bulunamadı.
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Araç:</span>
                  <span className="text-xs font-bold text-white">
                    {data.latestRecord?.brand} - {data.latestRecord?.color}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">İlk Giriş Tarihi:</span>
                  <span className="text-xs font-bold text-amber-400">
                    {data.firstSeenDate || data.latestRecord?.firstSeenDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Toplam Bekleme:</span>
                  <span className="text-sm font-black text-amber-300">
                    {data.latestRecord?.daysParked || 1} Gündür Otoparkta (+1 Gün Kuralı)
                  </span>
                </div>
              </div>

              {/* Day-by-Day Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  Geçmiş Günlük Tespitler:
                </h4>

                <div className="relative border-l-2 border-slate-800 ml-3 space-y-4 pb-2">
                  {data.historyRecords?.map((rec, idx) => (
                    <div key={rec.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-500" />

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {rec.auditDate}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {rec.daysParked}. Gün
                          </span>
                        </div>

                        <div className="text-xs text-slate-200 flex items-center gap-2 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong>{rec.floor}</strong> / Kolon: <strong>{rec.column}</strong>
                          </span>
                        </div>

                        {rec.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            Not: "{rec.notes}"
                          </p>
                        )}

                        <div className="pt-1 text-[10px] text-slate-500 flex items-center gap-2">
                          <span>Görevli: {rec.staffName}</span>
                          <span>•</span>
                          <span>
                            {new Date(rec.timestamp).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/40 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
