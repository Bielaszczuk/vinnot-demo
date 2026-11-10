import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usersService } from '@services/users.service'
import { useAuthStore } from '@stores/auth.store'

/**
 * Keeps the account language and time zone in step with the interface.
 * Runs after every login or restored session, whenever the language changes, and
 * when the page becomes visible again with a different browser time zone.
 * The sync is fire-and-forget: a failure never blocks signing in or switching language.
 */
export function useAccountLocaleSync(): void {
  const userId = useAuthStore((state) => (state.accessToken ? state.user?.id ?? null : null))
  const { i18n } = useTranslation()
  const language = i18n.language
  const lastSynced = useRef<string | null>(null)
  const [resumeCount, setResumeCount] = useState(0)

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'hidden') setResumeCount((count) => count + 1)
    }
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      lastSynced.current = null
      return
    }
    const key = `${userId}|${language}|${usersService.deviceTimezone() ?? ''}`
    if (lastSynced.current === key) return
    lastSynced.current = key
    usersService.syncAccountLocale(language).catch(() => {
      // Best effort: the next login, language switch or time zone change retries.
    })
  }, [userId, language, resumeCount])
}
