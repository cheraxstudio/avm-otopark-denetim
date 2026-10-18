import { ParkingRecord, DailySummary, StaffProfile } from '../types/parking';

export function buildWhatsAppReportMessage(
  records: ParkingRecord[],
  summary: DailySummary,
  staff?: StaffProfile,
  customDate?: string
): string {
  const dateStr = customDate || summary.date || new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const staffName = staff?.name || 'Güvenlik & Otopark Vardiyası';
  const shift = staff?.shift ? ` (${staff.shift})` : '';

  // Floor breakdown lines
  const floorLines = Object.entries(summary.floorCounts || {})
    .filter(([_, count]) => count > 0)
    .map(([floor, count]) => {
      const fRecords = records.filter((r) => r.floor === floor);
      const autos = fRecords.filter((r) => r.vehicleType === 'automobile').length;
      const motos = fRecords.filter((r) => r.vehicleType === 'motorcycle').length;
      return `  ▫️ *${floor}:* ${count} Araç (${autos} Otomobil, ${motos} Motosiklet)`;
    })
    .join('\n');

  // Overstay vehicles (2+ days)
  const overstayVehicles = records
    .filter((r) => r.daysParked >= 2)
    .sort((a, b) => b.daysParked - a.daysParked);

  let overstaySection = '';
  if (overstayVehicles.length > 0) {
    const list = overstayVehicles
      .map((r) => {
        const icon = r.daysParked >= 4 ? '🚨' : '⚠️';
        const note = r.notes ? ` _[Not: ${r.notes}]_` : '';
        return `${icon} *${r.plate}* - ${r.brand} (${r.color})\n    📍 ${r.floor} / Kolon: *${r.column}*\n    ⏳ *${r.daysParked} GÜNDÜR OTOPARKTA* (İlk Tespit: ${r.firstSeenDate})${note}`;
      })
      .join('\n\n');

    overstaySection = `\n\n🚨 *UZUN SÜRELİ KALAN / TERK ARAÇ UYARILARI (${overstayVehicles.length} Araç):*\n${list}`;
  } else {
    overstaySection = `\n\n✅ *Uzun süreli kalan / terk araç riski tespit edilmedi.*`;
  }

  return (
`🌙 *AVM OTOPARK GECE SAYIM VE DENETİM RAPORU*
🏢 *Sinema Çıkışı Kapanış Kontrolü*
━━━━━━━━━━━━━━━━━━━━
📅 *Tarih:* ${dateStr} | Saat: ${timeStr}
👮 *Denetimi Yapan:* ${staffName}${shift}
📊 *Toplam Otoparkta Kalan:* *${summary.totalParkedToday} Araç*
   • 🚗 *Otomobil:* ${summary.totalAutomobile}
   • 🏍️ *Motosiklet:* ${summary.totalMotorcycle}
   • 🚐 *Hafif Ticari:* ${summary.totalVan || 0}
━━━━━━━━━━━━━━━━━━━━
📍 *KAT BAZINDA DAĞILIM:*
${floorLines || '  ▫️ Henüz araç kaydedilmedi.'}
━━━━━━━━━━━━━━━━━━━━${overstaySection}
━━━━━━━━━━━━━━━━━━━━
📊 *Excel Raporu:* ${summary.totalParkedToday} araçlık ayrıntılı .xlsx dosyası hazırlandı.
_Sistem üzerinden otomatik iletilmiştir._`
  );
}

export function openWhatsAppShare(
  message: string,
  phoneNumber?: string
): void {
  const encodedText = encodeURIComponent(message);
  let url = '';

  if (phoneNumber && phoneNumber.trim().length > 5) {
    // Clean phone number: remove non-digits
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    // If starts with 0 (e.g. 0532...), change to 90532...
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '9' + cleanPhone;
    } else if (!cleanPhone.startsWith('90') && cleanPhone.length === 10) {
      cleanPhone = '90' + cleanPhone;
    }
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(url, '_blank');
}

/**
 * Attempts to share the actual Excel file + text via navigator.share (works on mobile Android/iOS)
 */
export async function shareViaWebShareApi(
  file: File,
  title: string,
  text: string
): Promise<boolean> {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Web Share failed, falling back to WhatsApp link:', err);
      }
      return false;
    }
  }
  return false;
}
