/**
 * Navigation utility functions
 *
 * Mirrors the Vue project's guard.ts filterNavigationByRoles function.
 */

/**
 * Filter navigation items based on user authentication and roles
 */
export function filterNavigationByRoles<T extends { requiresAuth?: boolean; guestOnly?: boolean; roles?: string[] }>(
  items: T[],
  isAuthenticated: boolean,
  userRoles: string[] | undefined,
): T[] {
  return items.filter((item) => {
    // Guest-only items hidden when authenticated
    if (item.guestOnly && isAuthenticated) {
      return false
    }

    // Auth-required items hidden when not authenticated
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }

    // Role-gated items require at least one matching role
    if (item.roles && item.roles.length > 0) {
      if (!userRoles || userRoles.length === 0) {
        return false
      }
      return item.roles.some((role) => userRoles.includes(role))
    }

    return true
  })
}

