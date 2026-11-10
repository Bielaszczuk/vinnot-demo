import { useTranslation } from 'react-i18next'
/**
 * AdminWineAiProfilePage — Full-page AI wine profile editor
 *
 * Migrated from Vue: frontend/src/pages/admin/AdminWineAiProfilePage.vue
 * Architecture: page → hooks → service → client → http
 *
 * Features:
 * - View and edit ALL AI-generated wine analysis fields
 * - Edit taste profile scores with interactive sliders
 * - Edit text fields inline (summary, visual, aromatic, palate, flavor, pairings, serving)
 * - Regenerate AI profile
 * - Save scores via admin PATCH endpoint
 * - Save full profile edits via PATCH ai-profile endpoint
 */

import { Navigate, useParams } from 'react-router-dom'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { Spinner } from '@components/ui/Spinner'
import { useAdminWineAiProfileViewModel } from './useAdminWineAiProfileViewModel'
import {
  AdminWineAiBottomSaveBar,
  AdminWineAiEditSaveBar,
  AdminWineAiHero,
  AdminWineAiNoProfileState,
  AdminWineAiRegenerateModal,
  AdminWineAiTasteSliders,
  TagEditor,
} from './AdminWineAiProfileSections'
import {
  AdminWineAiSummarySection,
  AdminWineAiTagSections,
} from './AdminWineAiProfileContentSections'
import { AdminWineAiPairingServingSections } from './AdminWineAiProfilePairingServingSections'
import { WineColorSwatch } from '@/presentation/components/ui/WineColorSwatch'

function resolveBarScore(score: number | null | undefined, text: string | null | undefined): number {
  if (score != null && typeof score === 'number') return Math.max(0, Math.min(100, score))
  if (!text) return 50
  const lower = text.toLowerCase()
  if (/muy alt[ao]|very high|intens[ao]|bold|full|firm/i.test(lower)) return 85
  if (/alt[ao]|high|marked|rich/i.test(lower)) return 75
  if (/medi[ao]|moderate|medium|balanced/i.test(lower)) return 55
  if (/baj[ao]|low|light|soft|smooth/i.test(lower)) return 30
  if (/muy baj[ao]|very low|delicate/i.test(lower)) return 15
  return 50
}

