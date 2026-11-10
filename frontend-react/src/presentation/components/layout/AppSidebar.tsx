/**
 * AppSidebar — layout component
 *
 * Mobile-only slide-out drawer: warm dark panel, Lucide icons, RBAC-filtered
 * nav, user card, staggered entrance, login/register/logout actions.
 * Hidden on desktop — desktop nav is in the AppHeader.
 */
import { ChevronRight, LogIn, LogOut, X } from 'lucide-react'
import { VinnotBrand } from '@components/brand/VinnotBrand'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useUiStore } from '@stores/ui.store'
import { useAuth } from '@hooks/useAuth'
import { navigationItems, type NavigationItem } from '@config/navigation'
import { filterNavigationByRoles } from '@utils/navigation'
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useDialogFocus } from '@hooks/ui/useDialogFocus'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { MOBILE_DRAWER_ID } from './mobileDrawer'
import { navIcons } from './navIcons'

export function AppSidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const { user, isAuthenticated } = useAuth()

  const reducedMotion = useReducedMotion()
  const [itemsVisible, setItemsVisible] = useState(false)

  useEffect(() => {
    if (sidebarOpen) {
      const timer = setTimeout(() => setItemsVisible(true), 150)
      return () => clearTimeout(timer)
    } else {
      setItemsVisible(false)
    }
  }, [sidebarOpen])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen])
  const drawerRef = useDialogFocus<HTMLElement>(sidebarOpen, closeSidebar)
  const { currentLoginPath, currentRegisterPath } = useAuthReturnPath()

  const userRoles = user?.roles as string[] | undefined

  const visibleNavItems = filterNavigationByRoles(
    navigationItems,
    isAuthenticated,
    userRoles,
  )

  const isActive = (item: NavigationItem): boolean => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'

  const handleLogout = async () => {
    const { useAuthStore } = await import('@stores/auth.store')
    useAuthStore.getState().logout()
    closeSidebar()
  }

  return (
    <div className="lg:hidden">
      {/* Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 motion-reduce:transition-none"
          onClick={closeSidebar}
        />
      )}

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        id={MOBILE_DRAWER_ID}
        tabIndex={-1}
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen ? true : undefined}
        aria-label={t('nav.menu', 'Menú')}
        aria-hidden={sidebarOpen ? undefined : true}
        inert={!sidebarOpen}
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-gray-900 shadow-2xl shadow-black/40 flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ─── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          {/* Logo */}
          <Link to="/" aria-label="Vinnot" className="flex items-center gap-2 group" onClick={closeSidebar}>
            <VinnotBrand compact className="text-white/90 group-hover:text-white" />
          </Link>

          {/* Close button */}
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center -mr-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl active:scale-95 transition-all duration-200"
            onClick={closeSidebar}
            aria-label={t('nav.closeMenu')}
          >
            <Icon icon={X} size="md" />
          </button>
        </div>

        {/* ─── User card (authenticated) ──────────── */}
        {isAuthenticated && user && (
          <div className="mx-4 mb-3 p-3.5 bg-white/[0.06] rounded-2xl border border-white/[0.08]">
            <Link to="/profile" className="flex items-center gap-3 group" onClick={closeSidebar}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-wine-500/40 overflow-hidden bg-gradient-to-br from-wine-500 to-wine-700 flex-shrink-0 group-hover:ring-wine-400/60 transition-all duration-300">
                <ImageWithFallback
                  src={user.avatar ?? undefined}
                  alt={user.name || ''}
                  className="w-full h-full object-cover"
                  fallbackElement={<span className="text-white font-semibold text-sm">{userInitial}</span>}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <Icon icon={ChevronRight} className="text-gray-400 group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          </div>
        )}

        {/* ─── Navigation ─────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          <p className="px-3 pt-2 pb-2 text-2xs font-semibold text-gray-400 uppercase tracking-widest">
            {t('nav.menu', 'Menú')}
          </p>

          <ul className="space-y-0.5">
            {visibleNavItems.map((item, idx) => (
              <li
                key={item.path}
                // Reduced motion: items are simply there, with no slide-in or stagger.
                className={reducedMotion ? undefined : 'transition-all duration-300'}
                style={reducedMotion ? undefined : {
                  opacity: itemsVisible ? 1 : 0,
                  transform: itemsVisible ? 'translateX(0)' : 'translateX(-16px)',
                  transitionDelay: itemsVisible ? `${idx * 50}ms` : '0ms',
                }}
              >
                <Link
                  to={item.path}
                  className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    isActive(item)
                      ? 'bg-wine-500/15 text-wine-200 shadow-sm shadow-wine-500/10'
                      : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={closeSidebar}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isActive(item)
                        ? 'bg-wine-500/20'
                        : 'bg-white/[0.05] group-hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon icon={navIcons[item.icon]} size="md" />
                  </div>
                  <span>{t(item.labelKey)}</span>
                  {/* Active indicator dot */}
                  {isActive(item) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-wine-400" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ─── Bottom section ─────────────────────── */}
        <div className="border-t border-white/[0.08] px-4 py-4 space-y-2">
          {!isAuthenticated ? (
            <>
              <LinkButton to={currentLoginPath} variant="onDark" className="w-full" leftIcon={<Icon icon={LogIn} />} onClick={closeSidebar}>
                {t('auth.login')}
              </LinkButton>
              <LinkButton to={currentRegisterPath} className="w-full" onClick={closeSidebar}>
                {t('auth.register')}
              </LinkButton>
            </>
          ) : (
            <button
              type="button"
              className="flex min-h-11 items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-wine-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-xl border border-white/[0.08] active:scale-[0.98] transition-all duration-200"
              onClick={handleLogout}
            >
              <Icon icon={LogOut} />
              {t('auth.logout')}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
