import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminService } from '@services/admin.service'

/** Owns the private preview lifetime; a previous selection can never publish into this one. */
export function useAdminSubmissionImage(id: string | undefined, available: boolean) {
  const [attempt, setAttempt] = useState(0)
  const request = useMemo(() => ({ id, available, attempt }), [id, available, attempt])
  const [result, setResult] = useState<{ request: typeof request; url?: string; failed: boolean }>()

  useEffect(() => {
    if (!request.id || !request.available) return
    let active = true
    let url: string | undefined
    void adminService.getWineSubmissionImage(request.id).then((blob) => {
      if (!active) return
      url = URL.createObjectURL(blob)
      setResult({ request, url, failed: false })
    }).catch(() => {
      if (active) setResult({ request, failed: true })
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [request])

  const current = result?.request === request ? result : undefined
  return {
    url: current?.failed ? undefined : current?.url,
    isLoading: !!id && available && !current,
    isError: current?.failed ?? false,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
    onImageError: useCallback(() => setResult((currentResult) =>
      currentResult?.request === request ? { request, failed: true } : currentResult), [request]),
  }
}