export function AdminWineAiProfilePage() {
  const { i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  return <AdminWineAiProfileContent key={`${id}:${i18n.resolvedLanguage ?? i18n.language}`} />
}

function AdminWineAiProfileContent() {
  const {
    t,
    wineId,
    wine,
    profile,
    loading,
    profileLoading,
    profileError,
    saving,
    savingProfile,
    regenerating,
    showRegenerateConfirm,
    setShowRegenerateConfirm,
    editMode,
    setEditMode,
    toggleEditMode,
    scores,
    setScores,
    editSummary,
    setEditSummary,
    editVisual,
    setEditVisual,
    editAromatic,
    setEditAromatic,
    editPalate,
    setEditPalate,
    editFlavor,
    setEditFlavor,
    editFoodPairings,
    setEditFoodPairings,
    editServing,
    setEditServing,
    editOccasions,
    setEditOccasions,
    editSimilarWines,
    setEditSimilarWines,
    saveScores,
    saveProfileEdits,
    regenerateProfile,
    sliderStyle,
    goToAdminWines,
  } = useAdminWineAiProfileViewModel()

  if (!wineId) return <Navigate to="/admin/wines" replace />

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AdminBackLink to="/admin/wines" label={t('admin.aiProfile.backToWines')} />

      {loading ? <div className="flex items-center justify-center py-20"><Spinner /></div> : profileError ? (
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm text-center py-16 px-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('common.error')}</h2>
          <p className="text-sm text-gray-500 mb-6">{profileError}</p>
          <button onClick={goToAdminWines} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">{t('common.back')}</button>
        </div>
      ) : wine ? (
        <>
          <AdminWineAiHero
            t={t}
            wine={wine}
            hasProfile={Boolean(profile)}
            editMode={editMode}
            regenerating={regenerating}
            onToggleEditMode={toggleEditMode}
            onRequestRegenerate={() => setShowRegenerateConfirm(true)}
          />

          {editMode && (
            <AdminWineAiEditSaveBar t={t} savingProfile={savingProfile} onSave={saveProfileEdits} />
          )}

          <AdminWineAiTasteSliders
            t={t}
            scores={scores}
            setScores={setScores}
            saving={saving}
            sliderStyle={sliderStyle}
            onSaveScores={saveScores}
          />

          {!profile && !profileLoading && (
            <AdminWineAiNoProfileState t={t} regenerating={regenerating} onGenerate={regenerateProfile} />
          )}

          {/* AI Profile Content */}
          {profile && (
            <>
              <AdminWineAiSummarySection
                t={t}
                editMode={editMode}
                summary={profile.summary}
                editSummary={editSummary}
                onEditSummary={setEditSummary}
              />

              {/* Visual + Aromatic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(profile.visualAnalysis || editMode) && (
                  <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">{t('admin.aiProfile.visualAnalysis')}</h3>
                    {editMode ? (
                      <div className="space-y-3">
                        {(['color', 'clarity', 'intensity', 'viscosity'] as const).map((field) => (
                          <div key={field}><label className="text-2xs font-semibold text-gray-400 uppercase">{t(`admin.aiProfile.fields.${field}`)}</label><input value={editVisual[field]} onChange={(e) => setEditVisual({ ...editVisual, [field]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.color')}</span><WineColorSwatch tone={profile.visualColorTone} rim={profile.visualRimTone} intensity={profile.visualColorIntensity} reflections={profile.visualReflectionTones} highlights={profile.visualHighlights} label={profile.visualAnalysis?.color ?? ''} /><p className="text-sm text-gray-800 font-medium">{profile.visualAnalysis?.color}</p></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.clarity')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.visualAnalysis?.clarity}</p></div>
                          <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.intensity')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.visualAnalysis?.intensity}</p></div>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.viscosity')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.visualAnalysis?.viscosity}</p></div>
                      </div>
                    )}
                  </div>
                )}
                {(profile.aromaticProfile || editMode) && (
                  <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">{t('admin.aiProfile.aromaticProfile')}</h3>
                    {editMode ? (
                      <div className="space-y-3">
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.intensity')}</label><input value={editAromatic.intensity} onChange={(e) => setEditAromatic({ ...editAromatic, intensity: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.primaryAromas')}</label><TagEditor items={editAromatic.primaryAromas} onAdd={(v) => setEditAromatic({ ...editAromatic, primaryAromas: [...editAromatic.primaryAromas, v] })} onRemove={(i) => { const a = [...editAromatic.primaryAromas]; a.splice(i, 1); setEditAromatic({ ...editAromatic, primaryAromas: a }) }} placeholder={t('admin.aiProfile.addAromaPlaceholder')} colorClass="bg-violet-50 text-violet-700 ring-1 ring-violet-100" /></div>
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.secondaryAromas')}</label><TagEditor items={editAromatic.secondaryAromas} onAdd={(v) => setEditAromatic({ ...editAromatic, secondaryAromas: [...editAromatic.secondaryAromas, v] })} onRemove={(i) => { const a = [...editAromatic.secondaryAromas]; a.splice(i, 1); setEditAromatic({ ...editAromatic, secondaryAromas: a }) }} placeholder={t('admin.aiProfile.addAromaPlaceholder')} colorClass="bg-amber-50 text-amber-700 ring-1 ring-amber-100" /></div>
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.bouquet')}</label><textarea value={editAromatic.bouquet} onChange={(e) => setEditAromatic({ ...editAromatic, bouquet: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.intensity')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.aromaticProfile?.intensity}</p></div>
                        <div><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.primaryAromas')}</span><div className="flex flex-wrap gap-1.5 mt-2">{profile.aromaticProfile?.primaryAromas?.map((a) => <span key={a} className="inline-flex items-center px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium ring-1 ring-violet-100">{a}</span>)}</div></div>
                        {profile.aromaticProfile?.secondaryAromas && profile.aromaticProfile.secondaryAromas.length > 0 && <div><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.secondaryAromas')}</span><div className="flex flex-wrap gap-1.5 mt-2">{profile.aromaticProfile.secondaryAromas.map((a) => <span key={a} className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium ring-1 ring-amber-100">{a}</span>)}</div></div>}
                        <div className="pt-2 border-t border-gray-100"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.bouquet')}</span><p className="text-sm text-gray-600 leading-relaxed mt-1">{profile.aromaticProfile?.bouquet}</p></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Palate Analysis */}
              {(profile.palateAnalysis || editMode) && (
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 md:p-8">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">{t('admin.aiProfile.palateAnalysis')}</h3>
                  {editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[{ key: 'sweetness', label: t('admin.aiProfile.sweetness') }, { key: 'acidity', label: t('admin.aiProfile.acidity') }, { key: 'tannin', label: t('admin.aiProfile.tannins') }, { key: 'body', label: t('admin.aiProfile.body') }, { key: 'alcohol', label: t('wineDetails.alcohol') }, { key: 'texture', label: t('aiProfile.palate.texture') }, { key: 'balance', label: t('aiProfile.palate.balance') }].map((f) => (
                        <div key={f.key}><label className="text-2xs font-semibold text-gray-400 uppercase">{f.label}</label><input value={editPalate[f.key as keyof typeof editPalate]} onChange={(e) => setEditPalate({ ...editPalate, [f.key]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-6">
                        {[{ key: 'sweetness', scoreKey: 'sweetnessScore', label: t('admin.aiProfile.sweetness'), color: 'pink' }, { key: 'acidity', scoreKey: 'acidityScore', label: t('admin.aiProfile.acidity'), color: 'lime' }, { key: 'tannin', scoreKey: 'tanninScore', label: t('admin.aiProfile.tannins'), color: 'purple' }, { key: 'body', scoreKey: 'bodyScore', label: t('admin.aiProfile.body'), color: 'amber' }].map((item) => {
                          const pa = profile.palateAnalysis as Record<string, unknown> | undefined
                          const textVal = pa?.[item.key] as string | undefined
                          const scoreVal = pa?.[item.scoreKey] as number | undefined
                          if (!textVal && scoreVal == null) return null
                          const barVal = resolveBarScore(scoreVal, textVal)
                          return (
                            <div key={item.key}>
                              <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold text-gray-700">{item.label}</span><span className="text-2xs text-gray-400">{textVal || `${barVal}%`}</span></div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r from-${item.color}-300 to-${item.color}-500 rounded-full transition-all duration-700`} style={{ width: `${Math.max(barVal, 3)}%` }} /></div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                        {profile.palateAnalysis?.alcohol && <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('wineDetails.alcohol')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.palateAnalysis.alcohol}</p></div>}
                        {profile.palateAnalysis?.texture && <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.palate.texture')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.palateAnalysis.texture}</p></div>}
                        {profile.palateAnalysis?.balance && <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.palate.balance')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.palateAnalysis.balance}</p></div>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Flavor Profile */}
              {(profile.flavorProfile || editMode) && (
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 md:p-8">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">{t('admin.aiProfile.flavorProfile')}</h3>
                  {editMode ? (
                    <div className="space-y-4">
                      <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.primaryFlavors')}</label><TagEditor items={editFlavor.primaryFlavors} onAdd={(v) => setEditFlavor({ ...editFlavor, primaryFlavors: [...editFlavor.primaryFlavors, v] })} onRemove={(i) => { const a = [...editFlavor.primaryFlavors]; a.splice(i, 1); setEditFlavor({ ...editFlavor, primaryFlavors: a }) }} placeholder={t('admin.aiProfile.addFlavorPlaceholder')} colorClass="bg-rose-50 text-rose-700 ring-1 ring-rose-100" /></div>
                      <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.secondaryFlavors')}</label><TagEditor items={editFlavor.secondaryFlavors} onAdd={(v) => setEditFlavor({ ...editFlavor, secondaryFlavors: [...editFlavor.secondaryFlavors, v] })} onRemove={(i) => { const a = [...editFlavor.secondaryFlavors]; a.splice(i, 1); setEditFlavor({ ...editFlavor, secondaryFlavors: a }) }} placeholder={t('admin.aiProfile.addFlavorPlaceholder')} colorClass="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.intensity')}</label><input value={editFlavor.intensity} onChange={(e) => setEditFlavor({ ...editFlavor, intensity: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                        <div><label className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.finish')}</label><input value={editFlavor.finish} onChange={(e) => setEditFlavor({ ...editFlavor, finish: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50/50 mt-1" /></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div><span className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.primaryFlavors')}</span><div className="flex flex-wrap gap-1.5 mt-2">{profile.flavorProfile?.primaryFlavors?.map((f) => <span key={f} className="inline-flex items-center px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium ring-1 ring-rose-100">{f}</span>)}</div></div>
                        {profile.flavorProfile?.secondaryFlavors && profile.flavorProfile.secondaryFlavors.length > 0 && <div><span className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.secondaryFlavors')}</span><div className="flex flex-wrap gap-1.5 mt-2">{profile.flavorProfile.secondaryFlavors.map((f) => <span key={f} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium ring-1 ring-emerald-100">{f}</span>)}</div></div>}
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('admin.aiProfile.fields.intensity')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.flavorProfile?.intensity}</p></div>
                        <div className="bg-gray-50/80 rounded-xl p-3"><span className="text-2xs font-semibold text-gray-400 uppercase">{t('aiProfile.flavor.finish')}</span><p className="text-sm text-gray-800 font-medium mt-0.5">{profile.flavorProfile?.finish}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <AdminWineAiPairingServingSections
                t={t}
                profile={profile}
                editMode={editMode}
                editFoodPairings={editFoodPairings}
                setEditFoodPairings={setEditFoodPairings}
                editServing={editServing}
                setEditServing={setEditServing}
              />

              <AdminWineAiTagSections
                t={t}
                profile={profile}
                editMode={editMode}
                editOccasions={editOccasions}
                setEditOccasions={setEditOccasions}
                editSimilarWines={editSimilarWines}
                setEditSimilarWines={setEditSimilarWines}
              />

              {editMode && (
                <AdminWineAiBottomSaveBar
                  t={t}
                  savingProfile={savingProfile}
                  onCancel={() => setEditMode(false)}
                  onSave={saveProfileEdits}
                />
              )}
            </>
          )}
        </>
      ) : null}

      {showRegenerateConfirm && (
        <AdminWineAiRegenerateModal
          t={t}
          onCancel={() => setShowRegenerateConfirm(false)}
          onConfirm={regenerateProfile}
        />
      )}
    </div>
  )
}

export default AdminWineAiProfilePage
