import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'parking_records.json');

app.use(express.json({ limit: '15mb' }));

export type VehicleType = 'automobile' | 'motorcycle' | 'van';

export interface ParkingRecord {
  id: string;
  plate: string;
  normalizedPlate: string;
  floor: string;
  column: string;
  vehicleType: VehicleType;
  brand: string;
  color: string;
  notes?: string;
  photoUrl?: string;
  staffName: string;
  staffId?: string;
  auditDate: string; // "YYYY-MM-DD"
  timestamp: string; // ISO
  daysParked: number; // calculated stay duration (>=1)
  firstSeenDate: string; // "YYYY-MM-DD"
  lastSeenDate: string; // "YYYY-MM-DD"
  isOverstay: boolean; // >= 2 days
  isAbandonedRisk: boolean; // >= 4 days
  status: 'active' | 'departed' | 'suspect' | 'towed';
}

export interface StaffUser {
  id: string;
  fullName: string;
  username: string; // "ahmetyilmaz" (personelin adı soyadı bitişik)
  phone: string; // Şifre olarak kullanılan cep telefonu numarası (örn: "05321112233")
  role: 'staff' | 'admin'; // 'staff' = Saha Personeli, 'admin' = Otomasyon Birimi / Yönetici
  badgeNumber?: string;
  shift?: string;
  active: boolean;
  createdAt: string;
}

export interface MallConfig {
  mallName: string;
  floors: string[];
  columnLetters: string[];
  vehicleTypes: Array<{
    id: VehicleType;
    label: string;
    icon: string;
  }>;
  completeButtonText: string;
  saveButtonText: string;
  whatsappPhone: string;
}

export interface AuditSessionState {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  isLockedForStaff: boolean; // True when staff taps "Araç Bitti"
  isEntryPermitted: boolean; // Active permission: must be true for assigned staff to add vehicles
  authorizedStaffId?: string | null; // Assigned staff permitted to add vehicles today
  authorizedStaffName?: string | null;
  notes?: string;
}

interface DatabaseSchema {
  records: ParkingRecord[];
  staffUsers: StaffUser[];
  mallConfig: MallConfig;
  auditSessions: {
    [date: string]: AuditSessionState;
  };
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeUsername(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').trim();
}

function normalizePlateStr(plate: string): string {
  return (plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/gi, '')
    .trim();
}

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_MALL_CONFIG: MallConfig = {
  mallName: 'AVM Otopark Yönetim Sistemi',
  floors: ['P-2', 'P-3', 'P-4', 'P-5'],
  columnLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'M'],
  vehicleTypes: [
    { id: 'automobile', label: 'Otomobil', icon: 'Car' },
    { id: 'motorcycle', label: 'Motosiklet', icon: 'Bike' },
    { id: 'van', label: 'Hafif Ticari / Van', icon: 'Truck' },
  ],
  completeButtonText: 'Araç Bitti (Bugünkü Girişi Bitir)',
  saveButtonText: 'ARACI KAYDET',
  whatsappPhone: '05303200274',
};

