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
  daysParked: number; // stay duration in days (>=1)
  firstSeenDate: string; // "YYYY-MM-DD"
  lastSeenDate: string; // "YYYY-MM-DD"
  isOverstay: boolean; // >= 2 days
  isAbandonedRisk: boolean; // >= 4 days
  status: 'active' | 'departed' | 'suspect' | 'towed';
}

export interface VehicleSummary {
  normalizedPlate: string;
  plate: string;
  vehicleType: VehicleType;
  brand: string;
  color: string;
  currentFloor: string;
  currentColumn: string;
  firstSeenDate: string;
  lastSeenDate: string;
  totalDaysParked: number;
  isOverstay: boolean;
  isAbandonedRisk: boolean;
  status: string;
  notes: string;
  history: ParkingRecord[];
}

export interface AuditSessionState {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  isLockedForStaff: boolean; // True when staff taps "Araç Bitti"
  isEntryPermitted: boolean; // Must be true for assigned staff to add vehicles
  authorizedStaffId?: string | null; // Selected staff member permitted to add vehicles today
  authorizedStaffName?: string | null;
  notes?: string;
}

export interface DailySummary {
  date: string;
  totalParkedToday: number;
  totalAutomobile: number;
  totalMotorcycle: number;
  totalVan: number;
  multiDayCount: number;
  abandonedRiskCount: number;
  floorCounts: Record<string, number>;
  session?: AuditSessionState;
  distinctAuditedDates?: string[];
}

export interface StaffUser {
  id: string;
  fullName: string;
  username: string; // e.g. "ahmetyilmaz" (personelin adı soyadı bitişik)
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

export interface StaffProfile {
  name: string;
  badgeNumber: string;
  shift: string;
  whatsappGroupNumber?: string;
}
