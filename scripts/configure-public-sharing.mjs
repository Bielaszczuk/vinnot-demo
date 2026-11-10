import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readTargetDistribution } from './configure-web-security-headers.mjs';

// Managed CachingDisabled: all TTLs are zero, including withdrawn content.
export const disabledCachePolicyId = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
export const sharingOriginId = 'vinnot-sharing-api';
export const sharingPaths = ['/share', '/share/*'];
const targets = { 'vinnot.com': 'api.vinnot.com', 'dev.vinnot.com': 'api-dev.vinnot.com' };

function isSharingOrigin(origin, apiHost) {
  return origin?.DomainName === apiHost && origin?.OriginPath === '/api'
    && origin?.CustomOriginConfig?.OriginProtocolPolicy === 'https-only'
    && !(origin.CustomHeaders?.Quantity || origin.CustomHeaders?.Items?.length)
    && !origin.S3OriginConfig && !origin.OriginAccessControlId;
}

export function isManagedShareBehavior(distribution, behavior, publicUrl) {
  const origin = distribution.Origins?.Items?.find(item => item.Id === behavior.TargetOriginId);
  const request = distribution.DefaultCacheBehavior.FunctionAssociations?.Items?.find(item => item.EventType === 'viewer-request');
  const associations = behavior.FunctionAssociations?.Items ?? [];
  const methods = behavior.AllowedMethods?.Items ?? [];
  return sharingPaths.includes(behavior.PathPattern) && behavior.TargetOriginId === sharingOriginId
    && isSharingOrigin(origin, targets[new URL(publicUrl).hostname])
    && behavior.ViewerProtocolPolicy === 'https-only'
    && behavior.CachePolicyId === disabledCachePolicyId
    && !behavior.OriginRequestPolicyId
    && !behavior.FieldLevelEncryptionId
    && !behavior.TrustedSigners?.Enabled && !behavior.TrustedSigners?.Quantity
    && !behavior.TrustedKeyGroups?.Enabled && !behavior.TrustedKeyGroups?.Quantity
    && behavior.AllowedMethods?.Quantity === 2 && methods.length === 2
    && methods.includes('GET') && methods.includes('HEAD')
    && behavior.FunctionAssociations?.Quantity === 1 && associations.length === 1
    && associations[0].EventType === 'viewer-request' && associations[0].FunctionARN === request?.FunctionARN
    && !(behavior.LambdaFunctionAssociations?.Quantity || behavior.LambdaFunctionAssociations?.Items?.length);
}

