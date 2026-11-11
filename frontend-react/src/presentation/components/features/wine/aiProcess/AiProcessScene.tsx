/**
 * AiProcessScene — the watercolor journey shown while the AI writes a wine
 * profile or a comparison, or the taste quiz builds the member's profile. One scene per step, inside a ring that fills as
 * the steps advance, with the step list below. The steps advance on a timer
 * and the last one stays (and replays its gesture) until the answer arrives.
 */

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { AiProcessSceneArt } from './AiProcessSceneArt'
import { wineSceneLooks, type AiProcessSceneName, type ScenePicks, type WineSceneLooks } from './aiProcessScenes'
import './aiProcessScene.css'

export interface AiProcessStep {
  key: string
  label: string
  icon: LucideIcon
  scene: AiProcessSceneName
  /** Time this step stays on screen when its gesture needs longer than `stepIntervalMs`. */
  holdMs?: number
}

interface AiProcessSceneProps {
  eyebrow: string
  title: string
  subtitle: string
  steps: AiProcessStep[]
  /** Time each step stays on screen before the next one starts. */
  stepIntervalMs: number
  /** How the scenes draw the wines; a red wine when not given. */
  looks?: WineSceneLooks
  /** The illustrations of the taste quiz options the member picked, for the quiz scenes. */
  picks?: ScenePicks
}

const RING_SIZE = 176
const RING_STROKE = 4
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const DEFAULT_LOOKS = wineSceneLooks()
const pad = (value: number) => String(value).padStart(2, '0')

/** The step on screen: each one stays for its own hold, and the last one stays until the scene goes away. */
function useProgressiveStep(steps: readonly AiProcessStep[], intervalMs: number): number {
  const [step, setStep] = useState(0)
  const holds = steps.slice(0, -1).map((item) => item.holdMs ?? intervalMs).join(',')
  useEffect(() => {
    let at = 0
    const timers = holds
      .split(',')
      .filter(Boolean)
      .map((hold, index) => {
        at += Number(hold)
        return window.setTimeout(() => setStep(index + 1), at)
      })
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [holds])
  return step
}

export function AiProcessScene({ eyebrow, title, subtitle, steps, stepIntervalMs, looks = DEFAULT_LOOKS, picks }: AiProcessSceneProps) {
  const reducedMotion = useReducedMotion()
  const activeStep = useProgressiveStep(steps, stepIntervalMs)
  const current = steps[activeStep]!
  const completed = (activeStep + 1) / steps.length
  const waiting = activeStep >= steps.length - 1

  return (
    <div className="flex justify-center px-4 py-10 sm:py-14">
      <section
        role="progressbar"
        aria-label={`${title}. ${current.label}`}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={activeStep + 1}
        aria-valuetext={`${pad(activeStep + 1)} / ${pad(steps.length)} · ${current.label}`}
        className="w-full max-w-md overflow-hidden rounded-3xl sm:max-w-lg border border-border bg-surface px-5 py-7 shadow-xl shadow-wine-950/5 sm:px-8 sm:py-9"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-wine-100 bg-wine-50 px-3 py-1.5 text-2xs font-semibold text-wine-800">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-wine-700" />
            {eyebrow}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted">{subtitle}</p>
        </div>

        <div aria-hidden="true" className="relative mx-auto my-7 flex items-center justify-center sm:my-14 sm:scale-[1.35]" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0 -rotate-90">
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-wine-100" />
            <circle
              data-testid="ai-process-ring"
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - completed)}
              className="vinnot-ai-ring stroke-wine-700"
            />
          </svg>
          <div className="relative flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full border border-border bg-surface-cream shadow-[0_8px_18px_-6px_rgb(68_11_30/0.12)]">
            <div key={current.scene} className="vinnot-ai-scene-in">
              <AiProcessSceneArt scene={current.scene} looks={looks} picks={picks} waiting={waiting} reducedMotion={reducedMotion} />
            </div>
          </div>
        </div>

        <p className="flex min-h-11 items-center gap-2.5 rounded-2xl border border-wine-100 bg-wine-50 px-3.5 py-2 text-sm font-semibold text-ink">
          <span className="text-2xs font-semibold tabular-nums text-wine-700">
            {pad(activeStep + 1)} / {pad(steps.length)}
          </span>
          <span className="flex-1">{current.label}</span>
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-wine-700 border-t-transparent motion-reduce:animate-none" />
        </p>

        <ol className="mt-4 space-y-1.5">
          {steps.map((step, index) => {
            const complete = index < activeStep
            const active = index === activeStep
            return (
              <li
                key={step.key}
                className={`flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-colors duration-300 ${
                  active ? 'bg-surface-cream font-medium text-ink' : complete ? 'text-wine-800' : 'text-gray-500'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    complete ? 'border-wine-700 bg-wine-700 text-white' : active ? 'border-wine-200 bg-white text-wine-700' : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  <Icon icon={complete ? Check : step.icon} size="xs" />
                </span>
                <span className="flex-1">{step.label}</span>
                <span aria-hidden="true" className={`text-2xs tabular-nums ${active ? 'text-wine-700' : 'text-gray-500'}`}>
                  {pad(index + 1)}
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
