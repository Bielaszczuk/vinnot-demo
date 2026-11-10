import { useCallback, useState } from 'react'
import { useAnnouncementDetail, useAnnouncementHistory } from '@hooks/queries/admin/useAdminNotifications'
import type { AnnouncementRecord } from '@domain/admin/announcement'

/**
 * History of the admin notifications section (#310) with the results of one send (#490): the listed record shows
 * at once, and its latest counts replace it when they arrive.
 */
export function useAdminNotificationsHistoryViewModel() {
  const history = useAnnouncementHistory()
  const [opened, setOpened] = useState<AnnouncementRecord | null>(null)
  const detail = useAnnouncementDetail(opened?.id ?? null)
  const notFound = detail.data === null

  const open = useCallback((record: AnnouncementRecord) => setOpened(record), [])
  const close = useCallback(() => setOpened(null), [])

  return {
    history,
    selected: opened && (detail.data ?? opened),
    detail: { loading: detail.isFetching, failed: detail.isError, notFound },
    open,
    close,
    retryDetail: () => void detail.refetch(),
  }
}
