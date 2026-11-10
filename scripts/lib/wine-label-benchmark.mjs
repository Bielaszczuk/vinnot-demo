import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const requireFromMobile = createRequire(new URL('../../frontend-mobile/package.json', import.meta.url))
const jpeg = requireFromMobile('jpeg-js')
const { PNG } = requireFromMobile('pngjs')

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
}

export async function loadBenchmarkDataset(datasetPath) {
  const dataset = JSON.parse(await readFile(datasetPath, 'utf8'))
  if (!dataset.extends) return dataset
  const parent = await loadBenchmarkDataset(resolve(dirname(datasetPath), dataset.extends))
  return {
    ...parent,
    ...dataset,
    cohorts: mergeCohorts(parent.cohorts, dataset.cohorts),
  }
}

export function validateDataset(dataset) {
  if (![1, 2].includes(dataset?.schemaVersion) || typeof dataset.datasetId !== 'string') {
    throw new Error('Dataset must declare schemaVersion=1|2 and a datasetId')
  }
  if (!dataset.cohorts || typeof dataset.cohorts !== 'object') {
    throw new Error('Dataset cohorts are required')
  }
  const expectedSizes = dataset.expectedCohortSizes ?? {}
  const cases = Object.entries(dataset.cohorts).flatMap(([cohort, entries]) => {
    const expectedSize = expectedSizes[cohort] ?? (dataset.schemaVersion === 1 ? 30 : null)
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(`Cohort ${cohort} must contain labelled cases`)
    }
    if (expectedSize !== null && expectedSize !== undefined && entries.length !== expectedSize) {
      throw new Error(`Cohort ${cohort} must contain exactly ${expectedSize} labelled cases`)
    }
    return entries.map((sample) => validateSample(sample, cohort))
  })
  const identifiers = cases.map((sample) => sample.caseId)
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error('Dataset caseId values must be unique')
  }
  return cases
}

export function classifyScan(sample, scan) {
  const expectedIds = sample.expectedWineIds ?? [sample.expectedWineId].filter(Boolean)
  if (sample.expectedOutcome === 'KNOWN_CATALOG') {
    const suggestionIds = (scan.suggestions ?? []).slice(0, 3).map((candidate) => candidate.id)
    return {
      classification: expectedIds.includes(scan.wine?.id)
        ? 'EXACT'
        : suggestionIds.some((id) => expectedIds.includes(id)) ? 'SUGGESTED' : 'MISS',
      suggestionIds,
    }
  }
  return {
    classification: scan.outcome === 'EXACT_MATCH' ? 'FALSE_EXACT' : 'SAFE_REJECTION',
    suggestionIds: (scan.suggestions ?? []).slice(0, 3).map((candidate) => candidate.id),
  }
}

export function summarize(results) {
  const known = results.filter((result) => result.expectedOutcome === 'KNOWN_CATALOG')
  const absent = results.filter((result) => result.expectedOutcome !== 'KNOWN_CATALOG')
  const exact = known.filter((result) => result.classification === 'EXACT').length
  const suggested = known.filter((result) => result.classification === 'SUGGESTED').length
  const firstSuggestion = known.filter((result) => result.classification === 'SUGGESTED'
    && (result.expectedWineIds ?? [result.expectedWineId]).includes(result.suggestionIds?.[0])).length
  const wrongKnownExacts = known.filter((result) => result.outcome === 'EXACT_MATCH'
    && result.classification !== 'EXACT').length
  const predictedExact = results.filter((result) => result.outcome === 'EXACT_MATCH').length
  const safeRejections = absent.filter((result) => result.classification === 'SAFE_REJECTION').length
  const falseExacts = absent.filter((result) => result.classification === 'FALSE_EXACT').length
  const evaluatedAbsent = safeRejections + falseExacts
  const durations = results.map((result) => result.durationMs).sort((left, right) => left - right)
  return {
    total: results.length,
    known: known.length,
    absent: absent.length,
    exactById: exact,
    suggestedById: suggested,
    missed: known.filter((result) => result.classification === 'MISS').length,
    falseExacts,
    wrongKnownExacts,
    totalFalseExacts: falseExacts + wrongKnownExacts,
    errors: results.filter((result) => result.classification === 'ERROR').length,
    exactPrecision: ratio(exact, predictedExact),
    topOneRecall: ratio(exact + firstSuggestion, known.length),
    topThreeRecall: ratio(exact + suggested, known.length),
    rejectionQuality: ratio(safeRejections, evaluatedAbsent),
    falseExactRate: ratio(falseExacts, evaluatedAbsent),
    noMatchRate: ratio(results.filter((result) => result.outcome === 'NO_MATCH').length, results.length),
    errorRate: ratio(results.filter((result) => result.classification === 'ERROR').length, results.length),
    averageDurationMs: durations.length === 0
      ? null
      : Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    p50DurationMs: percentile(durations, 0.5),
    p95DurationMs: percentile(durations, 0.95),
  }
}

