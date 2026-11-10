/**
 * Role constants for RBAC (Role-Based Access Control)
 * These match the backend role definitions
 */
export const ROLES = {
  ADMIN: 'ROLE_ADMIN',
  MODERATOR: 'ROLE_MODERATOR',
  PARTNER: 'ROLE_PARTNER',
  USER: 'ROLE_USER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Check if a role string is a valid Role
 */
export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role)
}