/** Plans by default. An operator applies once; release identities gain no permissions. */
export function configurePublicSharing(distributionId, aws, publicUrl, apply = false, backupPath) {
  const snapshot = readTargetDistribution(distributionId, aws, publicUrl);
  const distribution = structuredClone(snapshot.DistributionConfig);
  const hostname = new URL(publicUrl).hostname;
  const apiHost = targets[hostname];
  const existing = distribution.CacheBehaviors?.Items ?? [];
  const currentOrigin = distribution.Origins.Items.find(item => item.Id === sharingOriginId);
  const request = distribution.DefaultCacheBehavior.FunctionAssociations?.Items?.find(item => item.EventType === 'viewer-request');
  if (!apiHost || (distribution.CacheBehaviors?.Quantity ?? 0) !== existing.length
      || existing.some(behavior => !isManagedShareBehavior(distribution, behavior, publicUrl))
      || currentOrigin && !isSharingOrigin(currentOrigin, apiHost)) {
    throw new Error('Unexpected edge origins/behaviors; refusing to replace foreign configuration');
  }
  if (!request?.FunctionARN?.endsWith(`:function/vinnot-web-security-${distributionId.toLowerCase()}`)) {
    throw new Error('Publish the owned SPA security function before configuring sharing');
  }
  // The owned viewer function already handles SPA navigation. Global S3-to-SPA
  // error mappings would also turn the API's withdrawn-content 404 into a 200.
  const errors = distribution.CustomErrorResponses?.Items ?? [];
  const retainedErrors = errors.filter(item => !([403, 404].includes(item.ErrorCode)
    && item.ResponseCode === '200' && item.ResponsePagePath === '/index.html'));
  if (retainedErrors.length !== errors.length) {
    distribution.CustomErrorResponses = { Quantity: retainedErrors.length,
      ...(retainedErrors.length ? { Items: retainedErrors } : {}) };
  }
  // Free CloudFront plans disallow custom origin policies. With CachingDisabled
  // and no origin request policy, no viewer headers/cookies/query are forwarded.
  // The existing request function carries the allowed language in the origin URI.
  const plan = { distributionId, publicUrl, apiHost, paths: sharingPaths, cache: 'disabled',
    query: false, language: 'origin-uri', cookies: false, credentials: false, newServices: false,
    removedSpaErrorFallbacks: errors.length - retainedErrors.length };
  if (!apply) return { ...plan, applied: false };
  if (backupPath) writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), { flag: 'wx', mode: 0o600 });
  if (!currentOrigin) {
    distribution.Origins.Items.push({ Id: sharingOriginId, DomainName: apiHost, OriginPath: '/api',
      CustomHeaders: { Quantity: 0 }, CustomOriginConfig: { HTTPPort: 80, HTTPSPort: 443,
        OriginProtocolPolicy: 'https-only', OriginSslProtocols: { Quantity: 1, Items: ['TLSv1.2'] },
        OriginReadTimeout: 15, OriginKeepaliveTimeout: 5 } });
    distribution.Origins.Quantity = distribution.Origins.Items.length;
  }
  distribution.CacheBehaviors = { Quantity: sharingPaths.length, Items: sharingPaths.map(PathPattern => {
    const current = existing.find(item => item.PathPattern === PathPattern);
    return {
      ...current,
      PathPattern, TargetOriginId: sharingOriginId, ViewerProtocolPolicy: 'https-only', Compress: true,
      // Standard distributions require this explicit flag when adding a behavior.
      SmoothStreaming: false,
      FieldLevelEncryptionId: '',
      TrustedSigners: { Enabled: false, Quantity: 0 },
      TrustedKeyGroups: { Enabled: false, Quantity: 0 },
      AllowedMethods: current?.AllowedMethods ?? { Quantity: 2, Items: ['GET', 'HEAD'], CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] } },
      CachePolicyId: disabledCachePolicyId,
      FunctionAssociations: { Quantity: 1, Items: [{ EventType: 'viewer-request', FunctionARN: request.FunctionARN }] },
      LambdaFunctionAssociations: { Quantity: 0 },
    };
  }) };
  // A newly published function may rotate the distribution ETag.
  const latest = readTargetDistribution(distributionId, aws, publicUrl);
  if (JSON.stringify(latest.DistributionConfig) !== JSON.stringify(snapshot.DistributionConfig)) {
    throw new Error('Distribution changed concurrently; no configuration was overwritten');
  }
  const changed = JSON.stringify(distribution) !== JSON.stringify(snapshot.DistributionConfig);
  if (changed) aws('update-distribution', ['--id', distributionId, '--if-match', latest.ETag,
    '--distribution-config', JSON.stringify(distribution)]);
  return { ...plan, applied: true, changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const aws = (operation, args) => JSON.parse(execFileSync('aws', ['cloudfront', operation, ...args, '--output', 'json'], { encoding: 'utf8' }));
    console.log(JSON.stringify(configurePublicSharing(process.env.CLOUDFRONT_DISTRIBUTION_ID, aws,
      process.env.PUBLIC_URL, process.argv.includes('--apply'), process.env.SHARING_BACKUP_PATH)));
  } catch (error) {
    // Never dump exec arguments containing a complete operator distribution snapshot.
    console.error(typeof error.status === 'number' ? 'CloudFront operation failed; check operator session and permissions.' : error.message);
    process.exitCode = 1;
  }
}
