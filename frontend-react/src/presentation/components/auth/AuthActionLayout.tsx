import { VinnotBrand } from '@components/brand/VinnotBrand'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthActionLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthActionLayout({ title, description, children }: AuthActionLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-wine-950/5 sm:p-8">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <VinnotBrand className="text-wine-700" />
        </Link>
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        </header>
        {children}
      </section>
    </main>
  )
}

interface AuthActionMessageProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string | null
}

export function AuthActionMessage({ status, message }: AuthActionMessageProps) {
  if (!message) return null
  const tone = status === 'success'
    ? 'border-success/25 bg-success-soft text-success'
    : status === 'error'
      ? 'border-danger/25 bg-danger-soft text-danger'
      : 'border-border bg-surface-cream text-muted'
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-5 ${tone}`} role="status">{message}</div>
}