function createInitialDatabase(): DatabaseSchema {
  const today = getTodayStr();

  const staffUsers: StaffUser[] = [
    {
      id: 'staff-1',
      fullName: 'Ahmet Yılmaz',
      username: 'ahmetyilmaz',
      phone: '05321112233',
      role: 'staff',
      badgeNumber: 'GÜV-101',
      shift: 'Gece Vardiyası (00:00 - 08:00)',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'staff-2',
      fullName: 'Mehmet Demir',
      username: 'mehmetdemir',
      phone: '05332223344',
      role: 'staff',
      badgeNumber: 'GÜV-102',
      shift: 'Gece Vardiyası (00:00 - 08:00)',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'staff-3',
      fullName: 'Murat Kaya',
      username: 'muratkaya',
      phone: '05353334455',
      role: 'staff',
      badgeNumber: 'GÜV-103',
      shift: 'Sinema Kapanış Ekibi',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-1',
      fullName: 'Otomasyon Birimi',
      username: 'otomasyon',
      phone: '05303200274',
      role: 'admin',
      badgeNumber: 'YÖN-01',
      shift: 'Merkez Yönetim',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  // Completely clean empty records for real production deployment
  const records: ParkingRecord[] = [];

  const db: DatabaseSchema = {
    records,
    staffUsers,
    mallConfig: DEFAULT_MALL_CONFIG,
    auditSessions: {
      [today]: {
        completed: false,
        isLockedForStaff: false,
        isEntryPermitted: true,
        authorizedStaffId: 'staff-1',
        authorizedStaffName: 'Ahmet Yılmaz',
        notes: 'Bugünkü görevli: Ahmet Yılmaz',
      },
    },
  };

  saveDatabase(db);
  return db;
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.staffUsers || parsed.staffUsers.length === 0) {
        const initial = createInitialDatabase();
        parsed.staffUsers = initial.staffUsers;
        parsed.mallConfig = initial.mallConfig;
      }
      if (!parsed.mallConfig) {
        parsed.mallConfig = DEFAULT_MALL_CONFIG;
      }
      // Ensure session has isEntryPermitted field
      const today = getTodayStr();
      if (!parsed.auditSessions) parsed.auditSessions = {};
      if (!parsed.auditSessions[today]) {
        parsed.auditSessions[today] = {
          completed: false,
          isLockedForStaff: false,
          isEntryPermitted: true,
          authorizedStaffId: parsed.staffUsers[0]?.id || null,
          authorizedStaffName: parsed.staffUsers[0]?.fullName || null,
        };
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return createInitialDatabase();
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

function calculateStayInfo(
  normalizedPlate: string,
  targetDate: string,
  dbRecords: ParkingRecord[]
): {
  daysParked: number;
  firstSeenDate: string;
  previousRecord?: ParkingRecord;
  historyCount: number;
} {
  const plateRecords = dbRecords
    .filter(
      (r) =>
        r.normalizedPlate === normalizedPlate &&
        r.auditDate <= targetDate &&
        r.status !== 'departed'
    )
    .sort((a, b) => a.auditDate.localeCompare(b.auditDate));

  if (plateRecords.length === 0) {
    return {
      daysParked: 1,
      firstSeenDate: targetDate,
      historyCount: 0,
    };
  }

  const firstSeen = plateRecords[0].firstSeenDate || plateRecords[0].auditDate;
  const lastRecordBeforeToday = [...plateRecords]
    .reverse()
    .find((r) => r.auditDate < targetDate);

  const distinctAuditDates = new Set(
    plateRecords.map((r) => r.auditDate).filter((d) => d < targetDate)
  );
  distinctAuditDates.add(targetDate);

  let days = 1;
  if (lastRecordBeforeToday) {
    days = (lastRecordBeforeToday.daysParked || distinctAuditDates.size) + 1;
  } else {
    days = distinctAuditDates.size;
  }

  return {
    daysParked: Math.max(1, days),
    firstSeenDate: firstSeen,
    previousRecord: lastRecordBeforeToday,
    historyCount: plateRecords.length,
  };
}

// ================= API ROUTES =================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AUTH LOGIN
app.post('/api/auth/login', (req, res) => {
  const db = loadDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });
  }

  const cleanUser = normalizeUsername(username);
  const cleanPass = normalizePhone(password);

  // Admin fallback
  if (
    (cleanUser === 'admin' || cleanUser === 'otomasyon') &&
    (cleanPass === 'admin' || password === 'admin' || cleanPass.endsWith('9998877') || cleanPass === '1234')
  ) {
    const adminUser = db.staffUsers.find((u) => u.role === 'admin') || {
      id: 'admin-1',
      fullName: 'Otomasyon Birimi',
      username: 'otomasyon',
      phone: '05559998877',
      role: 'admin',
      badgeNumber: 'YÖN-01',
      shift: 'Merkez Yönetim',
      active: true,
      createdAt: new Date().toISOString(),
    };
    return res.json({ success: true, user: adminUser });
  }

  // Find staff
  const found = db.staffUsers.find((u) => {
    const uName = normalizeUsername(u.username);
    const uFullName = normalizeUsername(u.fullName);
    const uPhone = normalizePhone(u.phone);

    const matchesUser = cleanUser === uName || cleanUser === uFullName;
    const matchesPass =
      cleanPass === uPhone ||
      (cleanPass.length >= 7 && uPhone.endsWith(cleanPass)) ||
      password.trim() === u.phone.trim();

    return matchesUser && matchesPass;
  });

  if (!found) {
    return res.status(401).json({
      error:
        'Hatalı kullanıcı adı veya şifre. Kullanıcı adı personelin adı-soyadı bitişik (Örn: ahmetyilmaz), şifre ise cep telefon numarasıdır.',
    });
  }

  if (!found.active) {
    return res.status(403).json({
      error: 'Bu personelin sisteme giriş yetkisi Otomasyon Birimi tarafından dondurulmuştur.',
    });
  }

  res.json({ success: true, user: found });
});

