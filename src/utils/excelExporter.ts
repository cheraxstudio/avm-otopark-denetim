import * as XLSX from 'xlsx';
import { ParkingRecord, DailySummary } from '../types/parking';

export interface ExcelExportResult {
  blob: Blob;
  filename: string;
}

export function generateExcelWorkbook(
  records: ParkingRecord[],
  summary: DailySummary,
  targetDate: string
): ExcelExportResult {
  const wb = XLSX.utils.book_new();

  // 1. ALL RECORDS SHEET
  const recordsData = records.map((r, idx) => ({
    'Sıra': idx + 1,
    'Plaka': r.plate,
    'Kat': r.floor,
    'Kolon No': r.column,
    'Araç Tipi':
      r.vehicleType === 'automobile'
        ? 'Otomobil'
        : r.vehicleType === 'motorcycle'
        ? 'Motosiklet'
        : 'Hafif Ticari / Minibüs',
    'Marka': r.brand || '-',
    'Renk': r.color || '-',
    'Bekleme Süresi (Gün)': `${r.daysParked} Gün ${r.daysParked > 1 ? '(+1 Eklendi)' : '(Yeni)'}`,
    'İlk Giriş/Tespit Tarihi': r.firstSeenDate || r.auditDate,
    'Son Tespit Tarihi': r.lastSeenDate || r.auditDate,
    'Uyarı Durumu':
      r.daysParked >= 4
        ? '🚨 TERK / ŞÜPHELİ ARAÇ (4+ Gün)'
        : r.daysParked >= 2
        ? '⚠️ UZUN SÜRELİ (2+ Gün)'
        : '✅ Normal (İlk Gece)',
    'Denetleyen Personel': r.staffName || 'Güvenlik Görevlisi',
    'Kayıt Saati': new Date(r.timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    'Önemli Notlar': r.notes || '-',
  }));

  const wsRecords = XLSX.utils.json_to_sheet(recordsData);
  // Auto-fit column widths
  wsRecords['!cols'] = [
    { wch: 6 },  // Sıra
    { wch: 15 }, // Plaka
    { wch: 12 }, // Kat
    { wch: 12 }, // Kolon No
    { wch: 15 }, // Araç Tipi
    { wch: 15 }, // Marka
    { wch: 14 }, // Renk
    { wch: 22 }, // Bekleme Süresi
    { wch: 18 }, // İlk Giriş
    { wch: 18 }, // Son Tespit
    { wch: 26 }, // Uyarı
    { wch: 22 }, // Personel
    { wch: 12 }, // Saat
    { wch: 30 }, // Notlar
  ];
  XLSX.utils.book_append_sheet(wb, wsRecords, 'Gece Sayım Listesi');

  // 2. MULTI-DAY OVERSTAY SHEET
  const overstayRecords = records
    .filter((r) => r.daysParked >= 2)
    .sort((a, b) => b.daysParked - a.daysParked);

  const overstayData = overstayRecords.map((r, idx) => ({
    'Sıra': idx + 1,
    'Plaka': r.plate,
    'Kat': r.floor,
    'Kolon': r.column,
    'Toplam Bekleme (Gün)': `${r.daysParked} Gündür Otoparkta`,
    'İlk Tespit Tarihi': r.firstSeenDate,
    'Risk Seviyesi':
      r.daysParked >= 7
        ? '🔴 KRİTİK TERK (7+ Gün - Çekici / Kolluk)'
        : r.daysParked >= 4
        ? '🟠 ŞÜPHELİ ARAÇ (4-6 Gün)'
        : '🟡 DÜNDEN KALAN (2-3 Gün)',
    'Marka / Model': r.brand,
    'Renk': r.color,
    'Araç Tipi': r.vehicleType === 'motorcycle' ? 'Motosiklet' : 'Otomobil',
    'Son Görevli': r.staffName,
    'Özel Açıklama': r.notes || 'Herhangi bir hareket tespit edilmedi',
  }));

  const wsOverstay = XLSX.utils.json_to_sheet(overstayData);
  wsOverstay['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 18 },
    { wch: 32 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOverstay, 'Uzun Süreli Kalanlar (+1)');

  // 3. FLOOR BREAKDOWN SHEET
  const floors = Object.keys(summary.floorCounts || {});
  const floorData = floors.map((fl) => {
    const floorRecs = records.filter((r) => r.floor === fl);
    const autoCount = floorRecs.filter((r) => r.vehicleType === 'automobile').length;
    const motoCount = floorRecs.filter((r) => r.vehicleType === 'motorcycle').length;
    const vanCount = floorRecs.filter((r) => r.vehicleType === 'van').length;
    const overstayCount = floorRecs.filter((r) => r.daysParked >= 2).length;

    return {
      'Kat Adı': fl,
      'Toplam Araç Sayısı': floorRecs.length,
      'Otomobil': autoCount,
      'Motosiklet': motoCount,
      'Hafif Ticari': vanCount,
      '2+ Gün Kalan Araç': overstayCount,
    };
  });

  // Add total row
  floorData.push({
    'Kat Adı': 'GENEL TOPLAM',
    'Toplam Araç Sayısı': summary.totalParkedToday,
    'Otomobil': summary.totalAutomobile,
    'Motosiklet': summary.totalMotorcycle,
    'Hafif Ticari': summary.totalVan,
    '2+ Gün Kalan Araç': summary.multiDayCount,
  });

  const wsFloors = XLSX.utils.json_to_sheet(floorData);
  wsFloors['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFloors, 'Kat Bazlı Özet');

  // Generate buffer and blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `AVM_Otopark_Gece_Sayim_Raporu_${targetDate}.xlsx`;

  return { blob, filename };
}

export function downloadExcelFile(result: ExcelExportResult) {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
