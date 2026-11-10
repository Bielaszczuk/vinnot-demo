import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useAdminWineDetail } from '@hooks/queries/admin/useAdminWines'
import { useUpdateAdminWine } from '@hooks/queries/admin/useAdminWineMutations'
import { useAiProfile } from '@hooks/queries/wine/useAiProfile'
import { useRegenerateAiProfile } from '@hooks/queries/wine/useRegenerateAiProfile'
import { useAdminAiProfileMutation } from '@hooks/queries/admin/useAdminLookupMutations'
import type { AiWineProfile } from '@domain/wine/wine.types'

export function useAdminWineAiProfileViewModel() {
  const { t, i18n } = useTranslation()
  const { id: wineId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data: wine, isLoading: wineLoading } = useAdminWineDetail(wineId)
  const aiProfileQuery = useAiProfile(wineId, Boolean(wineId))
  const profileLoading = aiProfileQuery.isLoading
  const regenerateAiProfileMutation = useRegenerateAiProfile(wineId ?? '')
  const updateAiProfileMutation = useAdminAiProfileMutation()
  const updateWineMutation = useUpdateAdminWine()

  const [profile, setProfile] = useState<(AiWineProfile & { fromCache?: boolean }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [scores, setScores] = useState<import('./AdminWineAiProfileSections').AiProfileScores>({
    bodyScore: null,
    tanninScore: null,
    sweetnessScore: null,
    acidityScore: null,
  })
  const [editSummary, setEditSummary] = useState('')
  const [editVisual, setEditVisual] = useState({
    color: '',
    clarity: '',
    intensity: '',
    viscosity: '',
  })
  const [editAromatic, setEditAromatic] = useState({
    intensity: '',
    primaryAromas: [] as string[],
    secondaryAromas: [] as string[],
    bouquet: '',
  })
  const [editPalate, setEditPalate] = useState({
    sweetness: '',
    acidity: '',
    tannin: '',
    alcohol: '',
    body: '',
    texture: '',
    balance: '',
  })
  const [editFlavor, setEditFlavor] = useState({
    primaryFlavors: [] as string[],
    secondaryFlavors: [] as string[],
    intensity: '',
    finish: '',
  })
  const [editFoodPairings, setEditFoodPairings] = useState({
    pairings: [] as string[],
    explanation: '',
  })
  const [editServing, setEditServing] = useState({
    temperature: '',
    glassware: '',
    decanting: '',
    agingPotential: '',
  })
  const [editOccasions, setEditOccasions] = useState<string[]>([])
  const [editSimilarWines, setEditSimilarWines] = useState<string[]>([])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!aiProfileQuery.data) {
        setProfile(null)
        return
      }
      const profileData = aiProfileQuery.data
      setProfile(profileData)
      const palate = profileData.palateAnalysis as Record<string, unknown> | undefined
      setScores({
        bodyScore: (palate?.bodyScore as number) ?? wine?.bodyScore ?? null,
        tanninScore: (palate?.tanninScore as number) ?? wine?.tanninScore ?? null,
        sweetnessScore: (palate?.sweetnessScore as number) ?? wine?.sweetnessScore ?? null,
        acidityScore: (palate?.acidityScore as number) ?? wine?.acidityScore ?? null,
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [aiProfileQuery.data, wine?.acidityScore, wine?.bodyScore, wine?.sweetnessScore, wine?.tanninScore])

  const initEditFields = useCallback(() => {
    if (!profile) return
    setEditSummary(profile.summary || '')
    setEditVisual({
      ...(profile.visualAnalysis || {
        color: '',
        clarity: '',
        intensity: '',
        viscosity: '',
      }),
    })
    const aromatic = profile.aromaticProfile
    setEditAromatic({
      intensity: aromatic?.intensity || '',
      primaryAromas: [...(aromatic?.primaryAromas || [])],
      secondaryAromas: [...(aromatic?.secondaryAromas || [])],
      bouquet: aromatic?.bouquet || '',
    })
    const palate = profile.palateAnalysis
    setEditPalate({
      sweetness: palate?.sweetness || '',
      acidity: palate?.acidity || '',
      tannin: palate?.tannin || '',
      alcohol: palate?.alcohol || '',
      body: palate?.body || '',
      texture: palate?.texture || '',
      balance: palate?.balance || '',
    })
    const flavor = profile.flavorProfile
    setEditFlavor({
      primaryFlavors: [...(flavor?.primaryFlavors || [])],
      secondaryFlavors: [...(flavor?.secondaryFlavors || [])],
      intensity: flavor?.intensity || '',
      finish: flavor?.finish || '',
    })
    setEditFoodPairings({
      pairings: [...(profile.foodPairings?.pairings || [])],
      explanation: profile.foodPairings?.explanation || '',
    })
    setEditServing({
      ...(profile.servingRecommendations || {
        temperature: '',
        glassware: '',
        decanting: '',
        agingPotential: '',
      }),
    })
    setEditOccasions([...(profile.idealOccasions || [])])
    setEditSimilarWines([...(profile.similarWines || [])])
  }, [profile])

  const toggleEditMode = useCallback(() => {
    if (!editMode) initEditFields()
    setEditMode(!editMode)
  }, [editMode, initEditFields])

  const saveScores = useCallback(async () => {
    if (!wineId) return
    setSaving(true)
    try {
      await updateWineMutation.mutateAsync({
        id: wineId,
        payload: {
          acidityScore: scores.acidityScore,
          tanninScore: scores.tanninScore,
          bodyScore: scores.bodyScore,
          sweetnessScore: scores.sweetnessScore,
        },
      })
      addToast({ type: 'success', message: t('admin.aiProfile.scoresSaved') })
    } catch {
      addToast({ type: 'error', message: t('admin.aiProfile.scoresError') })
    }
    setSaving(false)
  }, [addToast, scores, t, updateWineMutation, wineId])

  const saveProfileEdits = useCallback(async () => {
    if (!wineId) return
    setSavingProfile(true)
    try {
      const profileJson: Record<string, unknown> = {
        summary: editSummary,
        visualAnalysis: { ...editVisual },
        aromaticProfile: {
          intensity: editAromatic.intensity,
          primaryAromas: editAromatic.primaryAromas,
          secondaryAromas: editAromatic.secondaryAromas,
          bouquet: editAromatic.bouquet,
        },
        palateAnalysis: {
          sweetness: editPalate.sweetness,
          sweetnessScore: scores.sweetnessScore,
          acidity: editPalate.acidity,
          acidityScore: scores.acidityScore,
          tannin: editPalate.tannin,
          tanninScore: scores.tanninScore,
          alcohol: editPalate.alcohol,
          body: editPalate.body,
          bodyScore: scores.bodyScore,
          texture: editPalate.texture,
          balance: editPalate.balance,
        },
        flavorProfile: {
          primaryFlavors: editFlavor.primaryFlavors,
          secondaryFlavors: editFlavor.secondaryFlavors,
          intensity: editFlavor.intensity,
          finish: editFlavor.finish,
        },
        foodPairings: {
          pairings: editFoodPairings.pairings,
          explanation: editFoodPairings.explanation,
        },
        servingRecommendations: { ...editServing },
        idealOccasions: editOccasions,
        similarWines: editSimilarWines,
      }
      await updateAiProfileMutation.mutateAsync({ wineId, profileJson, language: i18n.resolvedLanguage ?? i18n.language })
      await aiProfileQuery.refetch()
      setEditMode(false)
      addToast({ type: 'success', message: t('admin.aiProfile.profileUpdated') })
    } catch {
      addToast({ type: 'error', message: t('admin.aiProfile.profileUpdateError') })
    }
    setSavingProfile(false)
  }, [
    i18n.language,
    i18n.resolvedLanguage,
    addToast,
    aiProfileQuery,
    editAromatic,
    editFlavor,
    editFoodPairings,
    editOccasions,
    editPalate,
    editServing,
    editSimilarWines,
    editSummary,
    editVisual,
    scores,
    t,
    updateAiProfileMutation,
    wineId,
  ])

  const regenerateProfile = useCallback(async () => {
    if (!wineId) return
    setShowRegenerateConfirm(false)
    setRegenerating(true)
    try {
      const newProfile = await regenerateAiProfileMutation.mutateAsync()
      setProfile(newProfile)
      const palate = newProfile.palateAnalysis as Record<string, unknown> | undefined
      if (palate) {
        setScores({
          bodyScore: (palate.bodyScore as number) ?? scores.bodyScore,
          tanninScore: (palate.tanninScore as number) ?? scores.tanninScore,
          sweetnessScore: (palate.sweetnessScore as number) ?? scores.sweetnessScore,
          acidityScore: (palate.acidityScore as number) ?? scores.acidityScore,
        })
      }
      setEditMode(false)
      addToast({ type: 'success', message: t('admin.aiProfile.regenerateSuccess') })
    } catch {
      addToast({ type: 'error', message: t('admin.aiProfile.regenerateError') })
    }
    setRegenerating(false)
  }, [addToast, regenerateAiProfileMutation, scores, t, wineId])

  const loading = wineLoading || aiProfileQuery.isLoading
  const profileError = aiProfileQuery.isError ? t('admin.aiProfile.loadError') : null
  const sliderStyle = useCallback(
    (value: number, start: string, end: string) => ({
      background: `linear-gradient(90deg, ${start} 0%, ${end} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
    }),
    [],
  )
  const goToAdminWines = useCallback(() => {
    navigate('/admin/wines')
  }, [navigate])

  return {
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
  }
}
