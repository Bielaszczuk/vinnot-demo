import { Eye, Scale } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { Wine } from '@domain/wine/wine.types'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'

interface AiProfileActionBarProps {
  t: TFunction
  id: string | undefined
  wine: Wine | undefined
}

export function AiProfileActionBar({ t, id, wine }: AiProfileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-5xl px-4 pb-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/90 px-4 py-3 shadow-lg shadow-wine-950/10 backdrop-blur-lg sm:px-6">
          <p className="hidden text-sm text-gray-500 sm:block">
            <span className="font-medium text-ink">{wine?.name}</span> · {t('aiProfile.title')}
          </p>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LinkButton to={`/wines/${id}`} variant="outline" size="sm" leftIcon={<Icon icon={Eye} />}>
              {t('aiProfile.viewWineDetails')}
            </LinkButton>
            <LinkButton
              to={`/wines/compare/${id}`}
              state={{ fromWineId: id, fromPath: `/wines/${id}` }}
              size="sm"
              leftIcon={<Icon icon={Scale} />}
            >
              {t('aiProfile.compareThisWine')}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}
