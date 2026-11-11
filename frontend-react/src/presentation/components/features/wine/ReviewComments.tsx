import { PublicationStatus } from "../community/PublicationStatus";
import { CommunityActions } from '../community/CommunityActions'
/**
 * ReviewComments - threaded comments for a wine review
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useConfirm } from '@hooks/useConfirm'
import { useCreateReviewComment } from '@hooks/queries/wine/useCreateReviewComment'
import { useDeleteReviewComment } from '@hooks/queries/wine/useDeleteReviewComment'
import { useReviewComments } from '@hooks/queries/wine/useReviewComments'
import { ROLES } from '@config/roles'
import { Trash2, UserRound } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { fieldClassName } from '@components/ui/fieldStyles'
import { formatDate } from '@utils/date'
import { UserBadge } from '../points/UserBadge'
import { UserHandle } from '../social/UserHandle'

function DefaultAvatarIcon() {
  return <Icon icon={UserRound} className="text-gray-400" />
}

export interface ReviewCommentsProps {
  wineId: string
  reviewId: string
  onCommentsCountChanged?: (count: number) => void
}

export function ReviewComments({ wineId, reviewId, onCommentsCountChanged }: ReviewCommentsProps) {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, hasAnyRole } = useAuth()
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const [newComment, setNewComment] = useState('')

  const { data: comments = [], isLoading } = useReviewComments(wineId, reviewId)
  const createComment = useCreateReviewComment()
  const deleteComment = useDeleteReviewComment()
  const lastReportedCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (!onCommentsCountChanged) return
    if (lastReportedCountRef.current === comments.length) return
    lastReportedCountRef.current = comments.length
    onCommentsCountChanged?.(comments.length)
  }, [comments.length, onCommentsCountChanged])

  const isModerator = hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR])

  const locale = useMemo(() => i18n.language || undefined, [i18n.language])

  const submitComment = async () => {
    const content = newComment.trim()
    if (!isAuthenticated || !content) return

    try {
      await createComment.mutateAsync({ wineId, reviewId, content })
      setNewComment('')
      addToast({ type: 'success', message: t('community.commentPublished') })
    } catch (error) {
      console.error('Error submitting comment:', error)
      addToast({ type: 'error', message: t('reviews.comments.errorPost') })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await confirm({
      title: t('reviews.comments.deleteConfirmTitle'),
      message: t('reviews.comments.deleteConfirmMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await deleteComment.mutateAsync({ wineId, reviewId, commentId })
    } catch (error) {
      console.error('Error deleting comment:', error)
      addToast({ type: 'error', message: t('reviews.comments.errorDelete') })
    }
  }

  const canDeleteComment = (commentUserId: string | undefined): boolean => {
    if (!user) return false
    if (commentUserId && commentUserId === user.id) return true
    return isModerator
  }

  return (
    <div className="mt-3 space-y-3">
      {isLoading && (
        <div role="status" className="py-2 text-xs text-gray-500">{t('reviews.comments.loading')}</div>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-2.5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                <ImageWithFallback
                  src={comment.reviewer?.avatarUrl ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                  fallbackElement={<DefaultAvatarIcon />}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="rounded-xl bg-surface-cream px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                          {comment.reviewer?.displayName || t('reviews.user')}
                          <UserBadge tier={comment.reviewer?.badgeTier} size={16} />
                        </span>
                        <span className="text-2xs text-gray-500">
                          {formatDate(comment.createdAt, { year: 'numeric', month: 'short', day: 'numeric' }, locale)}
                        </span>
                      </div>
                      <UserHandle username={comment.reviewer?.username} className="text-2xs" />
                    </div>
                    <CommunityActions
                      variant="menu"
                      targetType="COMMENT"
                      targetId={comment.id}
                      authorId={comment.reviewer?.id}
                    />
                  </div>
                  <p className="mt-0.5 break-words text-sm text-gray-700">{comment.content}</p>
                </div>

                <PublicationStatus status={comment.publicationStatus} />
                {canDeleteComment(comment.reviewer?.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 mt-0.5 min-h-8 px-2 text-xs text-gray-500 hover:bg-danger-soft hover:text-danger"
                    leftIcon={<Icon icon={Trash2} size="xs" />}
                    onClick={() => {
                      void handleDeleteComment(comment.id)
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="py-1 text-xs text-gray-500">{t('reviews.comments.empty')}</p>
      )}
      {isAuthenticated ? (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            <ImageWithFallback
              src={user?.avatar ?? undefined}
              alt=""
              className="h-full w-full object-cover"
              fallbackElement={<DefaultAvatarIcon />}
            />
          </div>

          <div className="flex flex-1 gap-2">
            <input
              type="text"
              maxLength={2000}
              value={newComment}
              placeholder={t('reviews.comments.placeholder')}
              onChange={(event) => setNewComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitComment()
                }
              }}
              disabled={createComment.isPending}
              aria-label={t('reviews.comments.placeholder')}
              className={fieldClassName({ size: 'sm', className: 'flex-1' })}
            />

            <Button
              size="sm"
              disabled={!newComment.trim()}
              isLoading={createComment.isPending}
              onClick={() => {
                void submitComment()
              }}
            >
              {t('reviews.comments.send')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs italic text-gray-500">{t('reviews.comments.loginToComment')}</p>
      )}
    </div>
  )
}
