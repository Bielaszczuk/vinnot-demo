#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { appendFile } from 'node:fs/promises'
import { BenchmarkAuthSession } from './lib/benchmark-auth-session.mjs'
import {
  calculateStability,
  classifyScan,
  cohortCounts,
  evaluateAcceptance,
  loadBenchmarkDataset,
  round,
  sampleImage,
  summarize,
  validateDataset,
} from './lib/wine-label-benchmark.mjs'

const apiBase = (process.env.VINNOT_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '')
const confirmed = process.env.CONFIRM_PAID_SCAN_BENCHMARK === 'YES'
const validateOnly = process.env.VINNOT_SCAN_VALIDATE_ONLY === 'YES'
const enforceGates = process.env.VINNOT_SCAN_ENFORCE_GATES === 'YES'
const selectedCohort = process.env.VINNOT_SCAN_COHORT
const selectedCaseId = process.env.VINNOT_SCAN_CASE_ID
const selectedCaseIds = parseCaseIds(process.env.VINNOT_SCAN_CASE_IDS)
const repetitions = parsePositiveInteger(process.env.VINNOT_SCAN_REPETITIONS ?? '1', 'VINNOT_SCAN_REPETITIONS')
const requestTimeoutMs = parsePositiveInteger(process.env.VINNOT_SCAN_TIMEOUT_MS ?? '30000', 'VINNOT_SCAN_TIMEOUT_MS')
// Pace paid samples outside measured latency; never retry a failed recognition.
const intervalMs = parseOptionalNonNegativeNumber(process.env.VINNOT_SCAN_INTERVAL_MS, 'VINNOT_SCAN_INTERVAL_MS') ?? 0
const datasetPath = process.env.VINNOT_SCAN_DATASET
  ?? fileURLToPath(new URL('./data/wine-label-release-v2.json', import.meta.url))
const estimatedCostPerCall = parseOptionalNonNegativeNumber(
  process.env.VINNOT_SCAN_ESTIMATED_COST_USD_PER_CALL,
  'VINNOT_SCAN_ESTIMATED_COST_USD_PER_CALL',
)
const authSession = new BenchmarkAuthSession({
  apiBase,
  accessToken: process.env.VINNOT_ACCESS_TOKEN,
  refreshToken: process.env.VINNOT_REFRESH_TOKEN,
  usernameOrEmail: process.env.VINNOT_BENCHMARK_USERNAME,
  password: process.env.VINNOT_BENCHMARK_PASSWORD,
})

const dataset = await loadBenchmarkDataset(datasetPath)
const datasetCases = validateDataset(dataset)
const cohortCases = selectedCohort
  ? datasetCases.filter((sample) => sample.cohort === selectedCohort)
  : datasetCases
const requestedCaseIds = new Set([
  ...(selectedCaseId ? [selectedCaseId] : []),
  ...selectedCaseIds,
])
const cases = requestedCaseIds.size > 0
  ? cohortCases.filter((sample) => requestedCaseIds.has(sample.caseId))
  : cohortCases
if (cases.length === 0) {
  throw new Error('The selected cohort/case does not match the dataset')
}
if (requestedCaseIds.size > 0 && cases.length !== requestedCaseIds.size) {
  const foundCaseIds = new Set(cases.map((sample) => sample.caseId))
  const missing = [...requestedCaseIds].filter((caseId) => !foundCaseIds.has(caseId))
  throw new Error(`Unknown benchmark case(s): ${missing.join(', ')}`)
}

const providerCalls = cases.length * repetitions
if (validateOnly) {
  process.stdout.write(`${JSON.stringify({
    datasetId: dataset.datasetId,
    schemaVersion: dataset.schemaVersion,
    valid: true,
    cohorts: cohortCounts(datasetCases),
    selectedCases: cases.length,
    repetitions,
    providerCalls,
  }, null, 2)}\n`)
  process.exit(0)
}

if (!confirmed) {
  throw new Error(`Set CONFIRM_PAID_SCAN_BENCHMARK=YES to authorize ${providerCalls} provider calls`)
}

await authSession.initialize()
const results = []
for (let repetition = 1; repetition <= repetitions; repetition += 1) {
  for (const sample of cases) {
    if (results.length && intervalMs) await new Promise((resolve) => setTimeout(resolve, intervalMs))
    results.push(await scanCatalogImage(sample, repetition))
    const latest = results.at(-1)
    process.stderr.write(`${latest.caseId} repetition=${repetition} ${latest.classification} ${latest.durationMs}ms\n`)
    if (process.env.VINNOT_SCAN_PROGRESS_FILE) {
      await appendFile(process.env.VINNOT_SCAN_PROGRESS_FILE, `${JSON.stringify(latest)}\n`)
    }
  }
}

