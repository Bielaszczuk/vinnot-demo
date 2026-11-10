import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configurePublicSharing, disabledCachePolicyId, isManagedShareBehavior } from '../configure-public-sharing.mjs';
import { linkAssociations } from '../../frontend-react/config/link-associations.mjs';

function fixture(patch = {}) {
  let distribution = { Aliases: { Items: ['vinnot.com'] }, Origins: { Quantity: 1, Items: [{ Id: 'web', S3OriginConfig: {} }] },
    DefaultCacheBehavior: { TargetOriginId: 'web', CachePolicyId: 'unchanged', FunctionAssociations: { Quantity: 1,
      Items: [{ EventType: 'viewer-request', FunctionARN: 'arn:aws:cloudfront::123456789012:function/vinnot-web-security-dist' }] } }, ...patch };
  const calls = [];
  function aws(operation, args) {
    calls.push(operation);
    const value = flag => args[args.indexOf(flag) + 1];
    if (operation === 'get-distribution-config') return { DistributionConfig: structuredClone(distribution), ETag: 'fresh' };
    if (operation === 'update-distribution') {
      distribution = JSON.parse(value('--distribution-config'));
      for (const behavior of distribution.CacheBehaviors.Items) {
        // Model the standard CloudFront API contract and response normalization.
        assert.equal(typeof behavior.SmoothStreaming, 'boolean', 'SmoothStreaming flag is missing');
        assert.equal(typeof behavior.FieldLevelEncryptionId, 'string', 'Field level encryption id is required');
        behavior.AllowedMethods.Items.reverse();
      }
      return {};
    }
    throw new Error(operation);
  }
  return { aws, calls, current: () => distribution };
}
test('plan is read-only; apply is idempotent and leaves SPA/cache intact', () => {
  const f = fixture();
  const original = structuredClone(f.current().DefaultCacheBehavior);
  assert.equal(configurePublicSharing('DIST', f.aws, 'https://vinnot.com').applied, false);
  assert.deepEqual(f.calls, ['get-distribution-config']);
  assert.equal(configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true).changed, true);
  assert.equal(configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true).changed, false);
  assert.equal(f.calls.filter(value => value === 'update-distribution').length, 1);
  assert.deepEqual(f.current().DefaultCacheBehavior, original);
  for (const behavior of f.current().CacheBehaviors.Items) {
    assert.equal(isManagedShareBehavior(f.current(), behavior, 'https://vinnot.com'), true);
    assert.equal(behavior.CachePolicyId, disabledCachePolicyId);
    assert.deepEqual(behavior.AllowedMethods.Items.toSorted(), ['GET', 'HEAD']);
    assert.equal(behavior.SmoothStreaming, false);
    assert.equal(behavior.FieldLevelEncryptionId, '');
    assert.equal(behavior.OriginRequestPolicyId, undefined);
    assert.equal(behavior.FunctionAssociations.Quantity, 1);
    assert.equal(behavior.FunctionAssociations.Items[0].EventType, 'viewer-request');
  }
});
test('sharing cannot be activated before the owned security function', () => {
  const f = fixture({ DefaultCacheBehavior: { TargetOriginId: 'web' } });
  assert.throws(() => configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true), /owned SPA/);
  assert.deepEqual(f.calls, ['get-distribution-config']);
});
test('public 404s retain their status instead of the global legacy SPA fallback', () => {
  const foreign = { ErrorCode: 500, ResponseCode: '500', ResponsePagePath: '/maintenance.html' };
  const f = fixture({ CustomErrorResponses: { Quantity: 3, Items: [foreign,
    ...[403, 404].map(ErrorCode => ({ ErrorCode, ResponseCode: '200', ResponsePagePath: '/index.html' }))] } });
  assert.equal(configurePublicSharing('DIST', f.aws, 'https://vinnot.com').removedSpaErrorFallbacks, 2);
  assert.equal(f.current().CustomErrorResponses.Quantity, 3);
  configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true);
  assert.deepEqual(f.current().CustomErrorResponses, { Quantity: 1, Items: [foreign] });
  assert.equal(configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true).changed, false);
  const onlySpa = fixture({ CustomErrorResponses: { Quantity: 1,
    Items: [{ ErrorCode: 404, ResponseCode: '200', ResponsePagePath: '/index.html' }] } });
  configurePublicSharing('DIST', onlySpa.aws, 'https://vinnot.com', true);
  assert.deepEqual(onlySpa.current().CustomErrorResponses, { Quantity: 0 });
});
test('foreign behaviors, hosts and concurrent changes stop writes', () => {
  for (const patch of [{ Aliases: { Items: ['dev.vinnot.com'] } }, { CacheBehaviors: { Quantity: 1, Items: [{ PathPattern: '/*' }] } }]) {
    const f = fixture(patch);
    assert.throws(() => configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true));
    assert.ok(!f.calls.includes('update-distribution'));
  }
  const f = fixture(); let reads = 0;
  assert.throws(() => configurePublicSharing('DIST', (op, args) => {
    const result = f.aws(op, args);
    if (op === 'get-distribution-config' && ++reads > 1) result.DistributionConfig.Comment = 'Concurrent change';
    return result;
  }, 'https://vinnot.com', true), /concurrently/);
  assert.ok(!f.calls.includes('update-distribution'));
});
test('an existing origin cannot forward custom credentials or downgrade HTTPS', () => {
  for (const patch of [
    { CustomOriginConfig: { OriginProtocolPolicy: 'http-only' } },
    { CustomHeaders: { Quantity: 1, Items: [{ HeaderName: 'Authorization', HeaderValue: 'fixture' }] } },
    { OriginPath: '/private' }, { OriginAccessControlId: 'foreign' },
  ]) {
    const f = fixture({ Origins: { Quantity: 2, Items: [{ Id: 'web', S3OriginConfig: {} },
      { Id: 'vinnot-sharing-api', DomainName: 'api.vinnot.com', OriginPath: '/api',
        CustomOriginConfig: { OriginProtocolPolicy: 'https-only' }, ...patch }] } });
    assert.throws(() => configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true), /foreign/);
    assert.ok(!f.calls.includes('create-origin-request-policy'));
    assert.ok(!f.calls.includes('update-distribution'));
  }
});
test('an opt-in backup preserves the original config privately and is never overwritten', () => {
  const f = fixture();
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-sharing-backup-'));
  const backup = join(directory, 'distribution.json');
  try {
    const original = structuredClone(f.current());
    configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true, backup);
    assert.deepEqual(JSON.parse(readFileSync(backup)).DistributionConfig, original);
    assert.equal(statSync(backup).mode & 0o777, 0o600);
    const writes = f.calls.filter(call => call === 'update-distribution').length;
    assert.throws(() => configurePublicSharing('DIST', f.aws, 'https://vinnot.com', true, backup), /EEXIST/);
    assert.equal(f.calls.filter(call => call === 'update-distribution').length, writes);
  } finally { rmSync(directory, { recursive: true }); }
});
test('association files match exact production identities and exclude auth/legal links', () => {
  const files = linkAssociations('production');
  const apple = JSON.parse(files['apple-app-site-association']).applinks.details[0];
  assert.equal(apple.appID, '569A638J8F.com.vinnot.app');
  assert.deepEqual(apple.paths, ['/share', '/share/', '/share/wines/*', '/share/events/*', '/share/wine-routes/*']);
  const android = JSON.parse(files['assetlinks.json'])[0].target;
  assert.equal(android.package_name, 'com.vinnot.app');
  assert.equal(android.sha256_cert_fingerprints.length, 2);
  const dev = linkAssociations('development');
  assert.match(dev['apple-app-site-association'], /com.vinnot.app.dev/);
  assert.deepEqual(JSON.parse(dev['assetlinks.json']), []);
  assert.equal(JSON.parse(linkAssociations('development', android.sha256_cert_fingerprints[0])['assetlinks.json'])[0].target.package_name, 'com.vinnot.app.dev');
  assert.throws(() => linkAssociations('staging'));
  assert.throws(() => linkAssociations('development', 'unverified'));
});
