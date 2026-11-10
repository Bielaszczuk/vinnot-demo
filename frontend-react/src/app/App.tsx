import { MyTicketsPage, MyTicketDetailsPage } from "@pages/events/MyTicketsPage"
import { PaymentReturnPage } from "@pages/events/PaymentReturnPage"
/**
 * Root application component — Stage 10: Testing, Polish, Performance & Handoff
 *
 * Integrates providers, router, layout, auth pages, public pages,
 * wine module, event module, winery module, wine-routes module,
 * cellar module, partner module, admin module, and feedback overlays.
 *
 * Performance: heavy page modules use React.lazy + Suspense for code splitting.
 * Guards and layout wrappers remain eagerly loaded (small footprint).
 *
 * Route structure:
 *   /login, /register        → Auth pages (no shell)
 *   / (public)               → HomePage inside AppShell
 *   /about                   → AboutPage inside AppShell
 *   /contact                 → ContactPage inside AppShell
 *   /wines, /wines/:id, …    → Wine pages inside AppShell + auth guard (lazy)
 *   /events                  → EventsNearbyPage inside AppShell + auth guard (lazy)
 *   /events/:id              → EventDetailsPage inside AppShell + auth guard (lazy)
 *   /wineries/:id            → WineryDetailsPage inside AppShell + auth guard (lazy)
 *   /wine-routes             → WineRoutesPage inside AppShell + auth guard (lazy)
 *   /wine-routes/:id         → WineRouteDetailsPage inside AppShell + auth guard (lazy)
 *   /cellar (protected)      → MyCellarPage inside AppShell + auth guard (lazy)
 *   /profile (protected)     → UserProfilePage inside AppShell + auth guard (lazy)
 *   /profile/points          → PointsPage ("Your points") inside AppShell + auth guard (lazy)
 *   /partner/events (partner)→ PartnerEventsPage inside AppShell + partner guard (lazy)
 *   /admin/* (admin)         → Admin pages inside AppShell + admin guard (lazy)
 *   /403                     → ForbiddenPage inside AppShell
 *   /500                     → ErrorPage inside AppShell
 *   /404                     → NotFoundPage inside AppShell
 *   *                        → NotFoundPage inside AppShell (catch-all)
 */

import { isEventPaymentsEnabled } from '@config/featureFlags'
import { TermsGate } from "@components/auth/TermsGate"
import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { publicPages, publicPagePath } from '@/domain/public/public-content'
import { AppProviders } from './providers/AppProviders'
import { AppShell } from '@components/layout/AppShell'
import { RouteScroll } from '@components/layout/RouteScroll'
import { ToastContainer } from '@components/feedback/ToastContainer'
import { ConfirmDialog } from '@components/feedback/ConfirmDialog'
import { ProtectedRoute } from '@components/auth/ProtectedRoute'
import { PageLoader } from '@components/ui/PageLoader'
import { RouteErrorBoundary } from '@components/ui/RouteErrorBoundary'

/* ── Auth pages (no shell) — eagerly loaded (small) ──────────────── */
import { LoginPage } from '@pages/public/LoginPage'
import { RegisterPage } from '@pages/public/RegisterPage'
import { ForgotPasswordPage } from '@pages/public/ForgotPasswordPage'
import { ResetPasswordPage } from '@pages/public/ResetPasswordPage'
import { VerifyEmailPage } from '@pages/public/VerifyEmailPage'
import { UnsubscribePage } from '@pages/public/UnsubscribePage'
import { ConfirmEmailChangePage } from '@pages/public/ConfirmEmailChangePage'
import { RegistrationPendingPage } from '@pages/public/RegistrationPendingPage'
import { CompleteProfilePage } from '@pages/user/CompleteProfilePage'
import { useAuth } from '@hooks/useAuth'

/* ── Public pages (inside shell) — eagerly loaded (small) ────────── */
import { HomePage } from '@pages/public/HomePage'
import { AboutPage } from '@pages/public/AboutPage'
import { ContactPage } from '@pages/public/ContactPage'
import { ErrorPage } from '@pages/public/ErrorPage'
import { ForbiddenPage } from '@pages/public/ForbiddenPage'
import { NotFoundPage } from '@pages/public/NotFoundPage'
import { ServiceStatePage } from '@pages/public/ServiceStatePage'
import { PublicDocumentPage, LegalDocumentPage } from '@pages/public/PublicDocumentPage'
import { LegalCentrePage } from '@pages/public/LegalCentrePage'
import { CookieSettingsPage } from '@pages/public/CookieSettingsPage'

