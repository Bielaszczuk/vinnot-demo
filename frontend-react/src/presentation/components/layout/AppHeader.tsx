/**
 * AppHeader — layout component
 *
 * Sticky warm-dark top bar: brand, desktop navigation with Lucide icons,
 * language menu and the user menu. Below `lg` the menu button opens the drawer.
 */
import { CalendarHeart, ChevronDown, Languages, LogIn, LogOut, Menu, Ticket, UserRound, Warehouse } from 'lucide-react'
import { VinnotBrand } from '@components/brand/VinnotBrand'

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUiStore } from '@stores/ui.store'
import { useAuth } from '@hooks/useAuth'
import { useClickOutside } from '@hooks/useClickOutside'
import { navigationItems } from '@config/navigation'
import { filterNavigationByRoles } from '@utils/navigation'
import type { SupportedLanguage } from '@i18n/index'
import { LinkButton } from '@components/ui/LinkButton'
import { Icon } from '@components/ui/Icon'
import { ROLES } from '@config/roles'
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { MOBILE_DRAWER_ID } from './mobileDrawer'
import { navIcons } from './navIcons'

const languages: { code: SupportedLanguage; label: string }[] = [
  { code: 'en-US', label: 'English' },
  { code: 'es-AR', label: 'Español' },
]

export function AppHeader() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar, sidebarOpen } = useUiStore()
  const { currentLoginPath, currentRegisterPath } = useAuthReturnPath()
  const { user, isAuthenticated, hasAnyRole, logout } = useAuth()

  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const langRef = useClickOutside<HTMLDivElement>(() => setShowLanguageMenu(false))
  const userRef = useClickOutside<HTMLDivElement>(() => setShowUserMenu(false))

  const currentLanguage = languages.find((l) => l.code === i18n.language) ?? languages[1]!

  const changeLanguage = (locale: SupportedLanguage) => {
    i18n.changeLanguage(locale)
    setShowLanguageMenu(false)
  }

  const userRoles = user?.roles as string[] | undefined

  const visibleNavItems = filterNavigationByRoles(
    navigationItems,
    isAuthenticated,
    userRoles,
  )

  const isActive = useCallback(
    (path: string, exact?: boolean): boolean => {
      if (exact) return location.pathname === path
      return location.pathname.startsWith(path)
    },
    [location.pathname],
  )

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
    navigate('/login', { replace: true })
  }

  const isPartnerOrAdmin = hasAnyRole([ROLES.PARTNER, ROLES.ADMIN])

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center h-14 px-3 sm:px-6 lg:px-8 gap-1 sm:gap-2">
          {/* Left: Mobile menu & Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden min-h-11 min-w-11 flex items-center justify-center p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              onClick={toggleSidebar}
              aria-label={t("nav.menu")}
              aria-expanded={sidebarOpen}
              aria-controls={MOBILE_DRAWER_ID}
            >
              <Icon icon={Menu} size="md" />
            </button>

            {/* Logo */}
            <Link to="/" aria-label="Vinnot" className="flex items-center gap-1.5 group flex-shrink-0">
              <VinnotBrand compact className="text-white/90 group-hover:text-white" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 ml-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive(item.path, item.exact)
                    ? 'text-white bg-white/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon icon={navIcons[item.icon]} />
                <span>{t(item.labelKey)}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Language, User */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                className="flex items-center gap-1.5 min-h-11 min-w-11 justify-center px-1.5 sm:px-2.5 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                aria-label={`${t("common.language")}: ${currentLanguage.label}`}
                aria-expanded={showLanguageMenu}
              >
                <Icon icon={Languages} />
                <span className="hidden sm:inline text-xs">{currentLanguage.label}</span>
                <Icon icon={ChevronDown} size="xs" className="hidden sm:block" />
              </button>

              {/* Language Dropdown */}
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-xl shadow-xl border border-white/10 py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors ${
                        i18n.language === lang.code ? 'bg-wine-500/20 text-wine-200' : ''
                      }`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <Icon icon={Languages} />
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 min-h-11 min-w-11 justify-center px-1.5 sm:px-2.5 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label={`${t("profile.title")}: ${user.name}`}
                  aria-expanded={showUserMenu}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-wine-500/30 overflow-hidden bg-wine-600">
                    <ImageWithFallback
                      src={user.avatar ?? undefined}
                      alt={user.name || 'Avatar'}
                      className="w-full h-full object-cover"
                      fallbackElement={(
                        <span className="text-white font-medium text-xs">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    />
                  </span>
                  <span className="hidden sm:inline max-w-40 truncate font-medium text-gray-300 text-xs">{user.name}</span>
                  <Icon icon={ChevronDown} size="xs" className="hidden sm:block" />
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-xl border border-white/10 py-1 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Icon icon={UserRound} />
                      {t("profile.title")}
                    </Link>
                    <Link
                      to="/my-tickets"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Icon icon={Ticket} />
                      {t('tickets.title')}
                    </Link>
                    <Link
                      to="/cellar"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Icon icon={Warehouse} />
                      {t('nav.cellar')}
                    </Link>
                    {isPartnerOrAdmin && (
                      <Link
                        to="/partner/events"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Icon icon={CalendarHeart} />
                        {t("events.myEvents")}
                      </Link>
                    )}
                    <hr className="my-1 border-white/10" />
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-wine-200 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={handleLogout}
                    >
                      <Icon icon={LogOut} />
                      {t('auth.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to={currentLoginPath} aria-label={t('auth.login')} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-gray-300 hover:bg-white/10 hover:text-white sm:px-3">
                  <Icon icon={LogIn} size="md" className="sm:hidden" />
                  <span className="hidden text-sm sm:inline">{t('auth.login')}</span>
                </Link>
                <LinkButton to={currentRegisterPath} size="sm" className="hidden sm:inline-flex">
                  {t('auth.register')}
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
