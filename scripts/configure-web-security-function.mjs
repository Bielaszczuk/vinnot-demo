import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readTargetDistribution, webHeaders } from './configure-web-security-headers.mjs';
import { isManagedShareBehavior } from './configure-public-sharing.mjs';

// AWS managed SecurityHeadersPolicy also protects origin-error responses, for which
// CloudFront does not invoke viewer-response functions.
export const managedSecurityPolicyId = '67f7725c-6f97-4210-82d7-5512b31e9d03';

export function securityFunctionCode() {
  return `function handler(event) {
  if (event.context.eventType === 'viewer-request') {
    var request = event.request;
    var uri = request.uri;
    if (uri === '/share' || uri.indexOf('/share/') === 0) {
      // Carry one harmless language selection in the origin path. The share
      // behavior forwards no query strings, cookies or viewer headers.
      var lang = request.querystring && request.querystring.lang;
      if (lang && lang.value === 'en' && !lang.multiValue) {
        request.uri = uri.replace(/\\/$/, '') + '/en';
      }
      request.querystring = {};
      request.cookies = {};
      delete request.headers.authorization;
      delete request.headers.cookie;
      return request;
    }
    // Rewrite SPA routes before S3 returns 403/404 so security headers also cover
    // direct navigation. Static assets and query strings retain their semantics.
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        uri.indexOf('/assets/') !== 0 && uri.indexOf('/images/') !== 0 &&
        uri.indexOf('/.well-known/') !== 0 && uri.indexOf('/share-assets/') !== 0 &&
        uri.substring(uri.lastIndexOf('/') + 1).indexOf('.') === -1) {
      request.uri = '/index.html';
    }
    return request;
  }
  var response = event.response;
  var policy = ${JSON.stringify(webHeaders)};
  Object.keys(policy).forEach(function(name) {
    response.headers[name.toLowerCase()] = { value: policy[name] };
  });
  return response;
}`;
}

export function functionTestEvents() {
  const request = { method: 'GET', uri: '/login', headers: { host: { value: 'dev.vinnot.com' } },
    cookies: {}, querystring: {} };
  const base = { version: '1.0', viewer: { ip: '192.0.2.1' }, request };
  return [
    { ...base, context: { eventType: 'viewer-request' } },
    { ...base, context: { eventType: 'viewer-response' }, response: {
      statusCode: 200, statusDescription: 'OK', headers: { 'content-type': { value: 'text/html' } }, cookies: {},
    } },
    ...['/share', '/share/wines/758a7f04-2678-4b92-8f5a-00272d150318'].map(uri => ({
      ...base, context: { eventType: 'viewer-request' }, request: { ...request, uri,
        headers: { ...request.headers, authorization: { value: 'fixture-only' } },
        cookies: { session: { value: 'fixture-only' } }, querystring: { lang: { value: 'en' }, ignored: { value: 'fixture-only' } } },
    })),
  ];
}

