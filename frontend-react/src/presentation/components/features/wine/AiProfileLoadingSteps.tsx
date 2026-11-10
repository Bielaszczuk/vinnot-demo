/**
 * AiProfileLoadingSteps — the watercolor journey while the AI writes a wine
 * profile: uncork, pour, bouquet, taste and the written report.
 */
import { Eye, Flower2, Grape, PenLine, Wine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AiProcessScene, type AiProcessStep } from './aiProcess/AiProcessScene'
import { wineSceneLooks } from './aiProcess/aiProcessScenes'

/** A profile step stays 1.8 s, so five steps match the usual answer time. */
export const AI_PROFILE_STEP_INTERVAL_MS = 1800

export function AiProfileLoadingSteps({ wineType }: { wineType?: string | null }) {
  const { t } = useTranslation()
  const steps: AiProcessStep[] = [
    { key: 'uncorking', label: t('aiProfile.steps.uncorking'), icon: Wine, scene: 'uncork' },
    { key: 'visual', label: t('aiProfile.steps.visual'), icon: Eye, scene: 'visual' },
    { key: 'bouquet', label: t('aiProfile.steps.bouquet'), icon: Flower2, scene: 'bouquet' },
    { key: 'tasting', label: t('aiProfile.steps.tasting'), icon: Grape, scene: 'taste' },
    { key: 'generating', label: t('aiProfile.steps.generating'), icon: PenLine, scene: 'report' },
  ]
  return (
    <AiProcessScene
      eyebrow={t('aiProfile.journey.eyebrow')}
      title={t('aiProfile.journey.title')}
      subtitle={t('aiProfile.journey.subtitle')}
      steps={steps}
      stepIntervalMs={AI_PROFILE_STEP_INTERVAL_MS}
      looks={wineSceneLooks(wineType)}
    />
  )
}
