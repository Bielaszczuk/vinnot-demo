import { Wine } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { TagEditor } from './AdminWineAiProfileSections'

interface AdminWineAiSummarySectionProps {
  t: TFunction
  editMode: boolean
  summary: string
  editSummary: string
  onEditSummary: (value: string) => void
}

export function AdminWineAiSummarySection({
  t,
  editMode,
  summary,
  editSummary,
  onEditSummary,
}: AdminWineAiSummarySectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.summary')}</h2>
      {editMode ? (
        <textarea
          value={editSummary}
          onChange={(event) => onEditSummary(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-[15px] leading-relaxed focus:bg-white focus:ring-2 focus:ring-purple-500/20"
        />
      ) : (
        <p className="text-[15px] leading-relaxed text-gray-600">{summary}</p>
      )}
    </div>
  )
}

interface AdminWineAiTagSectionsProps {
  t: TFunction
  profile: AiWineProfile
  editMode: boolean
  editOccasions: string[]
  setEditOccasions: Dispatch<SetStateAction<string[]>>
  editSimilarWines: string[]
  setEditSimilarWines: Dispatch<SetStateAction<string[]>>
}

export function AdminWineAiTagSections({
  t,
  profile,
  editMode,
  editOccasions,
  setEditOccasions,
  editSimilarWines,
  setEditSimilarWines,
}: AdminWineAiTagSectionsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {((profile.idealOccasions && profile.idealOccasions.length > 0) || editMode) && (
        <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.idealOccasions')}</h3>
          {editMode ? (
            <TagEditor
              items={editOccasions}
              onAdd={(value) => setEditOccasions([...editOccasions, value])}
              onRemove={(index) => {
                const nextOccasions = [...editOccasions]
                nextOccasions.splice(index, 1)
                setEditOccasions(nextOccasions)
              }}
              placeholder={t('admin.aiProfile.addOccasionPlaceholder')}
              colorClass="bg-amber-50 text-amber-700 ring-1 ring-amber-100"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.idealOccasions?.map((occasion) => (
                <span key={occasion} className="inline-flex items-center rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  {occasion}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {((profile.similarWines && profile.similarWines.length > 0) || editMode) && (
        <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.similarWines')}</h3>
          {editMode ? (
            <TagEditor
              items={editSimilarWines}
              onAdd={(value) => setEditSimilarWines([...editSimilarWines, value])}
              onRemove={(index) => {
                const nextSimilarWines = [...editSimilarWines]
                nextSimilarWines.splice(index, 1)
                setEditSimilarWines(nextSimilarWines)
              }}
              placeholder={t('admin.aiProfile.addSimilarWinePlaceholder')}
              colorClass="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.similarWines?.map((wine) => (
                <span key={wine} className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                  <Wine className="inline-block h-4 w-4 shrink-0 align-text-bottom" aria-hidden="true" /> {wine}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