export function calculateStability(results) {
  const grouped = Map.groupBy(results, (result) => result.caseId)
  const cases = [...grouped.entries()].map(([caseId, attempts]) => {
    const signatures = attempts.map(resultSignature)
    const stable = new Set(signatures).size === 1
    return { caseId, stable, signatures }
  })
  return {
    cases: cases.length,
    stableCases: cases.filter((sample) => sample.stable).length,
    rate: ratio(cases.filter((sample) => sample.stable).length, cases.length),
    unstable: cases.filter((sample) => !sample.stable),
  }
}

export function evaluateAcceptance(
  dataset, summaries, overall, stability, cost, run = {},
) {
  const violations = []
  const acceptance = dataset.acceptance ?? {}
  for (const [cohort, gates] of Object.entries(acceptance.cohorts ?? {})) {
    evaluateGates(`cohort ${cohort}`, summaries[cohort], gates, violations)
  }
  evaluateGates('overall', overall, acceptance.overall ?? {}, violations)
  if (acceptance.minStability !== undefined && stability.rate < acceptance.minStability) {
    violations.push(`stability ${stability.rate} is below ${acceptance.minStability}`)
  }
  if (acceptance.minRepetitions !== undefined
      && (run.repetitions ?? 0) < acceptance.minRepetitions) {
    violations.push(`repetitions ${run.repetitions ?? 0} is below ${acceptance.minRepetitions}`)
  }
  if (acceptance.requireCostEstimate && cost.estimatedProviderCostUsd === null) {
    violations.push('provider cost estimate is required')
  }
  if (acceptance.maxEstimatedCostUsd !== undefined
      && cost.estimatedProviderCostUsd !== null
      && cost.estimatedProviderCostUsd > acceptance.maxEstimatedCostUsd) {
    violations.push(`estimated provider cost ${cost.estimatedProviderCostUsd} exceeds ${acceptance.maxEstimatedCostUsd}`)
  }
  return { accepted: violations.length === 0, violations }
}

export async function sampleImage(sample) {
  if (sample.imageUrl) {
    const response = await fetch(sample.imageUrl)
    if (!response.ok) throw new Error(`image ${sample.caseId} failed with HTTP ${response.status}`)
    return normalizeReferenceImage(await response.arrayBuffer(), response.headers.get('content-type'))
  }
  if (sample.fixture?.type === 'SYNTHETIC_LABEL') {
    return syntheticLabel(sample.fixture)
  }
  throw new Error(`Unsupported image source for ${sample.caseId}`)
}

export async function normalizeReferenceImage(arrayBuffer, contentType) {
  const source = Buffer.from(arrayBuffer)
  const decoded = contentType?.includes('png')
    ? PNG.sync.read(source)
    : jpeg.decode(source, { useTArray: true })
  const shortest = Math.min(decoded.width, decoded.height)
  const longest = Math.max(decoded.width, decoded.height)
  const scale = Math.max(1, 320 / shortest, 720 / longest)
  const width = Math.ceil(decoded.width * scale)
  const height = Math.ceil(decoded.height * scale)
  const data = scale === 1
    ? decoded.data
    : resizeNearestNeighbor(decoded.data, decoded.width, decoded.height, width, height)
  return new Blob([jpeg.encode({ data, width, height }, 90).data], { type: 'image/jpeg' })
}

export function cohortCounts(cases) {
  return cases.reduce((counts, sample) => ({
    ...counts,
    [sample.cohort]: (counts[sample.cohort] ?? 0) + 1,
  }), {})
}

