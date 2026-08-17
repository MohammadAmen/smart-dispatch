import type { DriverStatus, Role } from "@/generated/prisma/enums";
import type { SessionRole } from "@/lib/auth/constants";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language: string;
  createdAt: string;
  driver: {
    id: string;
    status: DriverStatus;
    vehicleType: string;
    vehicle: {
      id: string;
      plateNumber: string;
    } | null;
  } | null;
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

export const USER_ROLES: SessionRole[] = ["ADMIN", "DISPATCHER", "DRIVER"];

export function isUserRole(value: string): value is SessionRole {
  return (USER_ROLES as string[]).includes(value);
}