// STAFF MANAGEMENT
app.get('/api/staff', (req, res) => {
  const db = loadDatabase();
  res.json({ success: true, staff: db.staffUsers });
});

app.post('/api/staff', (req, res) => {
  const db = loadDatabase();
  const { fullName, phone, role = 'staff', badgeNumber, shift } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'Personel adı soyadı ve telefon numarası zorunludur.' });
  }

  const baseUsername = normalizeUsername(fullName) || 'personel';
  let finalUsername = baseUsername;
  let counter = 2;
  while (db.staffUsers.some((u) => normalizeUsername(u.username) === finalUsername)) {
    finalUsername = `${baseUsername}${counter}`;
    counter++;
  }

  const newStaff: StaffUser = {
    id: `staff-${Date.now()}`,
    fullName: fullName.trim(),
    username: finalUsername,
    phone: phone.trim(),
    role: role === 'admin' ? 'admin' : 'staff',
    badgeNumber: badgeNumber?.trim() || `GÜV-${Math.floor(100 + Math.random() * 900)}`,
    shift: shift?.trim() || 'Gece Vardiyası (00:00 - 08:00)',
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.staffUsers.push(newStaff);
  saveDatabase(db);
  res.json({ success: true, staff: newStaff, allStaff: db.staffUsers, message: 'Personel başarıyla eklendi.' });
});

app.put('/api/staff/:id', (req, res) => {
  const db = loadDatabase();
  const id = req.params.id;
  const index = db.staffUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Personel bulunamadı.' });
  }

  const current = db.staffUsers[index];
  const { fullName, phone, role, badgeNumber, shift, active } = req.body;

  db.staffUsers[index] = {
    ...current,
    fullName: fullName !== undefined ? fullName.trim() : current.fullName,
    username: fullName !== undefined ? normalizeUsername(fullName) : current.username,
    phone: phone !== undefined ? phone.trim() : current.phone,
    role: role !== undefined ? role : current.role,
    badgeNumber: badgeNumber !== undefined ? badgeNumber.trim() : current.badgeNumber,
    shift: shift !== undefined ? shift.trim() : current.shift,
    active: active !== undefined ? Boolean(active) : current.active,
  };

  saveDatabase(db);
  res.json({ success: true, staff: db.staffUsers[index], allStaff: db.staffUsers, message: 'Personel güncellendi.' });
});

app.delete('/api/staff/:id', (req, res) => {
  const db = loadDatabase();
  const id = req.params.id;
  const initialCount = db.staffUsers.length;
  db.staffUsers = db.staffUsers.filter((u) => u.id !== id);
  if (db.staffUsers.length === initialCount) {
    return res.status(404).json({ error: 'Personel bulunamadı.' });
  }
  saveDatabase(db);
  res.json({ success: true, message: 'Personel sistemden çıkarıldı.', staff: db.staffUsers });
});

// MALL CONFIGURATION
app.get('/api/config', (req, res) => {
  const db = loadDatabase();
  res.json({ success: true, config: db.mallConfig || DEFAULT_MALL_CONFIG });
});

app.post('/api/config', (req, res) => {
  const db = loadDatabase();
  const updatedConfig: MallConfig = {
    ...DEFAULT_MALL_CONFIG,
    ...(db.mallConfig || {}),
    ...req.body,
  };

  db.mallConfig = updatedConfig;
  saveDatabase(db);
  res.json({ success: true, config: updatedConfig, message: 'AVM ayarları kaydedildi.' });
});

// DEDICATED FLOOR MANAGEMENT (Add / Remove / Reorder)
app.post('/api/floors', (req, res) => {
  const db = loadDatabase();
  const { floor } = req.body;
  if (!floor || !String(floor).trim()) {
    return res.status(400).json({ error: 'Kat adı boş olamaz.' });
  }
  const cleanFloor = String(floor).trim();
  if (!db.mallConfig) db.mallConfig = { ...DEFAULT_MALL_CONFIG };
  if (!db.mallConfig.floors) db.mallConfig.floors = [];

  if (db.mallConfig.floors.includes(cleanFloor)) {
    return res.status(400).json({ error: `"${cleanFloor}" katı zaten listede mevcut.` });
  }
  db.mallConfig.floors.push(cleanFloor);
  saveDatabase(db);
  res.json({ success: true, floors: db.mallConfig.floors, message: `${cleanFloor} katı başarıyla eklendi.` });
});

