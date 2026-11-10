import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Runs pinned expo-doctor for frontend-mobile. Expo SDK patch releases make the version check fail
// between native release trains; that drift warns, every other failed check still blocks (#469).
export const EXPO_DOCTOR = ['--yes', 'expo-doctor@1.18.19'];
const DRIFT_CHECKS = new Set(['Check that packages match versions required by installed Expo SDK']);
const UNRECOGNISED = { ok: false, blocking: ['unrecognised expo-doctor result'] };

/** Drift passes only when every failed check is recognised as drift and the summary count agrees. */
export function classifyDoctorResult({ status, output }) {
  if (status === 0) return { ok: true, drift: [] };
  const text = output.replace(/\u001b\[[0-9;]*m/g, '');
  const failed = [...text.matchAll(/^✖ (.+)$/gm)].map(match => match[1].trim());
  const count = Number(text.match(/^(\d+) checks? failed, indicating possible issues/m)?.[1]);
  if (status === null || failed.length === 0 || failed.length !== count) return UNRECOGNISED;
  const blocking = failed.filter(check => !DRIFT_CHECKS.has(check));
  return blocking.length ? { ok: false, blocking } : { ok: true, drift: failed };
}

export function runExpoDoctor({ cwd = process.cwd(), env = process.env, spawn = spawnSync, log = console.log, error = console.error } = {}) {
  const result = spawn('npx', EXPO_DOCTOR, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  log(output);
  const verdict = classifyDoctorResult({ status: result.status, output });
  if (!verdict.ok) {
    error(`expo-doctor failed: ${verdict.blocking.join('; ')}`);
    return 1;
  }
  if (verdict.drift.length) {
    const message = 'Expo SDK version drift: installed packages differ from the versions this Expo SDK expects. '
      + 'It does not block this check; the monthly native release train aligns them with `npx expo install --fix` '
      + '(docs/en/infra/guides/dependency-updates.md).';
    log(env.GITHUB_ACTIONS === 'true' ? `::warning title=Expo SDK version drift::${message}` : `Warning: ${message}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runExpoDoctor();
}
