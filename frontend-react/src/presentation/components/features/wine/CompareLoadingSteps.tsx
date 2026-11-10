/**
 * CompareLoadingSteps — the watercolor journey while the AI compares two
 * wines: open, pour both, weigh the structure, look closely and write.
 * A step stays 2.2 s, so the journey covers the usual 8–11 s answer.
 */
import { Grape, PenLine, Scale, Search, Wine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AiProcessScene, type AiProcessStep } from './aiProcess/AiProcessScene'
import { wineSceneLooks } from './aiProcess/aiProcessScenes'

export const COMPARE_STEP_INTERVAL_MS = 2200

interface CompareLoadingStepsProps {
  firstType?: string | null
  secondType?: string | null
}

export function CompareLoadingSteps({ firstType, secondType }: CompareLoadingStepsProps = {}) {
  const { t } = useTranslation()
  const steps: AiProcessStep[] = [
    { key: 'opening', label: t('compare.steps.opening'), icon: Wine, scene: 'uncork' },
    { key: 'visual', label: t('compare.steps.visual'), icon: Grape, scene: 'compare' },
    { key: 'structure', label: t('compare.steps.structure'), icon: Scale, scene: 'structure' },
    { key: 'flavor', label: t('compare.steps.flavor'), icon: Search, scene: 'contrast' },
    { key: 'writing', label: t('compare.steps.writing'), icon: PenLine, scene: 'recommendation' },
  ]
  return (
    <AiProcessScene
      eyebrow={t('compare.loading.eyebrow')}
      title={t('compare.loading.title')}
      subtitle={t('compare.loading.subtitle')}
      steps={steps}
      stepIntervalMs={COMPARE_STEP_INTERVAL_MS}
      looks={wineSceneLooks(firstType, secondType ?? firstType)}
    />
  )
}
