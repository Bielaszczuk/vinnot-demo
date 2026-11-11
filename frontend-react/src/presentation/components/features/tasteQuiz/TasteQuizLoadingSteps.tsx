/**
 * TasteQuizLoadingSteps — «Definiendo tu perfil de gustos»: the watercolor journey of the AI loading
 * scenes, told with scenes of its own. The options the member picked are drawn into a tasting journal, fill a
 * glass, blend on a palette and shape the taste wheel around a glass of red wine, which keeps taking shape
 * until the answers are saved.
 */
import { useMemo } from 'react'
import { BookOpen, Palette, PenTool, Wine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TasteQuizOptionKey } from '@domain/tasteQuiz/tasteQuiz.types'
import { quizArtUrl } from '@shared/profileArt'
import { AiProcessScene, type AiProcessStep } from '@components/features/wine/aiProcess/AiProcessScene'

/**
 * Each step plays its whole gesture at a calm pace and rests a moment on its final pose before the next one;
 * the wheel is reached after three steps and shaped within the minimum display time.
 */
export const TASTE_QUIZ_STEP_INTERVAL_MS = 3100
/** The journal step stays longer: the pen draws five sketches and writes a note beside each. */
export const TASTE_QUIZ_GATHER_STEP_MS = 4000

interface TasteQuizLoadingStepsProps {
  /** The options the member picked, in question order. */
  picks: readonly TasteQuizOptionKey[]
}

export function TasteQuizLoadingSteps({ picks }: TasteQuizLoadingStepsProps) {
  const { t } = useTranslation()
  const pickArt = useMemo(() => picks.flatMap((option) => quizArtUrl(option) ?? []), [picks])
  const steps: AiProcessStep[] = [
    { key: 'gather', label: t('tasteQuiz.loading.steps.gather'), icon: BookOpen, scene: 'gather', holdMs: TASTE_QUIZ_GATHER_STEP_MS },
    { key: 'fill', label: t('tasteQuiz.loading.steps.fill'), icon: Wine, scene: 'fill' },
    { key: 'blend', label: t('tasteQuiz.loading.steps.blend'), icon: Palette, scene: 'blend' },
    { key: 'paint', label: t('tasteQuiz.loading.steps.paint'), icon: PenTool, scene: 'paint' },
  ]
  return (
    <AiProcessScene
      eyebrow={t('tasteQuiz.loading.eyebrow')}
      title={t('tasteQuiz.loading.title')}
      subtitle={t('tasteQuiz.loading.subtitle')}
      steps={steps}
      stepIntervalMs={TASTE_QUIZ_STEP_INTERVAL_MS}
      picks={pickArt}
    />
  )
}
