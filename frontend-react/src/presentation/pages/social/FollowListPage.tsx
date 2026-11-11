import { ArrowLeft } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { SocialUserRow } from '@components/features/social/SocialUserRow'
import type { FollowListKind } from '@hooks/queries/social/useSocialQueries'
import { useFollowListViewModel } from './useFollowListViewModel'

/** FollowListPage — the followers or the people a user follows, each with a follow button. */
export function FollowListPage({ kind }: { kind: FollowListKind }) {
  const vm = useFollowListViewModel(kind)
  const { t, list } = vm

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <LinkButton to={`/users/${vm.userId}`} variant="ghost" size="sm" leftIcon={<Icon icon={ArrowLeft} size="sm" />}>
        {t('social.backToProfile')}
      </LinkButton>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{vm.title}</h1>
      {vm.isLoading ? (
        <PageLoader compact />
      ) : vm.isError ? (
        <p className="text-sm text-gray-500">{t('social.loadError')}</p>
      ) : !list || list.items.length === 0 ? (
        <EmptyState illustration="community" title={vm.emptyText} />
      ) : (
        <>
          <ul className="space-y-2">
            {list.items.map((row) => (
              <SocialUserRow
                key={row.id}
                user={row}
                showFollow={row.id !== vm.viewerId}
                pending={vm.isPending(row.id)}
                onToggleFollow={vm.toggleFollow}
              />
            ))}
          </ul>
          <Pagination page={vm.page} totalPages={list.totalPages} onPageChange={vm.setPage} />
        </>
      )}
    </div>
  )
}
