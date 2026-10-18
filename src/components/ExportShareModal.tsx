import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Share2,
  Download,
  Copy,
  Check,
  Phone,
  Send,
  AlertTriangle,
  Building,
  CheckCircle,
} from 'lucide-react';
import { ParkingRecord, DailySummary, StaffProfile } from '../types/parking';
import { generateExcelWorkbook, downloadExcelFile } from '../utils/excelExporter';
import { buildWhatsAppReportMessage, openWhatsAppShare, shareViaWebShareApi } from '../utils/whatsappHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: ParkingRecord[];
  summary: DailySummary;
  staff: StaffProfile;
  onSessionCompleted?: () => void;
}

export const ExportShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  records,
  summary,
  staff,
  onSessionCompleted,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(staff.whatsappGroupNumber || '');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  if (!isOpen) return null;

  const targetDate = summary.date || new Date().toISOString().split('T')[0];
  const whatsAppMessage = buildWhatsAppReportMessage(records, summary, staff, targetDate);

  // Download Excel
  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      const result = generateExcelWorkbook(records, summary, targetDate);
      downloadExcelFile(result);
    } catch (err) {
      alert('Excel oluşturulurken hata: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // WhatsApp send
  const handleOpenWhatsApp = () => {
    // Also trigger excel download automatically so staff has the file ready to attach
    try {
      const result = generateExcelWorkbook(records, summary, targetDate);
      downloadExcelFile(result);
    } catch (e) {
      console.warn(e);
    }
    openWhatsAppShare(whatsAppMessage, phoneNumber);
  };

  // Web Share API (File + Text)
  const handleMobileFileShare = async () => {
    try {
      const result = generateExcelWorkbook(records, summary, targetDate);
      const file = new File([result.blob], result.filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const shared = await shareViaWebShareApi(
        file,
        `AVM Otopark Gece Sayım Raporu (${targetDate})`,
        whatsAppMessage
      );

      if (!shared) {
        // Fallback to whatsapp link
        openWhatsAppShare(whatsAppMessage, phoneNumber);
      }
    } catch (err) {
      openWhatsAppShare(whatsAppMessage, phoneNumber);
    }
  };

  // Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Complete audit session
  const handleCompleteAudit = async () => {
    try {
      const res = await fetch('/api/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          completedBy: staff.name,
          notes: `${records.length} araç sayımı yapıldı ve WhatsApp ile paylaşıldı.`,
        }),
      });
      if (res.ok) {
        setSessionCompleted(true);
        if (onSessionCompleted) onSessionCompleted();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Excel & WhatsApp Rapor Otomasyonu
              </h3>
              <p className="text-xs text-slate-400">
                Tüm katların sayımını Excel (.xlsx) olarak oluşturup WhatsApp grubuna iletin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Toplam Araç</span>
              <span className="text-xl font-black text-white block mt-0.5">
                {summary.totalParkedToday}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Otomobil</span>
              <span className="text-xl font-black text-emerald-400 block mt-0.5">
                {summary.totalAutomobile}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium">Motosiklet</span>
              <span className="text-xl font-black text-sky-400 block mt-0.5">
                {summary.totalMotorcycle}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium">2+ Gün Kalan</span>
              <span className="text-xl font-black text-amber-400 block mt-0.5">
                {summary.multiDayCount}
              </span>
            </div>
          </div>

          {/* WhatsApp Recipient Phone Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Gönderilecek WhatsApp Numarası / Grup (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Örn: 0532xxxxxxx (Boş bırakılırsa WhatsApp'tan kişi seçersiniz)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* WhatsApp Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-300">
                WhatsApp'a Otomatik İletilecek Mesaj Önizlemesi:
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Kopyalandı!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Metni Kopyala
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-emerald-500 selection:text-slate-950">
              {whatsAppMessage}
            </pre>
          </div>

          {/* Audit Completion confirmation */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Gece Sayım Durumu</p>
                <p className="text-[11px] text-slate-400">
                  {sessionCompleted || summary.session?.completed
                    ? 'Bu gecenin sayımı tamamlandı ve kilitlendi.'
                    : 'Tüm katlar tamamlandığında sayımı tamamlandı olarak işaretleyin.'}
                </p>
              </div>
            </div>

            {!sessionCompleted && !summary.session?.completed ? (
              <button
                type="button"
                onClick={handleCompleteAudit}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-colors shrink-0"
              >
                Sayımı Tamamla
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Tamamlandı
              </span>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row gap-2.5">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel (.xlsx) İndir</span>
          </button>

          {/* Web Share (Phone native share with attachment) */}
          <button
            type="button"
            onClick={handleMobileFileShare}
            className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Telefonda Paylaş</span>
          </button>

          {/* Send via WhatsApp */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp ile Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
