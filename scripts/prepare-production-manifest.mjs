import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { inventory, migrationInventory, requireRevision, repository, sha256 } from './release-contract.mjs';

const revision = requireRevision(process.env.APPROVED_SHA);
const plan = JSON.parse(readFileSync('release-plan.json'));
const imageId = plan.components.backend.changed ? execFileSync('docker', ['image', 'inspect', '--format', '{{.Id}}', `vinnot-candidate:${revision}`], { encoding: 'utf8' }).trim() : plan.reusedImageId;
const runtimeFiles = ['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml',
  'compose.production.yml', 'compose.production-data.yml', 'Caddyfile'];
const runtimeHash = sha256(Buffer.concat(runtimeFiles.map(name => readFileSync(`infra/aws-low-cost/${name}`))));
if (plan.components.web.changed) {
  const html = readFileSync('release/web/index.html', 'utf8');
  if (!html.includes('</head>')) throw new Error('Web entrypoint must include a head for release identity');
  writeFileSync('release/web/index.html', html.replace('</head>', `<meta name="vinnot-revision" content="${revision}"></head>`));
  writeFileSync('release/web/release.json', JSON.stringify({ revision, environment: 'production' }) + '\n');
}
const manifest = { format: 2, repository, environment: 'production', revision, components: plan.components,
  ciRunId: process.env.RELEASE_RUN_ID, candidateRunId: process.env.GITHUB_RUN_ID,
  imageId, runtimeHash, migrations: migrationInventory('backend/src/main/resources/db/migration'), files: inventory('release') };
writeFileSync('release/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