app.delete('/api/floors/:floorName', (req, res) => {
  const db = loadDatabase();
  const floorName = decodeURIComponent(req.params.floorName).trim();
  if (!db.mallConfig || !db.mallConfig.floors || db.mallConfig.floors.length <= 1) {
    return res.status(400).json({ error: 'En az bir kat tanımlı kalmalıdır.' });
  }
  db.mallConfig.floors = db.mallConfig.floors.filter((f) => f.trim() !== floorName);
  saveDatabase(db);
  res.json({ success: true, floors: db.mallConfig.floors, message: `${floorName} katı listeden kaldırıldı.` });
});

app.put('/api/floors', (req, res) => {
  const db = loadDatabase();
  const { floors } = req.body;
  if (!Array.isArray(floors) || floors.length === 0) {
    return res.status(400).json({ error: 'Geçersiz kat listesi.' });
  }
  const cleanFloors = floors.map((f: string) => String(f).trim()).filter(Boolean);
  if (!db.mallConfig) db.mallConfig = { ...DEFAULT_MALL_CONFIG };
  db.mallConfig.floors = cleanFloors;
  saveDatabase(db);
  res.json({ success: true, floors: db.mallConfig.floors, message: 'Kat listesi güncellendi.' });
});

// CLEAR ALL RECORDS (Reset for clean production launch)
app.post('/api/records/clear-all', (req, res) => {
  const db = loadDatabase();
  db.records = [];
  if (!db.mallConfig) db.mallConfig = { ...DEFAULT_MALL_CONFIG };
  db.mallConfig.floors = ['P-2', 'P-3', 'P-4', 'P-5'];
  const today = getTodayStr();
  db.auditSessions = {
    [today]: {
      completed: false,
      isLockedForStaff: false,
      isEntryPermitted: true,
      authorizedStaffId: db.staffUsers[0]?.id || null,
      authorizedStaffName: db.staffUsers[0]?.fullName || null,
      notes: 'Gerçek kullanım için sıfırlandı.',
    },
  };
  saveDatabase(db);
  res.json({
    success: true,
    message: 'Tüm örnek veriler sıfırlandı. Otopark katları P-2, P-3, P-4, P-5 olarak güncellendi. Sistem gerçek kullanıma hazır.',
    floors: db.mallConfig.floors,
    recordsCount: 0,
  });
});

// SESSION LOCK & PERMISSION MANAGEMENT
app.get('/api/session/status', (req, res) => {
  const db = loadDatabase();
  const today = getTodayStr();
  const session = db.auditSessions[today] || {
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: true,
  };
  res.json({ success: true, date: today, session });
});

// Otomasyon assigns duty staff & grants or revokes vehicle entry permission
app.post('/api/session/set-permission', (req, res) => {
  const db = loadDatabase();
  const today = getTodayStr();
  const { staffId, isPermitted } = req.body;

  const targetStaff = db.staffUsers.find((u) => u.id === staffId);
  const existing = db.auditSessions[today] || {
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: false,
  };

  db.auditSessions[today] = {
    ...existing,
    authorizedStaffId: staffId || null,
    authorizedStaffName: targetStaff ? targetStaff.fullName : null,
    isEntryPermitted: Boolean(isPermitted),
    isLockedForStaff: !isPermitted,
    notes: isPermitted
      ? `Otomasyon Birimi tarafından ${targetStaff?.fullName || 'Personele'} araç ekleme izni verildi.`
      : `Otomasyon Birimi tarafından araç ekleme izni durduruldu.`,
  };

  saveDatabase(db);
  res.json({
    success: true,
    message: isPermitted
      ? `${targetStaff?.fullName || 'Personele'} araç ekleme izni başarıyla verildi.`
      : 'Araç ekleme izni durduruldu.',
    session: db.auditSessions[today],
  });
});

// Staff clicks "Araç Bitti" -> Finishes round, PERMISSION AUTOMATICALLY REVOKED!
app.post('/api/session/finish-entry', (req, res) => {
  const db = loadDatabase();
  const today = getTodayStr();
  const { staffName = 'Saha Personeli', notes } = req.body;

  const existing = db.auditSessions[today] || { completed: false, isLockedForStaff: false };
  db.auditSessions[today] = {
    ...existing,
    completed: true,
    completedAt: new Date().toISOString(),
    completedBy: staffName,
    isLockedForStaff: true,
    isEntryPermitted: false, // Automatically revoked!
    notes: notes || `${staffName} araç eklemeyi bitirdi. Giriş izni otomatik olarak kaldırıldı.`,
  };

  saveDatabase(db);
  res.json({
    success: true,
    message: 'Araç ekleme tamamlandı. İzniniz otomatik olarak sonlandırıldı. Veriler anlık olarak Otomasyon ekranına iletildi.',
    session: db.auditSessions[today],
  });
});