/* ── Lazy loaded page modules (code-split per route group) ────────── */

// Wine pages
const WineSearchPage = lazy(() => import('@pages/wines/WineSearchPage').then(m => ({ default: m.WineSearchPage })))
const WineDetailsPage = lazy(() => import('@pages/wines/WineDetailsPage').then(m => ({ default: m.WineDetailsPage })))
const WineComparePage = lazy(() => import('@pages/wines/WineComparePage').then(m => ({ default: m.WineComparePage })))
const WineScanPage = lazy(() => import('@pages/wines/WineScanPage').then(m => ({ default: m.WineScanPage })))
const AiProfilePage = lazy(() => import('@pages/wines/AiProfilePage').then(m => ({ default: m.AiProfilePage })))

// Event pages
const EventsNearbyPage = lazy(() => import('@pages/events/EventsNearbyPage').then(m => ({ default: m.EventsNearbyPage })))
const EventDetailsPage = lazy(() => import('@pages/events/EventDetailsPage').then(m => ({ default: m.EventDetailsPage })))

// Winery pages
const WineryDetailsPage = lazy(() => import('@pages/wineries/WineryDetailsPage').then(m => ({ default: m.WineryDetailsPage })))

// Wine Route pages
const WineRoutesPage = lazy(() => import('@pages/wine-routes/WineRoutesPage').then(m => ({ default: m.WineRoutesPage })))
const WineRouteDetailsPage = lazy(() => import('@pages/wine-routes/WineRouteDetailsPage').then(m => ({ default: m.WineRouteDetailsPage })))

// Protected pages
const MyCellarPage = lazy(() => import('@pages/cellar/MyCellarPage').then(m => ({ default: m.MyCellarPage })))
const CommunityPage = lazy(() => import('@pages/community/CommunityPage').then(m => ({ default: m.CommunityPage })))
const ReviewPublicationsPage = lazy(() => import("@pages/community/ReviewPublicationsPage").then(m => ({ default: m.ReviewPublicationsPage })))
const CommunityModerationPage = lazy(() => import('@pages/community/CommunityModerationPage').then(m => ({ default: m.CommunityModerationPage })))
const UserProfilePage = lazy(() => import('@pages/user/UserProfilePage').then(m => ({ default: m.UserProfilePage })))
const PointsPage = lazy(() => import('@pages/user/PointsPage').then(m => ({ default: m.PointsPage })))

// Partner pages
const PartnerEventsPage = lazy(() => import('@pages/partner/PartnerEventsPage').then(m => ({ default: m.PartnerEventsPage })))