const cohorts = [...new Set(cases.map((sample) => sample.cohort))]
const summary = Object.fromEntries(cohorts.map((cohort) => [
  cohort,
  summarize(results.filter((result) => result.cohort === cohort)),
]))
const overall = summarize(results)
const stability = calculateStability(results)
const cost = {
  estimatedCostPerCallUsd: estimatedCostPerCall,
  estimatedProviderCostUsd: estimatedCostPerCall === null
    ? null
    : round(results.length * estimatedCostPerCall, 4),
}
const acceptance = evaluateAcceptance(
  dataset, summary, overall, stability, cost, { repetitions },
)

process.stdout.write(`${JSON.stringify({
  datasetId: dataset.datasetId,
  schemaVersion: dataset.schemaVersion,
  generatedAt: new Date().toISOString(),
  repetitions,
  providerCalls,
  cost,
  acceptance,
  summary,
  overall,
  stability,
  byDifficulty: Object.fromEntries([...new Set(cases.map((sample) => sample.difficulty))]
    .map((difficulty) => [
      difficulty,
      summarize(results.filter((result) => result.difficulty === difficulty)),
    ])),
  results,
}, null, 2)}\n`)

if (enforceGates && !acceptance.accepted) process.exitCode = 2

async function scanCatalogImage(sample, repetition) {
  let started = Date.now()
  try {
    const blob = await sampleImage(sample)
    const form = new FormData()
    form.append('image', blob, `${sample.caseId}.jpg`)
    started = Date.now()
    const scanResponse = await sendScanRequest(form)
    if (!scanResponse.ok) throw new Error(`scan ${sample.caseId} failed with HTTP ${scanResponse.status}`)
    const scan = await scanResponse.json()
    const classification = classifyScan(sample, scan)
    return {
      caseId: sample.caseId,
      cohort: sample.cohort,
      difficulty: sample.difficulty,
      expectedOutcome: sample.expectedOutcome,
      expectedWineId: sample.expectedWineId ?? null,
      expectedWineIds: sample.expectedWineIds ?? [sample.expectedWineId].filter(Boolean),
      expectedWineName: sample.expectedWineName ?? null,
      repetition,
      ...classification,
      outcome: scan.outcome,
      returnedWineId: scan.wine?.id ?? null,
      confidence: scan.confidence ?? null,
      extractedIdentity: sanitizeExtracted(scan.extractedData),
      candidateScores: (scan.candidates ?? []).slice(0, 5).map((candidate) => ({
        wineId: candidate.wine?.id ?? null,
        wineName: candidate.wine?.name ?? null,
        score: candidate.score ?? null,
      })),
      durationMs: Date.now() - started,
    }
  } catch (error) {
    return {
      caseId: sample.caseId,
      cohort: sample.cohort,
      difficulty: sample.difficulty,
      expectedOutcome: sample.expectedOutcome,
      expectedWineId: sample.expectedWineId ?? null,
      expectedWineName: sample.expectedWineName ?? null,
      repetition,
      classification: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    }
  }
}

async function sendScanRequest(form) {
  let response = await fetchScan(form)
  if (response.status !== 401) return response
  await authSession.recoverFromUnauthorized()
  response = await fetchScan(form)
  return response
}

function fetchScan(form) {
  return fetch(`${apiBase}/wines/scan`, {
    method: 'POST',
    headers: authSession.authorizationHeaders(),
    body: form,
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
}

function sanitizeExtracted(extracted) {
  if (!extracted) return null
  return {
    wineryName: extracted.wineryName ?? null,
    wineName: extracted.wineName ?? null,
    grapeVariety: extracted.grapeVariety ?? null,
    vintage: extracted.vintage ?? null,
    wineType: extracted.wineType ?? null,
    region: extracted.region ?? null,
    country: extracted.country ?? null,
    searchKeywords: extracted.searchKeywords ?? null,
    visualDescription: extracted.visualDescription ?? null,
    observedText: extracted.observedText ?? [],
    identitySymbols: extracted.identitySymbols ?? [],
  }
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`)
  return parsed
}

function parseOptionalNonNegativeNumber(value, name) {
  if (value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number`)
  return parsed
}

function parseCaseIds(value) {
  if (!value) return []
  return [...new Set(value.split(',').map((caseId) => caseId.trim()).filter(Boolean))]
}
