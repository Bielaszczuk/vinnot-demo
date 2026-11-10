import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { inventory, requireRevision, sha256 } from './release-contract.mjs';
import { existsSync } from 'node:fs';

const MEDIA_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'woff2'];

export function publishWebRelease({ directory, revision, environment, aws = args => execFileSync('aws', args, { encoding: 'utf8' }) }) {
  requireRevision(revision);
  const targets = {
    development: { bucket: 'vinnot-dev-web-497675597655', distribution: 'E16RJ3WGUX15VP' },
    production: { bucket: 'vinnot-prod-web-497675597655', distribution: 'ELFTVWJHW2QAA' },
  };
  const target = targets[environment];
  if (!target) throw new Error('Unknown web publication environment');
  const files = inventory(directory);
  if (!files['index.html'] || !Object.keys(files).some(name => name.startsWith('assets/'))) throw new Error('Incomplete web package');
  const bucket = `s3://${target.bucket}`;
  const common = ['--region', 'us-east-1', '--only-show-errors'];
  // Archive first. No deletion is part of publication or rollback; open tabs retain their chunks.
  aws(['s3', 'sync', directory, `${bucket}/releases/${revision}/${sha256(JSON.stringify(files))}`, ...common, '--cache-control', 'private,no-store']);
  aws(['s3', 'sync', `${directory}/assets`, `${bucket}/assets`, ...common, '--cache-control', 'public,max-age=31536000,immutable']);
  // Images and fonts keep their names across releases, so they get a day of caching instead of none: emails and
  // the share page fetch them from CloudFront without a trip to S3. Every release still invalidates CloudFront.
  const media = MEDIA_EXTENSIONS.map(extension => `*.${extension}`);
  aws(['s3', 'sync', directory, bucket, ...common, '--exclude', '*', ...media.flatMap(glob => ['--include', glob]),
    '--exclude', 'assets/*', '--cache-control', 'public,max-age=86400,stale-while-revalidate=604800']);
  aws(['s3', 'sync', directory, bucket, ...common, '--exclude', 'assets/*', '--exclude', 'index.html',
    '--exclude', 'release.json', ...media.flatMap(glob => ['--exclude', glob]),
    '--cache-control', 'no-cache,no-store,must-revalidate']);
  // AASA has no extension: explicit JSON is required by Apple's association fetcher.
  for (const name of ['apple-app-site-association', 'assetlinks.json']) {
    const file = `${directory}/.well-known/${name}`;
    if (existsSync(file)) aws(['s3', 'cp', file, `${bucket}/.well-known/${name}`, ...common,
      '--content-type', 'application/json', '--cache-control', 'public,max-age=300,must-revalidate']);
  }
  // One S3 object PUT switches the entrypoint only after all prerequisites succeeded.
  aws(['s3', 'cp', `${directory}/index.html`, `${bucket}/index.html`, ...common,
    '--content-type', 'text/html', '--cache-control', 'no-cache,no-store,must-revalidate']);
  const active = aws(['s3', 'cp', `${bucket}/index.html`, '-', ...common]);
  if (sha256(active) !== files['index.html']) throw new Error('Published entrypoint checksum mismatch');
  const invalidation = JSON.parse(aws(['cloudfront', 'create-invalidation', '--distribution-id', target.distribution,
    '--paths', '/*', '--output', 'json']));
  if (!invalidation.Invalidation?.Id) throw new Error('CloudFront did not return an invalidation ID');
  aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', target.distribution, '--id', invalidation.Invalidation.Id]);
  return { revision, entrypoint: files['index.html'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(publishWebRelease({ directory: process.argv[2], revision: process.env.GITHUB_SHA,
    environment: process.env.WEB_RELEASE_ENV })));
}
