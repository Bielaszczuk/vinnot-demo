/**
 * RBAC roles.
 * @contract: keep in sync with frontend-react/src/config/roles.ts
 */
export const ROLES = {
  ADMIN: "ROLE_ADMIN",
  MODERATOR: "ROLE_MODERATOR",
  PARTNER: "ROLE_PARTNER",
  USER: "ROLE_USER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

export function hasAnyRole(userRoles: Role[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((r) => userRoles.includes(r));
}

