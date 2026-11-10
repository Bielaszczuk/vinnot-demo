import { Zap } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { AdminWine } from '@domain/admin/admin.types'
import { Spinner } from '@components/ui/Spinner'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'

export type AiProfileScores = {
  bodyScore: number | null
  tanninScore: number | null
  sweetnessScore: number | null
  acidityScore: number | null
}

export function TagEditor({
  items,
  onAdd,
  onRemove,
  placeholder,
  colorClass,
}: {
  items: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  placeholder: string
  colorClass: string
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const add = () => {
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${colorClass}`}>
            {item}
            <button type="button" onClick={() => onRemove(index)} aria-label={`${t('common.remove')}: ${item}`} className="hover:opacity-75">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
        />
        <button type="button" onClick={add} aria-label={t('common.add')} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">
          +
        </button>
      </div>
    </div>
  )
}

interface AdminWineAiHeroProps {
  t: TFunction
  wine: AdminWine
  hasProfile: boolean
  editMode: boolean
  regenerating: boolean
  onToggleEditMode: () => void
  onRequestRegenerate: () => void
}

export function AdminWineAiHero({
  t,
  wine,
  hasProfile,
  editMode,
  regenerating,
  onToggleEditMode,
  onRequestRegenerate,
}: AdminWineAiHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 shadow-lg">
      <div className="relative flex flex-col items-center gap-6 p-6 md:flex-row md:p-8">
        <div className="flex h-24 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm md:h-28 md:w-24">
          {wine.imageUrl ? (
            <img src={wine.imageUrl} alt={wine.name} className="h-full w-full object-cover" />
          ) : (
            <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center md:text-left">
          <div className="mb-2 flex items-center justify-center gap-2 md:justify-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">{t('admin.aiProfile.sectionTitle')}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-2xs text-purple-300">{t('admin.aiProfile.adminBadge')}</span>
          </div>
          <h1 className="truncate text-xl font-semibold leading-tight text-white md:text-2xl">{wine.name}</h1>
          <p className="mt-1 text-sm text-purple-200">
            {wine.wineryName} · {wine.vintage || t('admin.aiProfile.nonVintage')} · {wine.region}, {wine.country}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {hasProfile && (
            <button
              onClick={onToggleEditMode}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all ${editMode ? 'bg-white/25 ring-1 ring-white/40' : 'bg-white/15 hover:bg-white/25'}`}
            >
              {editMode ? t('admin.aiProfile.cancelEdit') : t('admin.aiProfile.editTexts')}
            </button>
          )}
          <button onClick={onRequestRegenerate} disabled={regenerating} className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25">
            {regenerating ? <Spinner size="sm" /> : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            {regenerating ? t('admin.aiProfile.regenerating') : hasProfile ? t('admin.aiProfile.regenerate') : t('admin.aiProfile.generate')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminWineAiEditSaveBar({ t, savingProfile, onSave }: { t: TFunction; savingProfile: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">{t('admin.aiProfile.editModeActive')}</p>
      <button onClick={onSave} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
        {savingProfile && <Spinner size="sm" />}
        {t('admin.aiProfile.saveAllProfile')}
      </button>
    </div>
  )
}

interface AdminWineAiTasteSlidersProps {
  t: TFunction
  scores: AiProfileScores
  setScores: (scores: AiProfileScores) => void
  saving: boolean
  sliderStyle: (value: number, start: string, end: string) => CSSProperties
  onSaveScores: () => void
}

export function AdminWineAiTasteSliders({
  t,
  scores,
  setScores,
  saving,
  sliderStyle,
  onSaveScores,
}: AdminWineAiTasteSlidersProps) {
  const scoreItems = [
    { key: 'bodyScore' as const, label: t('admin.aiProfile.body'), low: t('wineDetails.bodyLight'), high: t('wineDetails.bodyFull'), start: '#fcd34d', end: '#f59e0b' },
    { key: 'tanninScore' as const, label: t('admin.aiProfile.tannins'), low: t('wineDetails.tanninsSmooth'), high: t('wineDetails.tanninsFirm'), start: '#f4a9ba', end: '#cb2d5d' },
    { key: 'sweetnessScore' as const, label: t('admin.aiProfile.sweetness'), low: t('wineDetails.sweetnessDry'), high: t('wineDetails.sweetnessSweet'), start: '#f9a8d4', end: '#ec4899' },
    { key: 'acidityScore' as const, label: t('admin.aiProfile.acidity'), low: t('wineDetails.acidityLow'), high: t('wineDetails.acidityHigh'), start: '#bef264', end: '#84cc16' },
  ]

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">{t('admin.aiProfile.tasteProfile')}</h2>
        <button onClick={onSaveScores} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
          {saving && <Spinner size="sm" />}
          {t('admin.aiProfile.saveScores')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
        {scoreItems.map((item) => (
          <div key={item.key}>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">{item.label}</label>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums">{scores[item.key] ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 text-2xs text-gray-400">{item.low}</span>
              <input
                value={scores[item.key] ?? 50}
                onChange={(event) => setScores({ ...scores, [item.key]: Number(event.target.value) })}
                type="range"
                min={0}
                max={100}
                className="vinnot-range h-2.5 flex-1 cursor-pointer appearance-none rounded-full"
                style={sliderStyle(scores[item.key] ?? 50, item.start, item.end)}
              />
              <span className="w-12 text-right text-2xs text-gray-400">{item.high}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminWineAiNoProfileState({
  t,
  regenerating,
  onGenerate,
}: {
  t: TFunction
  regenerating: boolean
  onGenerate: () => void
}) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white px-6 py-12 text-center shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('admin.aiProfile.noProfile')}</h3>
      <p className="mb-6 text-sm text-gray-500">{t('admin.aiProfile.generateFirst')}</p>
      <button onClick={onGenerate} disabled={regenerating} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
        {regenerating ? <Spinner size="sm" /> : <Zap className="h-4 w-4" aria-hidden="true" />} {regenerating ? t('admin.aiProfile.generating') : t('admin.aiProfile.generate')}
      </button>
    </div>
  )
}

export function AdminWineAiBottomSaveBar({
  t,
  savingProfile,
  onCancel,
  onSave,
}: {
  t: TFunction
  savingProfile: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
      <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">{t('common.cancel')}</button>
      <button onClick={onSave} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50">
        {savingProfile && <Spinner size="sm" />}
        {t('admin.aiProfile.saveAllProfile')}
      </button>
    </div>
  )
}

export function AdminWineAiRegenerateModal({
  t,
  onCancel,
  onConfirm,
}: {
  t: TFunction
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  return (
    <AdminFormDialog open onClose={onCancel} labelledBy={titleId} panelClassName="space-y-4 p-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
        <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <h3 id={titleId} className="text-center font-semibold text-gray-900">{t('admin.aiProfile.regenerate')}</h3>
      <p className="text-center text-sm text-gray-500">{t('admin.aiProfile.regenerateConfirm')}</p>
      <div className="flex justify-center gap-3 pt-2">
        <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">{t('common.cancel')}</button>
        <button onClick={onConfirm} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">{t('admin.aiProfile.regenerate')}</button>
      </div>
    </AdminFormDialog>
  )
}
