import { useEffect, useRef } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { quizArtUrl } from '@shared/profileArt'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { TasteQuizLoadingSteps } from '@components/features/tasteQuiz/TasteQuizLoadingSteps'
import { TasteQuizOptionCard } from '@components/features/tasteQuiz/TasteQuizOptionCard'
import { useTasteQuizViewModel, type TasteQuizViewModel } from './useTasteQuizViewModel'

/**
 * TasteQuizPage — /taste-quiz
 *
 * Five illustrated questions, one at a time, that seed the member's taste profile. Each answer is an
 * illustrated card; Skip is always there. After the last answer the profile animation plays while the
 * answers are saved, then the member's own profile opens. Behavior lives in the view model.
 */
export function TasteQuizPage() {
  const vm = useTasteQuizViewModel()
  if (vm.phase === 'saving') return <TasteQuizLoadingSteps picks={vm.picks} />
  if (vm.phase === 'error') return <SaveError vm={vm} />
  return <QuestionStep vm={vm} />
}

function QuestionStep({ vm }: { vm: TasteQuizViewModel }) {
  const { t, question, step, total } = vm
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstStep = useRef(true)

  // Moving between questions announces the new one; the first question keeps the page's natural focus.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const twoOptions = question.options.length === 2
  return (
    <section aria-labelledby="taste-quiz-question" className="mx-auto flex w-full max-w-3xl flex-col px-1 py-4 sm:py-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={vm.back} leftIcon={<Icon icon={ArrowLeft} size="sm" />}>
              {t('tasteQuiz.back')}
            </Button>
          )}
        </div>
        <ProgressDots step={step} total={total} />
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={vm.skip} disabled={vm.skipping} className="text-gray-600">
            {t('tasteQuiz.skip')}
          </Button>
        </div>
      </div>

      <header key={question.key} className="profile-art-appear mt-8 text-center sm:mt-10">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-wine-700">{t('tasteQuiz.eyebrow')}</p>
        <p className="mt-2 text-xs font-medium tabular-nums text-gray-500">{t('tasteQuiz.progress', { current: step + 1, total })}</p>
        <h1
          id="taste-quiz-question"
          ref={headingRef}
          tabIndex={-1}
          className="mx-auto mt-3 max-w-xl text-3xl font-semibold tracking-tight text-ink outline-none sm:text-4xl"
        >
          {t(`tasteQuiz.questions.${question.key}`)}
        </h1>
        <p className="mt-3 text-sm text-gray-500">{t('tasteQuiz.hint')}</p>
      </header>

      <ul key={`${question.key}-options`} className={`mx-auto mt-8 grid w-full grid-cols-2 gap-4 sm:mt-10 sm:gap-6 ${twoOptions ? 'max-w-2xl' : 'max-w-lg'}`}>
        {question.options.map((option) => (
          <li key={option}>
            <TasteQuizOptionCard
              label={t(`tasteQuiz.options.${option}`)}
              artUrl={quizArtUrl(option)}
              selected={vm.selected === option}
              onSelect={() => vm.select(option)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One dot per question; the current one stretches. The text above carries the position for screen readers. */
function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <ol aria-hidden="true" className="flex items-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
            index === step ? 'w-6 bg-wine-700' : index < step ? 'w-2 bg-wine-400' : 'w-2 bg-gray-300'
          }`}
        />
      ))}
    </ol>
  )
}

function SaveError({ vm }: { vm: TasteQuizViewModel }) {
  const { t } = vm
  return (
    <section role="alert" className="mx-auto mt-10 max-w-md rounded-3xl bg-gradient-to-b from-surface-cream to-white px-6 py-10 text-center ring-1 ring-wine-100/70 sm:mt-16">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('tasteQuiz.error.title')}</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{t('tasteQuiz.error.description')}</p>
      <div className="mt-7 flex flex-col items-center gap-3">
        <Button onClick={vm.retry} leftIcon={<Icon icon={RotateCcw} size="sm" />}>{t('tasteQuiz.error.retry')}</Button>
        <Button variant="ghost" size="sm" onClick={vm.skip} disabled={vm.skipping}>{t('tasteQuiz.error.later')}</Button>
      </div>
    </section>
  )
}
