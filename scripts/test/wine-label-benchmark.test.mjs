import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateStability,
  classifyScan,
  evaluateAcceptance,
  sampleImage,
  summarize,
  validateDataset,
} from '../lib/wine-label-benchmark.mjs'

test('known catalog cases keep strict ID classification', () => {
  const sample = {
    expectedOutcome: 'KNOWN_CATALOG',
    expectedWineId: 'expected',
  }
  assert.deepEqual(classifyScan(sample, {
    outcome: 'POSSIBLE_MATCHES',
    suggestions: [{ id: 'other' }, { id: 'expected' }],
  }), {
    classification: 'SUGGESTED',
    suggestionIds: ['other', 'expected'],
  })
})

test('negative controls fail only when promoted to exact', () => {
  const sample = { expectedOutcome: 'NOT_IN_CATALOG' }
  assert.equal(classifyScan(sample, {
    outcome: 'POSSIBLE_MATCHES', suggestions: [{ id: 'candidate' }],
  }).classification, 'SAFE_REJECTION')
  assert.equal(classifyScan(sample, {
    outcome: 'EXACT_MATCH', suggestions: [],
  }).classification, 'FALSE_EXACT')
})

test('summary reports precision recall and negative safety independently', () => {
  const summary = summarize([
    result('known-1', 'KNOWN_CATALOG', 'EXACT', 'EXACT_MATCH'),
    result('known-2', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'),
    result('negative-1', 'NOT_WINE', 'SAFE_REJECTION', 'NO_MATCH'),
  ])
  assert.equal(summary.exactPrecision, 1)
  assert.equal(summary.topThreeRecall, 1)
  assert.equal(summary.rejectionQuality, 1)
  assert.equal(summary.falseExactRate, 0)
})

test('top-one recall and wrong exacts are distinct from top-three and absent controls', () => {
  const summary = summarize([
    { ...result('first', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'), expectedWineId: 'a', suggestionIds: ['a'] },
    { ...result('third', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'), expectedWineId: 'b', suggestionIds: ['x', 'b'] },
    result('wrong', 'KNOWN_CATALOG', 'MISS', 'EXACT_MATCH'),
    result('negative', 'NOT_WINE', 'FALSE_EXACT', 'EXACT_MATCH'),
  ])
  assert.equal(summary.topOneRecall, 0.3333)
  assert.equal(summary.topThreeRecall, 0.6667)
  assert.equal(summary.wrongKnownExacts, 1)
  assert.equal(summary.totalFalseExacts, 2)
  assert.equal(summary.falseExactRate, 1)
})

test('negative transport errors stay separate from false exact decisions', () => {
  const summary = summarize([
    result('negative-safe', 'NOT_WINE', 'SAFE_REJECTION', 'NO_MATCH'),
    result('negative-error', 'NOT_WINE', 'ERROR', undefined),
  ])
  assert.equal(summary.rejectionQuality, 1)
  assert.equal(summary.falseExactRate, 0)
  assert.equal(summary.errorRate, 0.5)
})

test('stability detects changing outcomes for the same label', () => {
  const stability = calculateStability([
    result('stable', 'KNOWN_CATALOG', 'EXACT', 'EXACT_MATCH', 'wine-1'),
    result('stable', 'KNOWN_CATALOG', 'EXACT', 'EXACT_MATCH', 'wine-1'),
    result('unstable', 'KNOWN_CATALOG', 'EXACT', 'EXACT_MATCH', 'wine-2'),
    result('unstable', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'),
  ])
  assert.equal(stability.rate, 0.5)
  assert.deepEqual(stability.unstable.map((sample) => sample.caseId), ['unstable'])
})

test('stability detects a changing suggestion order', () => {
  const stability = calculateStability([
    { ...result('suggestions', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'),
      suggestionIds: ['wine-1', 'wine-2'] },
    { ...result('suggestions', 'KNOWN_CATALOG', 'SUGGESTED', 'POSSIBLE_MATCHES'),
      suggestionIds: ['wine-2', 'wine-1'] },
  ])
  assert.equal(stability.rate, 0)
})

test('acceptance makes missing cost evidence and missed thresholds explicit', () => {
  const metrics = {
    exactPrecision: 0.8,
    topThreeRecall: 0.7,
    rejectionQuality: 1,
    falseExactRate: 0,
    errorRate: 0,
    p95DurationMs: 1000,
  }
  const evaluation = evaluateAcceptance({
    acceptance: {
      requireCostEstimate: true,
      overall: { minExactPrecision: 0.9 },
    },
  }, {}, metrics, { rate: 1 }, { estimatedProviderCostUsd: null })
  assert.equal(evaluation.accepted, false)
  assert.equal(evaluation.violations.length, 2)
})

test('top-one acceptance cannot be satisfied by a correct third suggestion', () => {
  const evaluation = evaluateAcceptance({ acceptance: { overall: { minTopOneRecall: 0.9 } } },
    {}, { topOneRecall: 0.8, topThreeRecall: 1 }, { rate: 1 }, {})
  assert.equal(evaluation.accepted, false)
  assert.ok(evaluation.violations.some((value) => value.includes('topOneRecall')))
})

test('acceptance enforces repeated runs and the configured cost ceiling', () => {
  const metrics = {
    exactPrecision: 1, topThreeRecall: 1, rejectionQuality: 1,
    falseExactRate: 0, errorRate: 0, p95DurationMs: 1000,
  }
  const evaluation = evaluateAcceptance({
    acceptance: { minRepetitions: 3, maxEstimatedCostUsd: 2 },
  }, {}, metrics, { rate: 1 }, { estimatedProviderCostUsd: 2.1 }, { repetitions: 2 })
  assert.equal(evaluation.accepted, false)
  assert.equal(evaluation.violations.length, 2)
})

test('dataset rejects known catalog samples without a strict expected ID', () => {
  assert.throws(() => validateDataset({
    schemaVersion: 2,
    datasetId: 'invalid',
    cohorts: {
      TEST: [{
        caseId: 'test', cohort: 'TEST', difficulty: 'TEST',
        expectedOutcome: 'KNOWN_CATALOG', fixture: { type: 'SYNTHETIC_LABEL' },
      }],
    },
  }), /expected wine ID/)
})

test('synthetic controls render as uploadable JPEG images', async () => {
  const image = await sampleImage({
    caseId: 'fixture',
    fixture: { type: 'SYNTHETIC_LABEL', lines: ['UNKNOWN WINE', 'MALBEC'] },
  })
  assert.equal(image.type, 'image/jpeg')
  assert.ok(image.size > 10_000)
})

function result(caseId, expectedOutcome, classification, outcome, returnedWineId = null) {
  return { caseId, expectedOutcome, classification, outcome, returnedWineId, durationMs: 100 }
}
