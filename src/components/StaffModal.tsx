import React, { useState } from 'react';
import { User, Shield, Clock, Phone, Check } from 'lucide-react';
import { StaffProfile } from '../types/parking';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffProfile;
  onSave: (staff: StaffProfile) => void;
}

export const StaffModal: React.FC<Props> = ({ isOpen, onClose, staff, onSave }) => {
  const [name, setName] = useState(staff.name);
  const [badgeNumber, setBadgeNumber] = useState(staff.badgeNumber);
  const [shift, setShift] = useState(staff.shift);
  const [whatsappGroupNumber, setWhatsappGroupNumber] = useState(
    staff.whatsappGroupNumber || ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      badgeNumber: badgeNumber.trim(),
      shift: shift.trim(),
      whatsappGroupNumber: whatsappGroupNumber.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Personel ve Cihaz Ayarları</h2>
            <p className="text-xs text-slate-400">
              Bu telefondan girilen araç kayıtlarına adınız eklenecektir.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Personel Adı Soyadı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Sicil / Yaka No
              </label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="Örn: GÜV-104"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Vardiya Bilgisi
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Gece Vardiyası (00:00 - 08:00)">Gece (00:00 - 08:00)</option>
                <option value="Akşam Vardiyası (16:00 - 24:00)">Akşam (16:00 - 24:00)</option>
                <option value="Gündüz Vardiyası (08:00 - 16:00)">Gündüz (08:00 - 16:00)</option>
                <option value="Sinema Kapanış Ekibi">Sinema Kapanış Ekibi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Rapor İletişim Numarası (Opsiyonel)
            </label>
            <input
              type="text"
              value={whatsappGroupNumber}
              onChange={(e) => setWhatsappGroupNumber(e.target.value)}
              placeholder="Örn: 0532xxxxxxx (Güvenlik Amiri / Grup)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Boş bırakılırsa WhatsApp açıldığında kişi veya grup seçebilirsiniz.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              Kaydet ve Başla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
