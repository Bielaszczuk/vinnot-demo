/**
 * The approval queue (#489): one row per post with its slot, pillar and wine day; the selected one is highlighted.
 * Each row previews the hook of the UI language, or the other language's while that one is pending (#497).
 */
import { useTranslation } from 'react-i18next'
import { queueCopy, type SocialPost } from '@domain/admin/socialPost'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { Spinner } from '@components/ui/Spinner'
import { PillarChip, StatusBadge, WineDayChip } from './SocialPostChips'

interface SocialPostQueueProps {
  posts: SocialPost[]
  selectedId?: string
  loading: boolean
  failed: boolean
  page: number
  totalPages: number
  totalItems: number
  formatDate: (iso: string) => string
  onSelect: (id: string) => void
  onPageChange: (page: number) => void
  onRetry: () => unknown
}

export function SocialPostQueue({
  posts, selectedId, loading, failed, page, totalPages, totalItems, formatDate, onSelect, onPageChange, onRetry,
}: SocialPostQueueProps) {
  const { t, i18n } = useTranslation()
  const uiLanguage = i18n.resolvedLanguage ?? i18n.language
  if (failed) return <AdminQueryError retry={onRetry} />
  if (loading) return <div className="p-12 text-center"><Spinner /></div>
  if (posts.length === 0) return <div className="p-10 text-center text-sm text-gray-500">{t('admin.socialPosts.queue.empty')}</div>
  return (
    <div>
      <ul className="divide-y divide-gray-100" aria-label={t('admin.socialPosts.queue.heading')}>
        {posts.map((post) => {
          const selected = post.id === selectedId
          const preview = queueCopy(post, uiLanguage)
          return (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => onSelect(post.id)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-wine-50/40 ${selected ? 'bg-wine-50' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatDate(post.scheduledFor)}</span>
                  <StatusBadge status={post.status} />
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {post.pillar && <PillarChip pillar={post.pillar} />}
                  {post.wineDay && <WineDayChip wineDay={post.wineDay} />}
                </span>
                {preview && <span className="line-clamp-1 text-xs text-gray-600">{preview.hook}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={onPageChange} label={t('admin.socialPosts.queue.items')} />
    </div>
  )
}
