export interface AnalyticsKpis {
  revenue: number;
  cashCollected: number;
  cashPending: number;
  deliveredCount: number;
  canceledCount: number;
  avgDeliveryMinutes: number;
  utilizationPct: number;
  onDutyDrivers: number;
  busyDrivers: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface PeakHourPoint {
  hour: number;
  label: string;
  orders: number;
}

export interface DriverLeaderboardRow {
  driverId: string;
  name: string;
  vehicleType: string;
  completed: number;
  cashCollected: number;
  avgMinutes: number;
  rating: number;
}

export interface CashPendingRow {
  driverId: string;
  name: string;
  vehicleType: string;
  orderCount: number;
  amount: number;
  lastDeliveryAt: string;
}

export interface AnalyticsPayload {
  ok: true;
  kpis: AnalyticsKpis;
  daily: TrendPoint[];
  weekly: TrendPoint[];
  peakHours: PeakHourPoint[];
  leaderboard: DriverLeaderboardRow[];
  cashPending: CashPendingRow[];
}

export interface SettleCashResponse {
  ok: true;
  driverId: string;
  settledCount: number;
  settledAmount: number;
}
