/**
 * AppShell — main layout shell
 *
 * Warm cream canvas (`bg-canvas`), full width for the home page and a
 * contained max-w-7xl column for other pages. No permanent desktop sidebar.
 * It owns the page's only <main> landmark.
 */

import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppFooter } from './AppFooter'
import { PointsCelebrationHost } from '../features/points/PointsCelebrationHost'

interface AppShellProps {
  children: ReactNode
}

const fullWidthPages = ['/', '/home']

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const isFullWidth = fullWidthPages.includes(location.pathname)

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AppHeader />

      <div className="flex flex-1">
        {/* Mobile Sidebar */}
        <AppSidebar />

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {isFullWidth ? (
            <div className="py-4 sm:py-6">
              {children}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
              {children}
            </div>
          )}
        </main>
      </div>

      <AppFooter />
      {/* Tier-up reveal and the one-time welcome card, for signed-in users. */}
      <PointsCelebrationHost />
    </div>
  )
}
