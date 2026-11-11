import { describe, expect, it } from 'vitest'
import { completeTasteQuizAnswers, mapTasteQuiz } from './tasteQuiz.mappers'
import { TASTE_QUIZ_QUESTIONS } from './tasteQuiz.types'

const answers = {
  RAINY_DAY: 'DARK_CHOCOLATE_COFFEE',
  FRUIT: 'DARK_BERRIES',
  DESSERT: 'BROWNIE',
  DINNER: 'GRILLED_RED_MEAT',
  AROMA: 'VANILLA_TOAST',
} as const

describe('taste quiz questions', () => {
  it('asks the five questions in their fixed order, two options for the rainy day and four for the rest', () => {
    expect(TASTE_QUIZ_QUESTIONS.map((question) => question.key)).toEqual(['RAINY_DAY', 'FRUIT', 'DESSERT', 'DINNER', 'AROMA'])
    expect(TASTE_QUIZ_QUESTIONS.map((question) => question.options.length)).toEqual([2, 4, 4, 4, 4])
    expect(TASTE_QUIZ_QUESTIONS[0].options).toEqual(['DARK_CHOCOLATE_COFFEE', 'SPICED_TEA_APPLE_TART'])
    expect(TASTE_QUIZ_QUESTIONS[4].options).toEqual(['VANILLA_TOAST', 'PEPPER_CINNAMON', 'ROSES_VIOLETS', 'CUT_GRASS'])
  })
})

describe('mapTasteQuiz', () => {
  it('maps a completed quiz with its answers', () => {
    expect(mapTasteQuiz({ status: 'COMPLETED', answers: { ...answers }, shouldPrompt: false })).toEqual({
      status: 'COMPLETED',
      answers,
      shouldPrompt: false,
    })
  })

  it('maps a pending quiz that should be offered', () => {
    expect(mapTasteQuiz({ status: 'PENDING', answers: null, shouldPrompt: true })).toEqual({ status: 'PENDING', answers: null, shouldPrompt: true })
  })

  it('never carries answers unless the quiz is completed', () => {
    expect(mapTasteQuiz({ status: 'SKIPPED', answers: { ...answers }, shouldPrompt: false }).answers).toBeNull()
  })

  it('reads an unknown status as pending and a missing prompt flag as false', () => {
    expect(mapTasteQuiz({ status: 'LATER' as never, answers: null } as never)).toEqual({ status: 'PENDING', answers: null, shouldPrompt: false })
  })

  it('drops completed answers that are incomplete or unknown to this version', () => {
    expect(mapTasteQuiz({ status: 'COMPLETED', answers: { ...answers, FRUIT: 'DURIAN' }, shouldPrompt: false }).answers).toBeNull()
    expect(mapTasteQuiz({ status: 'COMPLETED', answers: null, shouldPrompt: false }).answers).toBeNull()
  })
})

describe('completeTasteQuizAnswers', () => {
  it('returns the five answers once every question has a valid option', () => {
    expect(completeTasteQuizAnswers({ ...answers })).toEqual(answers)
  })

  it('returns null while a question is unanswered or an option belongs to another question', () => {
    expect(completeTasteQuizAnswers({ RAINY_DAY: 'DARK_CHOCOLATE_COFFEE' })).toBeNull()
    expect(completeTasteQuizAnswers({ ...answers, DESSERT: 'CITRUS' })).toBeNull()
  })
})
