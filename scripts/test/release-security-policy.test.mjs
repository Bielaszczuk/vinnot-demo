import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url))

test('security gate scans history, development dependencies, packaged code and operating system', () => {
  const workflow = read('.github/workflows/security-checks.yml')
  assert.match(workflow, /workflow_call:/)
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /fetch-depth: 0/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /node scripts\/audit-npm-dependencies.mjs/);
  const audit = read('scripts/audit-npm-dependencies.mjs');
  assert.match(audit, /'--package-lock-only', '--include=dev', '--audit-level=high', '--json'/)
  assert.match(workflow, /gitleaks git --redact.*--all/)
  assert.match(workflow, /cache: maven/)
  assert.ok(workflow.indexOf('dependency:resolve') < workflow.indexOf('Scan Maven source dependency graph'))
  assert.match(workflow, /trivy fs --scanners vuln --offline-scan --skip-dirs backend\/target/)
  assert.match(workflow, /trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1/)
  assert.match(workflow, /expo prebuild --platform android --clean --no-install/)
  assert.match(workflow, /:app:vinnotLockReleaseDependencies --write-locks/)
  assert.match(workflow, /trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1.*android\/app\/gradle.lockfile/)
  assert.doesNotMatch(workflow, /ignore-unfixed|continue-on-error|secrets: inherit/)
  for (const [, action] of workflow.matchAll(/uses: (\S+)/g)) {
    assert.match(action, /@[a-f0-9]{40}$/)
  }
})

test('Android inventory fails on incomplete resolution instead of scanning a partial graph', () => {
  const script = read('frontend-mobile/scripts/lock-android-dependencies.gradle')
  assert.match(script, /rootProject.findProject\(':app'\)/)
  assert.match(script, /lockAllConfigurations\(\)/)
  assert.match(script, /getByName\('releaseRuntimeClasspath'\)/)
  assert.match(script, /UnresolvedDependencyResult/)
  assert.match(script, /throw new GradleException/)
})

test('backend scans gate HIGH/CRITICAL findings with no applicability exceptions or suppressions', () => {
  for (const name of ['security-checks', 'deploy-backend-dev', 'production-release']) {
    const workflow = read(`.github/workflows/${name}.yml`)
    assert.doesNotMatch(workflow, /write-backend-vex|--vex|--show-suppressed|ignore-unfixed|continue-on-error/)
    const scans = [...workflow.matchAll(/trivy(?:"|) (?:fs|image) --scanners vuln[^\n]+/g)]
      .filter(([command]) => !command.includes('android/app/gradle.lockfile'))
    assert.ok(scans.length > 0)
    for (const scan of scans) assert.match(scan[0], /--severity HIGH,CRITICAL --exit-code 1/)
  }
  assert.equal(exists('scripts/write-backend-vex.mjs'), false)
  for (const scope of ['backend-xslt-vex-scope.json', 'backend-sse-vex-scope.json']) {
    assert.equal(exists(`infra/security/${scope}`), false)
  }
})

test('deployment requires security and publishes the exact scanned backend image', () => {
  const ci = read('.github/workflows/ci.yml')
  assert.match(ci, /quality-gate:\s+name: CI quality gate/)
  assert.match(ci, /needs: \[changes, quality-gate\]/)
  assert.match(ci, /needs: \[changes, quality-gate, deploy-backend\]/)
  for (const name of ['deploy-backend-dev', 'deploy-frontend-dev']) {
    const workflow = read(`.github/workflows/${name}.yml`)
    assert.match(workflow, /workflow_call:/)
    assert.doesNotMatch(workflow, /workflow_dispatch:|\n  push:|uses: .*security-checks/)
    assert.match(workflow, /node (?:\.\.\/)?scripts\/verify-deploy-revision.mjs/)
    assert.match(workflow, /cancel-in-progress: false/)
  }
  const backend = read('.github/workflows/deploy-backend-dev.yml')
  const scan = backend.indexOf('trivy image')
  assert.ok(scan > 0 && scan < backend.indexOf('Configure AWS credentials'))
  assert.ok(scan < backend.indexOf('docker push'))
  assert.match(backend, /--load backend/)
  assert.doesNotMatch(backend, /--push backend/)
  const web = read('.github/workflows/deploy-frontend-dev.yml')
  assert.doesNotMatch(web, /npm (?:run lint|test)/)
  assert.match(web, /npm run build/)
})

test('CI and deployment actions and Docker base images have immutable references', () => {
  for (const name of ['ci', 'deploy-backend-dev', 'deploy-frontend-dev', 'ios-native-validation']) {
    for (const [, action] of read(`.github/workflows/${name}.yml`).matchAll(/uses: (\S+)/g)) {
      if (!action.startsWith('./')) assert.match(action, /@[a-f0-9]{40}$/)
    }
  }
  const images = [...read('backend/Dockerfile').matchAll(/^FROM (\S+)/gm)]
  assert.equal(images.length, 2)
  for (const [, image] of images) assert.match(image, /@sha256:[a-f0-9]{64}$/)
})

test('iOS native validation is opt-in, unsigned and retains its resolved inventory', () => {
  const workflow = read('.github/workflows/ios-native-validation.yml')
  assert.match(workflow, /workflow_dispatch:/)
  // The run starts for the label being added, not for any later label on an already labelled pull request.
  assert.match(workflow, /if: github.event_name == 'workflow_dispatch' \|\| github.event.label.name == 'validate:ios-native'/)
  // Only adding the label (or a manual run) starts the macOS job; other pull request events would only skip.
  assert.match(workflow, /\n  pull_request:\n    types: \[labeled\]\n/)
  // Another label added during a run lands in its own group, so it never cancels the running validation.
  assert.match(workflow, /group: ios-native-\$\{\{ github.event.pull_request.number \|\| github.ref \}\}-\$\{\{ github.event.label.name \|\| 'dispatch' \}\}/)
  assert.match(workflow, /cancel-in-progress: true/)
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO build/)
  assert.match(workflow, /-configuration Release -sdk iphoneos/)
  assert.match(workflow, /trivy fs .*--exit-code 1.*Podfile.lock/)
  assert.match(workflow, /ios-binary.sha256/)
  assert.doesNotMatch(workflow, /secrets\.|eas build|eas submit|continue-on-error/)
})

test('secret false positives are scoped to immutable commit, path, rule and line fingerprints', () => {
  const fingerprints = read('.gitleaksignore').split('\n').filter((line) => line && !line.startsWith('#'))
  assert.equal(new Set(fingerprints).size, fingerprints.length)
  for (const fingerprint of fingerprints) {
    assert.match(fingerprint, /^[a-f0-9]{40}:[^*]+:[a-z-]+:\d+$/)
  }
})
