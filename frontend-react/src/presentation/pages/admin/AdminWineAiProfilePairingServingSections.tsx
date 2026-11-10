import { Check } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { TagEditor } from './AdminWineAiProfileSections'

type FoodPairingsEdit = {
  pairings: string[]
  explanation: string
}

type ServingEdit = {
  temperature: string
  glassware: string
  decanting: string
  agingPotential: string
}

interface AdminWineAiPairingServingSectionsProps {
  t: TFunction
  profile: AiWineProfile
  editMode: boolean
  editFoodPairings: FoodPairingsEdit
  setEditFoodPairings: Dispatch<SetStateAction<FoodPairingsEdit>>
  editServing: ServingEdit
  setEditServing: Dispatch<SetStateAction<ServingEdit>>
}

export function AdminWineAiPairingServingSections({
  t,
  profile,
  editMode,
  editFoodPairings,
  setEditFoodPairings,
  editServing,
  setEditServing,
}: AdminWineAiPairingServingSectionsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {(profile.foodPairings || editMode) && (
        <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.foodPairings')}</h3>
          {editMode ? (
            <div className="space-y-3">
              <TagEditor
                items={editFoodPairings.pairings}
                onAdd={(value) => setEditFoodPairings({ ...editFoodPairings, pairings: [...editFoodPairings.pairings, value] })}
                onRemove={(index) => {
                  const nextPairings = [...editFoodPairings.pairings]
                  nextPairings.splice(index, 1)
                  setEditFoodPairings({ ...editFoodPairings, pairings: nextPairings })
                }}
                placeholder={t('admin.aiProfile.addPairingPlaceholder')}
                colorClass="bg-green-50 text-green-700 ring-1 ring-green-100"
              />
              <div>
                <label className="text-2xs font-semibold uppercase text-gray-400">{t('admin.aiProfile.fields.explanation')}</label>
                <textarea
                  value={editFoodPairings.explanation}
                  onChange={(event) => setEditFoodPairings({ ...editFoodPairings, explanation: event.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.foodPairings?.pairings?.map((pairing) => (
                  <span key={pairing} className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 ring-1 ring-green-100">
                    <Check className="inline-block h-4 w-4 shrink-0 align-text-bottom" aria-hidden="true" /> {pairing}
                  </span>
                ))}
              </div>
              {profile.foodPairings?.explanation && <p className="text-sm leading-relaxed text-gray-500">{profile.foodPairings.explanation}</p>}
            </div>
          )}
        </div>
      )}
      {(profile.servingRecommendations || editMode) && (
        <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.servingRecommendations')}</h3>
          {editMode ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'temperature' as const, label: t('admin.aiProfile.fields.temperature') },
                { key: 'glassware' as const, label: t('admin.aiProfile.fields.glassware') },
                { key: 'decanting' as const, label: t('admin.aiProfile.fields.decanting') },
                { key: 'agingPotential' as const, label: t('admin.aiProfile.fields.agingPotential') },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-2xs font-semibold uppercase text-gray-400">{field.label}</label>
                  <input
                    value={editServing[field.key]}
                    onChange={(event) => setEditServing({ ...editServing, [field.key]: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ServingValue label={t('admin.aiProfile.fields.temperature')} value={profile.servingRecommendations?.temperature} />
              <ServingValue label={t('admin.aiProfile.fields.glassware')} value={profile.servingRecommendations?.glassware} />
              <ServingValue label={t('admin.aiProfile.fields.decanting')} value={profile.servingRecommendations?.decanting} />
              <ServingValue label={t('admin.aiProfile.fields.agingPotential')} value={profile.servingRecommendations?.agingPotential} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ServingValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-gray-50/80 p-3">
      <span className="text-2xs font-semibold uppercase text-gray-400">{label}</span>
      <p className="mt-0.5 text-xs font-medium text-gray-800">{value}</p>
    </div>
  )
}
