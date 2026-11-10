import { ROLES } from '@config/roles'

/**
 * Icon of a navigation item. The presentation layer maps each key to a
 * Lucide icon (`components/layout/navIcons.ts`), so this config stays free of
 * UI code.
 */
export type NavigationIcon =
  | 'wines'
  | 'events'
  | 'routes'
  | 'scan'
  | 'cellar'
  | 'admin'
  | 'dashboard'
  | 'submissions'
  | 'users'
  | 'notifications'
  | 'appVersions'
  | 'socialPosts'

/**
 * Navigation item interface with RBAC support
 */
export interface NavigationItem {
  path: string
  labelKey: string
  icon: NavigationIcon
  exact?: boolean
  requiresAuth?: boolean
  guestOnly?: boolean
  roles?: string[]
}

/**
 * Main navigation items for the application
 * Items are filtered based on authentication and user roles
 */
export const navigationItems: NavigationItem[] = [
  {
    path: '/wines',
    labelKey: 'nav.wines',
    icon: 'wines',
  },
  {
    path: '/events',
    labelKey: 'nav.events',
    icon: 'events',
  },
  {
    path: '/wine-routes',
    labelKey: 'nav.routes',
    icon: 'routes',
  },
  {
    path: '/wines/scan',
    labelKey: 'nav.scan',
    icon: 'scan',
    requiresAuth: true,
    roles: [ROLES.USER, ROLES.PARTNER, ROLES.MODERATOR, ROLES.ADMIN],
  },
  {
    path: '/cellar',
    labelKey: 'nav.cellar',
    icon: 'cellar',
    requiresAuth: true,
    roles: [ROLES.USER, ROLES.PARTNER, ROLES.MODERATOR, ROLES.ADMIN],
  },
  {
    path: '/admin',
    labelKey: 'nav.admin',
    icon: 'admin',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
]

/**
 * Secondary navigation items (user menu, etc.)
 */
export const userMenuItems: NavigationItem[] = [
  {
    path: '/cellar',
    labelKey: 'nav.cellar',
    icon: 'cellar',
    requiresAuth: true,
  },
]

/**
 * Admin sub-navigation items
 */
export const adminNavItems: NavigationItem[] = [
  {
    path: '/admin',
    labelKey: 'nav.adminDashboard',
    icon: 'dashboard',
    exact: true,
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
  {
    path: '/admin/wines',
    labelKey: 'nav.adminWines',
    icon: 'wines',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
  {
    path: '/admin/wine-submissions',
    labelKey: 'nav.adminWineSubmissions',
    icon: 'submissions',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
  {
    path: '/admin/events',
    labelKey: 'nav.adminEvents',
    icon: 'events',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
  {
    path: '/admin/routes',
    labelKey: 'nav.adminRoutes',
    icon: 'routes',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.MODERATOR],
  },
  {
    path: '/admin/users',
    labelKey: 'nav.adminUsers',
    icon: 'users',
    requiresAuth: true,
    roles: [ROLES.ADMIN],
  },
  {
    path: '/admin/notifications',
    labelKey: 'nav.adminNotifications',
    icon: 'notifications',
    requiresAuth: true,
    roles: [ROLES.ADMIN],
  },
  {
    path: '/admin/social-posts',
    labelKey: 'nav.adminSocialPosts',
    icon: 'socialPosts',
    requiresAuth: true,
    roles: [ROLES.ADMIN],
  },
  {
    path: '/admin/app-versions',
    labelKey: 'nav.adminAppVersions',
    icon: 'appVersions',
    requiresAuth: true,
    roles: [ROLES.ADMIN],
  },
]

export default navigationItems