/** Free-plan compatible adapter. Never replaces foreign edge code or shared policies. */
export function configureWebSecurityFunction(distributionId, aws, publicUrl) {
  const { DistributionConfig: distribution } = readTargetDistribution(distributionId, aws, publicUrl);
  const originalConfiguration = JSON.stringify(distribution);
  const name = `vinnot-web-security-${distributionId.toLowerCase()}`;
  const behavior = distribution.DefaultCacheBehavior;
  const origin = distribution.Origins.Items.find(item => item.Id === behavior.TargetOriginId);
  const additional = distribution.CacheBehaviors?.Items ?? [];
  if (!origin?.S3OriginConfig || (distribution.CacheBehaviors?.Quantity ?? 0) !== additional.length
      || additional.some(item => !isManagedShareBehavior(distribution, item, publicUrl))) {
    throw new Error('Function mode requires the owned S3 SPA and reviewed public sharing behaviors');
  }
  const associations = behavior.FunctionAssociations?.Items ?? [];
  if (associations.some(item => !item.FunctionARN.endsWith(`:function/${name}`))
      || (behavior.LambdaFunctionAssociations?.Items ?? []).some(item => item.EventType.startsWith('viewer-'))) {
    throw new Error('Foreign viewer function present; refusing to overwrite edge behavior');
  }
  let current;
  try { current = aws('describe-function', ['--name', name, '--stage', 'DEVELOPMENT']); }
  catch (error) {
    if (!String(error.stderr ?? error.message).includes('NoSuchFunction')) throw error;
  }
  const config = { Comment: `Vinnot security and SPA routing for ${distributionId}`, Runtime: 'cloudfront-js-2.0' };
  const args = ['--name', name, '--function-config', JSON.stringify(config),
    '--function-code', Buffer.from(securityFunctionCode()).toString('base64'), '--cli-binary-format', 'base64'];
  const updated = current
    ? aws('update-function', [...args, '--if-match', current.ETag])
    : aws('create-function', args);
  for (const event of functionTestEvents()) {
    event.request.headers.host.value = new URL(publicUrl).hostname;
    const { TestResult: result } = aws('test-function', ['--name', name, '--if-match', updated.ETag,
      '--stage', 'DEVELOPMENT', '--event-object', Buffer.from(JSON.stringify(event)).toString('base64'),
      '--cli-binary-format', 'base64']);
    if (result.FunctionErrorMessage) throw new Error(`CloudFront function validation failed: ${result.FunctionErrorMessage}`);
    const output = JSON.parse(result.FunctionOutput);
    const shared = event.request.uri === '/share' || event.request.uri.startsWith('/share/');
    if (event.context.eventType === 'viewer-request' ? output.request?.uri !== (shared ? event.request.uri + '/en' : '/index.html')
      || shared && (Object.keys(output.request.querystring ?? {}).length || Object.keys(output.request.cookies ?? {}).length
        || output.request.headers?.authorization || output.request.headers?.cookie)
      : Object.entries(webHeaders).some(([header, value]) => output.response?.headers?.[header.toLowerCase()]?.value !== value)) {
      throw new Error('CloudFront function validation returned an unexpected result');
    }
  }
  const published = aws('publish-function', ['--name', name, '--if-match', updated.ETag]);
  const arn = published.FunctionSummary.FunctionMetadata.FunctionARN;
  const expectedAssociations = ['viewer-request', 'viewer-response'].map(EventType => ({
    EventType, FunctionARN: arn,
  }));
  if (associations.length !== 2 || expectedAssociations.some(expected => !associations.some(actual =>
    actual.EventType === expected.EventType && actual.FunctionARN === expected.FunctionARN))) {
    behavior.FunctionAssociations = { Quantity: 2, Items: expectedAssociations };
  }
  // Preserve an existing CORS policy rather than silently changing its contract.
  behavior.ResponseHeadersPolicyId ??= managedSecurityPolicyId;
  // Publishing an associated function can rotate the distribution ETag. Repeated
  // deploys need no association write; initial association uses a fresh snapshot.
  if (JSON.stringify(distribution) !== originalConfiguration) {
    const latest = readTargetDistribution(distributionId, aws, publicUrl);
    if (JSON.stringify(latest.DistributionConfig) !== originalConfiguration) {
      throw new Error('Distribution configuration changed concurrently; refusing to overwrite it');
    }
    aws('update-distribution', ['--id', distributionId, '--if-match', latest.ETag,
      '--distribution-config', JSON.stringify(distribution)]);
  }
  return arn;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const aws = (operation, args) => JSON.parse(execFileSync('aws', ['cloudfront', operation, ...args, '--output', 'json'], { encoding: 'utf8' }));
  console.log(`Web security function configured: ${configureWebSecurityFunction(process.env.CLOUDFRONT_DISTRIBUTION_ID, aws, process.env.PUBLIC_URL)}`);
}
