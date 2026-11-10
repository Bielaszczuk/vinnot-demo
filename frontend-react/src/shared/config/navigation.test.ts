import { describe, expect, it } from 'vitest'
import { adminNavItems, navigationItems } from './navigation'
import { ROLES } from './roles'

const ADMIN_ONLY = ['/admin/users', '/admin/notifications', '/admin/social-posts', '/admin/app-versions']

describe('administrative navigation', () => {
  it('exposes catalog and submission moderation to moderators without user or notification management', () => {
    expect(navigationItems.find(item => item.path === '/admin')?.roles).toContain(ROLES.MODERATOR)
    for (const item of adminNavItems) {
      expect(item.roles).toContain(ROLES.ADMIN)
      if (ADMIN_ONLY.includes(item.path)) {
        expect(item.roles).not.toContain(ROLES.MODERATOR)
      } else {
        expect(item.roles).toContain(ROLES.MODERATOR)
      }
      expect(item.roles).not.toContain(ROLES.USER)
      expect(item.roles).not.toContain(ROLES.PARTNER)
    }
    expect(adminNavItems.map(item => item.path)).toEqual(expect.arrayContaining(ADMIN_ONLY))
  })
})