// RECORDS API (Sorted sequentially by floor then column)
app.get('/api/records', (req, res) => {
  const db = loadDatabase();
  const { date, floor, q, overstayOnly } = req.query;

  let results = [...db.records];

  if (date) {
    results = results.filter((r) => r.auditDate === String(date));
  }
  if (floor && floor !== 'ALL') {
    results = results.filter((r) => r.floor === String(floor));
  }
  if (overstayOnly === 'true') {
    results = results.filter((r) => r.daysParked >= 2);
  }
  if (q) {
    const search = String(q).toUpperCase().replace(/\s+/g, '');
    results = results.filter(
      (r) =>
        r.normalizedPlate.includes(search) ||
        r.plate.toUpperCase().includes(String(q).toUpperCase()) ||
        r.column.toUpperCase().includes(String(q).toUpperCase()) ||
        r.brand.toUpperCase().includes(String(q).toUpperCase()) ||
        r.color.toUpperCase().includes(String(q).toUpperCase()) ||
        r.floor.toUpperCase().includes(String(q).toUpperCase()) ||
        r.staffName.toUpperCase().includes(String(q).toUpperCase())
    );
  }

  // Sort sequentially by Mall Floors order, then by column
  const floorOrder = db.mallConfig?.floors || DEFAULT_MALL_CONFIG.floors;
  results.sort((a, b) => {
    const floorIndexA = floorOrder.indexOf(a.floor);
    const floorIndexB = floorOrder.indexOf(b.floor);

    const fA = floorIndexA === -1 ? 999 : floorIndexA;
    const fB = floorIndexB === -1 ? 999 : floorIndexB;

    if (fA !== fB) {
      return fA - fB;
    }

    // Secondary sort: column alphanumeric (A-01, A-02, B-01...)
    return a.column.localeCompare(b.column, undefined, { numeric: true });
  });

  res.json({
    success: true,
    total: results.length,
    records: results,
  });
});

// Plate lookup
app.get('/api/lookup/:plate', (req, res) => {
  const db = loadDatabase();
  const normalized = normalizePlateStr(req.params.plate);

  const matched = db.records
    .filter((r) => r.normalizedPlate === normalized)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Check if plate already registered TODAY
  const today = getTodayStr();
  const registeredToday = db.records.find(
    (r) => r.normalizedPlate === normalized && r.auditDate === today
  );

  if (matched.length === 0) {
    return res.json({
      found: false,
      plate: req.params.plate,
      normalizedPlate: normalized,
      isAlreadyRegisteredToday: false,
    });
  }

  const latest = matched[0];
  const stayInfo = calculateStayInfo(normalized, today, db.records);

  res.json({
    found: true,
    plate: latest.plate,
    normalizedPlate: normalized,
    isAlreadyRegisteredToday: Boolean(registeredToday),
    registeredTodayRecord: registeredToday || null,
    latestRecord: latest,
    historyRecords: matched,
    estimatedDaysParkedIfAddedToday: stayInfo.daysParked,
    firstSeenDate: stayInfo.firstSeenDate,
    previousFloor: latest.floor,
    previousColumn: latest.column,
    brand: latest.brand,
    color: latest.color,
    vehicleType: latest.vehicleType,
    notes: latest.notes,
  });
});

