import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import './sync-public-content.mjs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function requireFile(source, expectedTest) {
  if (!existsSync(expectedTest)) {
    failures.push(`${relative(workspace, source)} -> ${relative(workspace, expectedTest)}`)
  }
}

function reportForbiddenImport(source, patterns, layer) {
  const content = readFileSync(source, 'utf8')
  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      failures.push(`${relative(workspace, source)} imports ${match[1]} into ${layer}`)
    }
  }
}

function requireHandlerReference(source) {
  const simpleName = source.slice(source.lastIndexOf('/') + 1, -'.java'.length)
  const testDirectory = dirname(source.replace('/src/main/java/', '/src/test/java/'))
  const referenced = walk(testDirectory)
    .filter((path) => path.endsWith('Test.java'))
    .some((path) => readFileSync(path, 'utf8').includes(simpleName))
  if (!referenced) {
    failures.push(`${relative(workspace, source)} has no mirrored package test reference`)
  }
}

const backendMain = join(workspace, 'backend/src/main/java')
for (const source of walk(backendMain).filter((path) =>
  path.endsWith('.java')
    && (path.includes('/application/service/') || path.includes('/domain/service/')))) {
  requireFile(source, source
    .replace('/src/main/java/', '/src/test/java/')
    .replace(/\.java$/, 'Test.java'))
}

for (const source of walk(backendMain).filter((path) =>
  path.endsWith('Handler.java')
    && path.includes('/application/')
    && /\bclass\s+\w+Handler\b/.test(readFileSync(path, 'utf8')))) {
  requireHandlerReference(source)
}

for (const source of walk(backendMain).filter((path) =>
  path.endsWith('Controller.java') && path.includes('/infrastructure/web/'))) {
  reportForbiddenImport(source, [
    /^import (com\.vinnot\.[^;]+\.application\.port\.out\.[^;]+);/m,
  ], 'web controller must depend on an input port, not an output port')
}

for (const source of walk(backendMain).filter((path) =>
  path.endsWith('.java') && path.includes('/domain/'))) {
  reportForbiddenImport(source, [
    /^import (org\.springframework\.[^;]+);/m,
    /^import (jakarta\.persistence\.[^;]+);/m,
    /^import (com\.vinnot\.[^;]+\.application\.[^;]+);/m,
    /^import (com\.vinnot\.[^;]+\.infrastructure\.[^;]+);/m,
  ], 'domain')
}

for (const source of walk(backendMain).filter((path) =>
  path.endsWith('.java') && path.includes('/application/'))) {
  reportForbiddenImport(source, [
    /^import (jakarta\.persistence\.[^;]+);/m,
    /^import (org\.springframework\.(?:web|http)\.[^;]+);/m,
    /^import (com\.vinnot\.[^;]+\.infrastructure\.[^;]+);/m,
  ], 'application')
}

for (const frontend of ['frontend-react', 'frontend-mobile']) {
  const services = join(workspace, frontend, 'src/application/services')
  for (const source of walk(services).filter((path) => path.endsWith('.service.ts'))) {
    requireFile(source, source.replace(/\.ts$/, '.test.ts'))
  }

  const domain = join(workspace, frontend, 'src/domain')
  for (const source of walk(domain).filter((path) =>
    path.endsWith('.ts') || path.endsWith('.tsx'))) {
    reportForbiddenImport(source, [
      /^import .* from ['"]((?:@api|[^'"]*infrastructure|axios|react(?:-native)?|expo)[^'"]*)['"]/m,
    ], `${frontend} domain`)
  }
  for (const source of walk(domain).filter((path) =>
    path.endsWith('.validators.ts') || path.includes('.mappers.'))) {
    const expectedTest = source.endsWith('.validators.ts')
      ? source.replace(/\.ts$/, '.test.ts')
      : source.replace(/\.mappers(?:\.[^.]+)?\.ts$/, '.mappers.test.ts')
    requireFile(source, expectedTest)
  }
}

for (const root of [
  join(workspace, 'backend/src/test'),
  join(workspace, 'frontend-react/src'),
  join(workspace, 'frontend-mobile/src'),
]) {
  for (const test of walk(root).filter((path) =>
    path.endsWith('Test.java') || path.endsWith('.test.ts') || path.endsWith('.test.tsx'))) {
    if (readFileSync(test, 'utf8').trim().length === 0) {
      failures.push(`${relative(workspace, test)} is empty`)
    }
  }
}

if (failures.length > 0) {
  console.error('Test architecture violations:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Architecture verified: dependency boundaries and mirrored business tests are present.')
