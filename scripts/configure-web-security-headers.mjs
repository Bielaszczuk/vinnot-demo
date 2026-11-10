import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const webHeaders = JSON.parse(readFileSync(new URL('../frontend-react/security-headers.json', import.meta.url), 'utf8'));

export function securityPolicy(name, previous = {}) {
  const replacement = new Set(['cross-origin-opener-policy', 'permissions-policy']);
  const custom = (previous.CustomHeadersConfig?.Items ?? []).filter(item => !replacement.has(item.Header.toLowerCase()));
  custom.push(...['Cross-Origin-Opener-Policy', 'Permissions-Policy'].map(Header => ({ Header, Value: webHeaders[Header], Override: true })));
  return {
    ...previous,
    Name: name,
    Comment: 'Vinnot browser security: versioned OAuth/maps-compatible policy',
    SecurityHeadersConfig: {
      ContentSecurityPolicy: { ContentSecurityPolicy: webHeaders['Content-Security-Policy'], Override: true },
      ContentTypeOptions: { Override: true },
      FrameOptions: { FrameOption: 'DENY', Override: true },
      ReferrerPolicy: { ReferrerPolicy: webHeaders['Referrer-Policy'], Override: true },
      StrictTransportSecurity: { AccessControlMaxAgeSec: 15552000, IncludeSubdomains: false, Preload: false, Override: true },
    },
    CustomHeadersConfig: {
      Quantity: custom.length,
      Items: custom,
    },
  };
}

/** Verify the environment before any edge configuration writes. */
export function readTargetDistribution(distributionId, aws, publicUrl) {
  if (!/^[A-Z0-9]+$/.test(distributionId ?? '')) throw new Error('An explicit CloudFront distribution ID is required');
  const target = new URL(publicUrl);
  if (target.protocol !== 'https:' || target.username || target.password || target.port
      || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('PUBLIC_URL must be an HTTPS origin');
  }
  const result = aws('get-distribution-config', ['--id', distributionId]);
  const distribution = result.DistributionConfig;
  const aliases = distribution.Aliases?.Items ?? [];
  if (aliases.length !== 1 || aliases[0] !== target.hostname) {
    throw new Error('CloudFront aliases do not match PUBLIC_URL; refusing cross-environment deployment');
  }
  return result;
}

/** Changes only the selected distribution's response policy, preserving origins/cache/functions. */
export function configureWebHeaders(distributionId, aws, publicUrl) {
  const { DistributionConfig: distribution, ETag } = readTargetDistribution(distributionId, aws, publicUrl);
  const name = `vinnot-web-security-${distributionId.toLowerCase()}`;
  const listed = aws('list-response-headers-policies', ['--type', 'custom']);
  const policies = (listed.ResponseHeadersPolicyList?.Items ?? []).map(item => item.ResponseHeadersPolicy);
  const resolved = new Map();
  for (const behavior of [distribution.DefaultCacheBehavior, ...(distribution.CacheBehaviors?.Items ?? [])]) {
    const originalId = behavior.ResponseHeadersPolicyId;
    const key = originalId ?? 'default';
    if (!resolved.has(key)) {
      const original = originalId ? aws('get-response-headers-policy-config', ['--id', originalId]) : undefined;
      const own = original?.ResponseHeadersPolicyConfig.Name;
      const owned = own === name || own?.startsWith(`${name}-`);
      const targetName = owned ? own : `${name}${originalId ? `-${originalId}` : ''}`;
      const existing = policies.find(policy => policy.ResponseHeadersPolicyConfig.Name === targetName);
      const config = securityPolicy(targetName, original?.ResponseHeadersPolicyConfig);
      let policyId = existing?.Id;
      if (policyId) {
        const current = aws('get-response-headers-policy-config', ['--id', policyId]);
        aws('update-response-headers-policy', ['--id', policyId, '--if-match', current.ETag,
          '--response-headers-policy-config', JSON.stringify(config)]);
      } else {
        policyId = aws('create-response-headers-policy', ['--response-headers-policy-config', JSON.stringify(config)]).ResponseHeadersPolicy.Id;
      }
      resolved.set(key, policyId);
    }
    behavior.ResponseHeadersPolicyId = resolved.get(key);
  }
  aws('update-distribution', ['--id', distributionId, '--if-match', ETag, '--distribution-config', JSON.stringify(distribution)]);
  return [...new Set(resolved.values())].join(', ');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const aws = (operation, args) => JSON.parse(execFileSync('aws', ['cloudfront', operation, ...args, '--output', 'json'], { encoding: 'utf8' }));
  console.log(`Web security policy configured: ${configureWebHeaders(process.env.CLOUDFRONT_DISTRIBUTION_ID, aws, process.env.PUBLIC_URL)}`);
}