export function round(value, decimals) {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

function validateSample(sample, cohort) {
  const required = ['caseId', 'expectedOutcome', 'difficulty']
  if (required.some((field) => !sample[field])) {
    throw new Error(`Dataset case in ${cohort} is missing a required field`)
  }
  if (sample.cohort !== cohort) {
    throw new Error(`Dataset case ${sample.caseId} has an invalid cohort`)
  }
  if (!sample.imageUrl && !sample.fixture) {
    throw new Error(`Dataset case ${sample.caseId} has no image source`)
  }
  if (sample.expectedOutcome === 'KNOWN_CATALOG'
      && !sample.expectedWineId
      && !sample.expectedWineIds?.length) {
    throw new Error(`Known case ${sample.caseId} has no expected wine ID`)
  }
  return sample
}

function mergeCohorts(parent = {}, child = {}) {
  const merged = { ...parent }
  for (const [cohort, entries] of Object.entries(child)) {
    merged[cohort] = [...(merged[cohort] ?? []), ...entries]
  }
  return merged
}

function evaluateGates(scope, metrics, gates, violations) {
  if (!metrics) {
    violations.push(`${scope} metrics are missing`)
    return
  }
  const minimums = {
    minExactPrecision: 'exactPrecision',
    minTopOneRecall: 'topOneRecall',
    minTopThreeRecall: 'topThreeRecall',
    minRejectionQuality: 'rejectionQuality',
  }
  const maximums = {
    maxErrorRate: 'errorRate',
    maxFalseExactRate: 'falseExactRate',
    maxP95DurationMs: 'p95DurationMs',
  }
  for (const [gate, metric] of Object.entries(minimums)) {
    if (gates[gate] !== undefined && (metrics[metric] === null || metrics[metric] < gates[gate])) {
      violations.push(`${scope} ${metric} ${metrics[metric]} is below ${gates[gate]}`)
    }
  }
  for (const [gate, metric] of Object.entries(maximums)) {
    if (gates[gate] !== undefined && (metrics[metric] === null || metrics[metric] > gates[gate])) {
      violations.push(`${scope} ${metric} ${metrics[metric]} exceeds ${gates[gate]}`)
    }
  }
}

function syntheticLabel(fixture) {
  const width = 640
  const height = 900
  const data = Buffer.alloc(width * height * 4)
  fill(data, width, height, fixture.background ?? [31, 25, 29, 255])
  rectangle(data, width, 70, 100, 500, 700, fixture.label ?? [245, 239, 225, 255])
  rectangleOutline(data, width, 70, 100, 500, 700, fixture.ink ?? [42, 35, 37, 255], 5)
  const lines = fixture.lines ?? []
  const scale = fixture.scale ?? 7
  const lineHeight = 7 * scale + 34
  const startY = 260 - Math.floor(lines.length * lineHeight / 2)
  lines.forEach((line, index) => drawCenteredText(
    data, width, height, String(line).toUpperCase(), startY + index * lineHeight,
    scale, fixture.ink ?? [42, 35, 37, 255],
  ))
  return new Blob([jpeg.encode({ data, width, height }, 92).data], { type: 'image/jpeg' })
}

function drawCenteredText(data, width, height, text, y, scale, color) {
  const glyphWidth = 5 * scale
  const spacing = scale * 2
  const textWidth = [...text].reduce((sum) => sum + glyphWidth + spacing, -spacing)
  let x = Math.max(85, Math.floor((width - textWidth) / 2))
  for (const character of text) {
    const glyph = FONT[character]
    if (glyph) drawGlyph(data, width, height, glyph, x, y, scale, color)
    x += glyphWidth + spacing
  }
}

function drawGlyph(data, width, height, glyph, x, y, scale, color) {
  glyph.forEach((row, rowIndex) => [...row].forEach((pixel, columnIndex) => {
    if (pixel === '1') {
      rectangle(data, width, x + columnIndex * scale, y + rowIndex * scale, scale, scale, color, height)
    }
  }))
}

function fill(data, width, height, color) {
  rectangle(data, width, 0, 0, width, height, color, height)
}

function rectangle(data, width, x, y, rectangleWidth, rectangleHeight, color, height = 900) {
  for (let row = Math.max(0, y); row < Math.min(height, y + rectangleHeight); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(width, x + rectangleWidth); column += 1) {
      const offset = (row * width + column) * 4
      data[offset] = color[0]
      data[offset + 1] = color[1]
      data[offset + 2] = color[2]
      data[offset + 3] = color[3]
    }
  }
}

function rectangleOutline(data, width, x, y, rectangleWidth, rectangleHeight, color, lineWidth) {
  rectangle(data, width, x, y, rectangleWidth, lineWidth, color)
  rectangle(data, width, x, y + rectangleHeight - lineWidth, rectangleWidth, lineWidth, color)
  rectangle(data, width, x, y, lineWidth, rectangleHeight, color)
  rectangle(data, width, x + rectangleWidth - lineWidth, y, lineWidth, rectangleHeight, color)
}

function resizeNearestNeighbor(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const target = Buffer.alloc(targetWidth * targetHeight * 4)
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / targetHeight))
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / targetWidth))
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4
      const targetOffset = (y * targetWidth + x) * 4
      target[targetOffset] = source[sourceOffset]
      target[targetOffset + 1] = source[sourceOffset + 1]
      target[targetOffset + 2] = source[sourceOffset + 2]
      target[targetOffset + 3] = source[sourceOffset + 3]
    }
  }
  return target
}

function resultSignature(result) {
  const identities = result.returnedWineId
    ?? result.suggestionIds?.slice(0, 3).join(',')
    ?? 'NONE'
  return [result.classification, result.outcome ?? 'ERROR', identities].join('|')
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : round(numerator / denominator, 4)
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null
  return values[Math.ceil(values.length * percentileValue) - 1]
}
