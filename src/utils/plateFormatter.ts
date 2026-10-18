// Turkish Plate Helper Functions

export function normalizePlate(plate: string): string {
  if (!plate) return '';
  return plate
    .replace(/ğ/g, 'G')
    .replace(/ü/g, 'U')
    .replace(/ş/g, 'S')
    .replace(/ı/g, 'I')
    .replace(/i/g, 'I')
    .replace(/ö/g, 'O')
    .replace(/ç/g, 'C')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

/**
 * Formats raw string into standard Turkish license plate:
 * e.g. "34abc123" -> "34 ABC 123"
 * e.g. "06af9821" -> "06 AF 9821"
 * e.g. "35mtr88"  -> "35 MTR 88"
 */
export function formatTurkishPlate(input: string): string {
  const clean = normalizePlate(input);
  if (!clean) return '';

  // Match: (City Code: 2 digits) + (Letters: 1 to 3 chars) + (Numbers: 2 to 4 digits)
  const match = clean.match(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }

  // Partial match while typing
  if (/^\d{2}[A-Z]+$/.test(clean)) {
    const city = clean.slice(0, 2);
    const letters = clean.slice(2);
    return `${city} ${letters}`;
  }

  return clean;
}

export const COMMON_BRANDS = [
  'Renault',
  'Fiat',
  'Volkswagen',
  'Ford',
  'Toyota',
  'Hyundai',
  'Peugeot',
  'Opel',
  'Honda',
  'Dacia',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Skoda',
  'Citroën',
  'Nissan',
  'Kia',
  'Seat',
  'TOGG',
  'Volvo',
  'Yamaha',
  'Honda (Motor)',
  'Diğer',
];

export const COMMON_COLORS = [
  { name: 'Beyaz', bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a' },
  { name: 'Siyah', bg: '#09090b', border: '#27272a', text: '#f8fafc' },
  { name: 'Gri / Gümüş', bg: '#64748b', border: '#475569', text: '#f8fafc' },
  { name: 'Kırmızı', bg: '#dc2626', border: '#b91c1c', text: '#f8fafc' },
  { name: 'Mavi', bg: '#2563eb', border: '#1d4ed8', text: '#f8fafc' },
  { name: 'Lacivert', bg: '#1e3a8a', border: '#172554', text: '#f8fafc' },
  { name: 'Bej / Şampanya', bg: '#d6c7a1', border: '#b5a478', text: '#0f172a' },
  { name: 'Yeşil', bg: '#16a34a', border: '#15803d', text: '#f8fafc' },
  { name: 'Kahverengi', bg: '#78350f', border: '#451a03', text: '#f8fafc' },
  { name: 'Sarı', bg: '#eab308', border: '#ca8a04', text: '#0f172a' },
  { name: 'Turuncu', bg: '#ea580c', border: '#c2410c', text: '#f8fafc' },
];

export const DEFAULT_FLOORS = [
  'P-2',
  'P-3',
  'P-4',
  'P-5',
];