// Admin pages
const AdminDashboardPage = lazy(() => import('@pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminWinesPage = lazy(() => import('@pages/admin/AdminWinesPage').then(m => ({ default: m.AdminWinesPage })))
const AdminWineAiProfilePage = lazy(() => import('@pages/admin/AdminWineAiProfilePage').then(m => ({ default: m.AdminWineAiProfilePage })))
const AdminWineriesPage = lazy(() => import('@pages/admin/AdminWineriesPage').then(m => ({ default: m.AdminWineriesPage })))
const AdminEventsPage = lazy(() => import('@pages/admin/AdminEventsPage').then(m => ({ default: m.AdminEventsPage })))
const AdminRoutesPage = lazy(() => import('@pages/admin/AdminRoutesPage').then(m => ({ default: m.AdminRoutesPage })))
const AdminUsersPage = lazy(() => import('@pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminNotificationsPage = lazy(() => import('@pages/admin/AdminNotificationsPage').then(m => ({ default: m.AdminNotificationsPage })))
const AdminAppVersionsPage = lazy(() => import('@pages/admin/AdminAppVersionsPage').then(m => ({ default: m.AdminAppVersionsPage })))
const AdminSocialPostsPage = lazy(() => import('@pages/admin/AdminSocialPostsPage').then(m => ({ default: m.AdminSocialPostsPage })))
const AdminReviewsPage = lazy(() => import('@pages/admin/AdminReviewsPage').then(m => ({ default: m.AdminReviewsPage })))
const AdminWineSubmissionsPage = lazy(() => import('@pages/admin/AdminWineSubmissionsPage').then(m => ({ default: m.AdminWineSubmissionsPage })))

import { ROLES } from '@config/roles'

/* ── Suspense fallback for lazy routes ────────────────────────────── */
function PageLoadingFallback() {
  return <PageLoader />
}

/* ─── Layout routes ─────────────────────────────────────────────── */

/** AppShell layout — renders the shell with an <Outlet /> for child routes */
function AppShellLayout() {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const { pathname, search, hash } = useLocation()
  const publicInformation = pathname === '/legal' || pathname === '/contact'
    || pathname.startsWith('/legal/')
    || publicPages.some(page => publicPagePath(page.slug) === pathname)

  if (!publicInformation && !isInitializing && isAuthenticated && user && !user.onboardingCompleted) {
    return <TermsGate><Navigate to={`/complete-profile?returnUrl=${encodeURIComponent(pathname + search + hash)}`} replace /></TermsGate>
  }

  return (
    <AppShell>
      <TermsGate exempt={publicInformation}><RouteErrorBoundary><Outlet /></RouteErrorBoundary></TermsGate>
    </AppShell>
  )
}

/** Auth guard layout — protects all child routes, renders children via <Outlet /> */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}

/** Admin guard layout — protects catalog and moderation routes (ADMIN or MODERATOR) */
function AdminLayout() {
  return (
    <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MODERATOR]}>
      <Outlet />
    </ProtectedRoute>
  )
}

/** Partner guard layout — protects partner routes (PARTNER or ADMIN roles required) */
function PartnerLayout() {
  return (
    <ProtectedRoute roles={[ROLES.PARTNER, ROLES.ADMIN]}>
      <Outlet />
    </ProtectedRoute>
  )
}

/** Admin-only guard layout — only ADMIN role allowed (e.g., user management) */
function AdminOnlyLayout() {
  return (
    <ProtectedRoute roles={[ROLES.ADMIN]}>
      <Outlet />
    </ProtectedRoute>
  )
}

const PaymentAccountPage = lazy(() => import('@pages/partner/PaymentAccountPage').then(module => ({ default: module.PaymentAccountPage })))

/* ─── Route tree ────────────────────────────────────────────────── */

function AppRoutes() {
  return (
    <Routes>
      <Route path="/payments/return" element={<PaymentReturnPage />} />
      {isEventPaymentsEnabled() && <Route path="/partner/payments" element={<Suspense fallback={<PageLoadingFallback />}><PaymentAccountPage /></Suspense>} />}
      {isEventPaymentsEnabled() && <Route path="/partner/payments/callback" element={<Suspense fallback={<PageLoadingFallback />}><PaymentAccountPage /></Suspense>} />}
      {/* ── Auth routes — no layout shell ─────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/success" element={<RegistrationPendingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
      <Route
        path="/complete-profile"
        element={<ProtectedRoute><TermsGate><CompleteProfilePage /></TermsGate></ProtectedRoute>}
      />

      {/* ── All routes inside AppShell layout ─────────────────────── */}
      <Route element={<AppShellLayout />}>
        {/* ── Public routes ───────────────────────────────────────── */}
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<PublicDocumentPage slug="help" />} />
        <Route path="cookies" element={<CookieSettingsPage />} />
        <Route path="legal" element={<LegalCentrePage />} />
        <Route path="legal/:slug" element={<LegalDocumentPage />} />
        <Route path="terms" element={<PublicDocumentPage slug="terms" />} />
        <Route path="privacy" element={<PublicDocumentPage slug="privacy" />} />
        <Route path="content-policy" element={<PublicDocumentPage slug="content-policy" />} />
        <Route path="legal/ranking" element={<PublicDocumentPage slug="ranking" />} />
        <Route path="403" element={<ForbiddenPage />} />
        <Route path="500" element={<ErrorPage />} />
        <Route path="503" element={<ServiceStatePage kind="unavailable" />} />
        <Route path="429" element={<ServiceStatePage kind="rateLimit" />} />
        <Route path="offline" element={<ServiceStatePage kind="offline" />} />
        <Route path="timeout" element={<ServiceStatePage kind="timeout" />} />

        <Route element={<ProtectedLayout />}>
        <Route path="my-tickets" element={<MyTicketsPage />} />
        <Route path="my-tickets/:id" element={<MyTicketDetailsPage />} />
        {/* ── Catalog routes — session required ──────────────────── */}
        <Route path="wines" element={<Suspense fallback={<PageLoadingFallback />}><WineSearchPage /></Suspense>} />
        <Route path="wines/:id" element={<Suspense fallback={<PageLoadingFallback />}><WineDetailsPage /></Suspense>} />

        {/* ── Event routes — session required (lazy) ──────────────── */}
        <Route path="events" element={<Suspense fallback={<PageLoadingFallback />}><EventsNearbyPage /></Suspense>} />
        <Route path="events/:id" element={<Suspense fallback={<PageLoadingFallback />}><EventDetailsPage /></Suspense>} />

        {/* ── Winery routes — session required (lazy) ─────────────── */}
        <Route path="wineries/:id" element={<Suspense fallback={<PageLoadingFallback />}><WineryDetailsPage /></Suspense>} />

        {/* ── Wine Route routes — session required (lazy) ─────────── */}
        <Route path="wine-routes" element={<Suspense fallback={<PageLoadingFallback />}><WineRoutesPage /></Suspense>} />
        <Route path="wine-routes/:id" element={<Suspense fallback={<PageLoadingFallback />}><WineRouteDetailsPage /></Suspense>} />

        {/* ── Protected routes — auth guard via layout route (lazy) ── */}
          <Route path="wines/compare/:wineAId?" element={<Suspense fallback={<PageLoadingFallback />}><WineComparePage /></Suspense>} />
          <Route path="wines/scan" element={<Suspense fallback={<PageLoadingFallback />}><WineScanPage /></Suspense>} />
          <Route path="wines/:id/ai-profile" element={<Suspense fallback={<PageLoadingFallback />}><AiProfilePage /></Suspense>} />
          <Route path="community" element={<Suspense fallback={<PageLoadingFallback />}><CommunityPage /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoadingFallback />}><UserProfilePage /></Suspense>} />
          <Route path="profile/points" element={<Suspense fallback={<PageLoadingFallback />}><PointsPage /></Suspense>} />
          <Route path="cellar" element={<Suspense fallback={<PageLoadingFallback />}><MyCellarPage /></Suspense>} />
        </Route>

        {/* ── Partner routes — role guard (PARTNER + ADMIN, lazy) ──── */}
        <Route element={<PartnerLayout />}>
          <Route path="partner/events" element={<Suspense fallback={<PageLoadingFallback />}><PartnerEventsPage /></Suspense>} />
        </Route>

        {/* ── Admin routes — role guard (ADMIN, lazy) ──── */}
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<Suspense fallback={<PageLoadingFallback />}><AdminDashboardPage /></Suspense>} />
          <Route path="admin/wines" element={<Suspense fallback={<PageLoadingFallback />}><AdminWinesPage /></Suspense>} />
          <Route path="admin/wines/:id/ai-profile" element={<Suspense fallback={<PageLoadingFallback />}><AdminWineAiProfilePage /></Suspense>} />
          <Route path="admin/wineries" element={<Suspense fallback={<PageLoadingFallback />}><AdminWineriesPage /></Suspense>} />
          <Route path="admin/events" element={<Suspense fallback={<PageLoadingFallback />}><AdminEventsPage /></Suspense>} />
          <Route path="admin/routes" element={<Suspense fallback={<PageLoadingFallback />}><AdminRoutesPage /></Suspense>} />
          <Route path="admin/wine-submissions" element={<Suspense fallback={<PageLoadingFallback />}><AdminWineSubmissionsPage /></Suspense>} />
          <Route path="admin/publications" element={<Suspense fallback={<PageLoadingFallback />}><ReviewPublicationsPage /></Suspense>} />
          <Route path="admin/community" element={<Suspense fallback={<PageLoadingFallback />}><CommunityModerationPage /></Suspense>} />
          <Route path="admin/reviews" element={<Suspense fallback={<PageLoadingFallback />}><AdminReviewsPage /></Suspense>} />
        </Route>

        {/* ── Admin-only routes — ADMIN role only (lazy) ──────────── */}
        <Route element={<AdminOnlyLayout />}>
          <Route path="admin/users" element={<Suspense fallback={<PageLoadingFallback />}><AdminUsersPage /></Suspense>} />
          <Route path="admin/notifications" element={<Suspense fallback={<PageLoadingFallback />}><AdminNotificationsPage /></Suspense>} />
          <Route path="admin/social-posts" element={<Suspense fallback={<PageLoadingFallback />}><AdminSocialPostsPage /></Suspense>} />
          <Route path="admin/app-versions" element={<Suspense fallback={<PageLoadingFallback />}><AdminAppVersionsPage /></Suspense>} />
        </Route>

        {/* ── Explicit 404 page (matches Vue /404 route) ──────────── */}
        <Route path="404" element={<NotFoundPage />} />

        {/* ── Catch-all 404 ───────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

/* ─── Root component ────────────────────────────────────────────── */

export function App() {
  return (
    <AppProviders>
      <RouteScroll />
      <AppRoutes />
      <ToastContainer />
      <ConfirmDialog />
    </AppProviders>
  )
}

export default App