// POST new record
app.post('/api/records', (req, res) => {
  const db = loadDatabase();
  const today = getTodayStr();
  const auditDate = req.body.auditDate || today;

  const session = db.auditSessions[auditDate] || {
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: true,
  };
  const userRole = req.body.userRole || 'staff';
  const staffId = req.body.staffId;

  // 1. Permission check for staff
  if (userRole !== 'admin') {
    if (!session.isEntryPermitted || session.isLockedForStaff) {
      return res.status(403).json({
        error:
          'Bugün için araç ekleme izniniz bulunmamaktadır veya araç ekleme bittiğinden izin otomatik kaldırılmıştır. Yeni araç eklemek için Otomasyon Biriminin izin vermesi gerekmektedir.',
      });
    }

    if (session.authorizedStaffId && staffId && session.authorizedStaffId !== staffId) {
      return res.status(403).json({
        error: `Bugünkü araç ekleme izni [${session.authorizedStaffName || 'Görevli Personel'}] için verilmiştir. Sizin araç ekleme yetkiniz bulunmamaktadır.`,
      });
    }
  }

  const {
    plate,
    floor,
    column,
    vehicleType,
    brand,
    color,
    notes,
    photoUrl,
    staffName,
  } = req.body;

  if (!plate || !floor || !column) {
    return res.status(400).json({
      error: 'Plaka, kat ve kolon numarası zorunludur.',
    });
  }

  const cleanPlate = plate.toUpperCase().trim();
  const normalized = normalizePlateStr(cleanPlate);

  // 2. DUPLICATE CHECK: AYNİ PLAKA İKİ KEZ YAZILIRSA UYARI VER SİSTEME EKLEME!
  const duplicateToday = db.records.find(
    (r) => r.normalizedPlate === normalized && r.auditDate === auditDate
  );

  if (duplicateToday) {
    return res.status(400).json({
      duplicate: true,
      error: `⚠️ DİKKAT: "${cleanPlate}" plakalı araç bugün zaten sisteme eklenmiştir!\nBulunduğu Konum: ${duplicateToday.floor} / Kolon ${duplicateToday.column}\nKaydeden: ${duplicateToday.staffName}\nAynı plaka bugün iki kez eklenemez!`,
      existingRecord: duplicateToday,
    });
  }

  const stayInfo = calculateStayInfo(normalized, auditDate, db.records);
  const daysParked = stayInfo.daysParked;
  const firstSeenDate = stayInfo.firstSeenDate || auditDate;

  const newRecord: ParkingRecord = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    plate: cleanPlate,
    normalizedPlate: normalized,
    floor: floor.trim(),
    column: column.trim().toUpperCase(),
    vehicleType: vehicleType || 'automobile',
    brand: brand || 'Bilinmiyor',
    color: color || 'Bilinmiyor',
    notes: notes || '',
    photoUrl: photoUrl || undefined,
    staffName: staffName || 'Otopark Görevlisi',
    staffId: staffId || undefined,
    auditDate,
    timestamp: new Date().toISOString(),
    daysParked,
    firstSeenDate,
    lastSeenDate: auditDate,
    isOverstay: daysParked >= 2,
    isAbandonedRisk: daysParked >= 4,
    status: daysParked >= 4 ? 'suspect' : 'active',
  };

  db.records.push(newRecord);
  saveDatabase(db);

  res.json({
    success: true,
    record: newRecord,
    isUpdate: false,
    previousStayDays: stayInfo.daysParked - 1,
    message:
      daysParked > 1
        ? `Bu araç ${daysParked} gündür otoparkta! (+1 gün eklendi)`
        : 'Araç kaydı başarıyla oluşturuldu.',
  });
});

// DELETE
app.delete('/api/records/:id', (req, res) => {
  const db = loadDatabase();
  const id = req.params.id;
  db.records = db.records.filter((r) => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, message: 'Kayıt silindi' });
});

// SUMMARY
app.get('/api/summary', (req, res) => {
  const db = loadDatabase();
  const today = getTodayStr();
  const targetDate = String(req.query.date || today);

  const targetRecords = db.records.filter((r) => r.auditDate === targetDate);

  const floorCounts: { [floor: string]: number } = {};
  let totalAutomobile = 0;
  let totalMotorcycle = 0;
  let totalVan = 0;
  let multiDayCount = 0;
  let abandonedRiskCount = 0;

  for (const r of targetRecords) {
    floorCounts[r.floor] = (floorCounts[r.floor] || 0) + 1;
    if (r.vehicleType === 'automobile') totalAutomobile++;
    else if (r.vehicleType === 'motorcycle') totalMotorcycle++;
    else if (r.vehicleType === 'van') totalVan++;

    if (r.daysParked >= 2) multiDayCount++;
    if (r.daysParked >= 4) abandonedRiskCount++;
  }

  const session = db.auditSessions[targetDate] || {
    completed: false,
    isLockedForStaff: false,
    isEntryPermitted: true,
  };

  res.json({
    date: targetDate,
    totalParkedToday: targetRecords.length,
    totalAutomobile,
    totalMotorcycle,
    totalVan,
    multiDayCount,
    abandonedRiskCount,
    floorCounts,
    session,
    distinctAuditedDates: Object.keys(db.auditSessions).sort().reverse(),
  });
});

// RESET DEMO
app.post('/api/reset-demo', (req, res) => {
  const db = createInitialDatabase();
  res.json({ success: true, message: 'Veriler ve personeller sıfırlandı.', db });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AVM Otopark Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
