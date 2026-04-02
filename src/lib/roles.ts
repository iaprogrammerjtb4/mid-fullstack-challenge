import { z } from "zod";

export const UserRole = {
  PM: "PM",
  DEVELOPER: "DEVELOPER",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum(["PM", "DEVELOPER"]);

export function isPm(role: string | undefined): boolean {
  return role === UserRole.PM;
}

export function isPmOrDeveloper(role: string | undefined): boolean {
  return role === UserRole.PM || role === UserRole.DEVELOPER;
}
