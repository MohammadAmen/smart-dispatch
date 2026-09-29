import type { DriverStatus, Role } from "@/generated/prisma/enums";
import type { SessionRole } from "@/lib/auth/constants";

export interface UserOpsStats {
  openOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  stores: number;
  recordedActions: number;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language: string;
  createdAt: string;
  stats: UserOpsStats;
  driver: {
    id: string;
    status: DriverStatus;
    vehicleType: string;
    lastActive: string;
    vehicle: {
      id: string;
      plateNumber: string;
    } | null;
  } | null;
}

export type UserOperationLink = "customer" | "driver" | "store" | "recorded";

export interface UserOperation {
  id: string;
  link: UserOperationLink;
  action: string;
  orderNumber: string | null;
  orderStatus: string | null;
  storeName: string | null;
  counterparty: string | null;
  note: string | null;
  createdAt: string;
}

export interface UserStoreSummary {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

export interface UserActivity {
  stores: UserStoreSummary[];
  operations: UserOperation[];
}

export interface UsersListResponse {
  ok: true;
  users: ManagedUser[];
}

export interface UserWriteInput {
  name: string;
  email: string;
  phone: string;
  role: SessionRole;
  language: string;
  password?: string;
  vehicleType?: string;
  vehicleId?: string | null;
}

export const USER_ROLES: SessionRole[] = [
  "SUPER_ADMIN",
  "STORE_OWNER",
  "DISPATCHER",
  "DRIVER",
  "CUSTOMER",
];

export function isUserRole(value: string): value is SessionRole {
  return (USER_ROLES as string[]).includes(value);
}
