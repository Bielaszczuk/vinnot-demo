import test from 'node:test';
import assert from 'node:assert/strict';
import { configureWebHeaders, securityPolicy, webHeaders } from '../configure-web-security-headers.mjs';
import { waitBrowserSessionContract } from '../wait-browser-session-contract.mjs';
import { runInNewContext } from 'node:vm';
import { configureWebSecurityFunction, functionTestEvents, managedSecurityPolicyId, securityFunctionCode } from '../configure-web-security-function.mjs';
import { disabledCachePolicyId } from '../configure-public-sharing.mjs';

function executeEdge(event) {
  return runInNewContext(`${securityFunctionCode()}; handler(event)`, { event: structuredClone(event) });
}

function functionAwsFixture(distributionPatch = {}) {
  let distribution = { Aliases: { Items: ['dev.vinnot.com'] }, Origins: { Items: [{ Id: 'web', S3OriginConfig: {} }] },
    DefaultCacheBehavior: { TargetOriginId: 'web', CachePolicyId: 'cache' }, ...distributionPatch };
  const calls = [];
  let created = false;
  const aws = (op, args) => {
    calls.push(op);
    const value = flag => args[args.indexOf(flag) + 1];
    if (op === 'get-distribution-config') return { DistributionConfig: structuredClone(distribution), ETag: 'dist' };
    if (op === 'describe-function') {
      if (!created) throw new Error('NoSuchFunction');
      return { ETag: 'function' };
    }
    if (op === 'create-function' || op === 'update-function') {
      assert.equal(value('--name'), 'vinnot-web-security-dist123');
      assert.equal(Buffer.from(value('--function-code'), 'base64').toString(), securityFunctionCode());
      assert.equal(JSON.parse(value('--function-config')).Runtime, 'cloudfront-js-2.0');
      created = true;
      return { ETag: 'function-updated' };
    }
    if (op === 'test-function') {
      const event = JSON.parse(Buffer.from(value('--event-object'), 'base64').toString());
      const key = event.context.eventType === 'viewer-request' ? 'request' : 'response';
      return { TestResult: { FunctionOutput: JSON.stringify({ [key]: executeEdge(event) }) } };
    }
    if (op === 'publish-function') return { FunctionSummary: { FunctionMetadata: { FunctionARN:
      'arn:aws:cloudfront::123456789012:function/vinnot-web-security-dist123' } } };
    if (op === 'update-distribution') { distribution = JSON.parse(value('--distribution-config')); return {}; }
    throw new Error(op);
  };
  return { aws, calls, distribution: () => distribution };
}

test('free-plan function applies versioned headers and rewrites SPA routes without changing assets or query strings', () => {
  const events = functionTestEvents();
  assert.equal(executeEdge(events[0]).uri, '/index.html');
  for (const uri of ['/', '/wines/123', '/legal/privacy/']) {
    assert.equal(executeEdge({ ...events[0], request: { ...events[0].request, uri } }).uri, '/index.html');
  }
  for (const uri of ['/assets/index.js', '/assets/missing', '/images/logo.png', '/images/missing', '/favicon.ico',
    '/.well-known/apple-app-site-association', '/.well-known/assetlinks.json', '/share-assets/vinnot-logo.png']) {
    assert.equal(executeEdge({ ...events[0], request: { ...events[0].request, uri } }).uri, uri);
  }
  const request = { ...events[0].request, method: 'HEAD', querystring: { returnTo: { value: '/wines' } } };
  assert.deepEqual(executeEdge({ ...events[0], request }).querystring, request.querystring);
  assert.equal(executeEdge({ ...events[0], request: { ...request, method: 'POST' } }).uri, '/login');
  const response = executeEdge(events[1]);
  for (const [header, value] of Object.entries(webHeaders)) assert.equal(response.headers[header.toLowerCase()].value, value);
  assert.equal(response.headers['content-type'].value, 'text/html');
  assert.equal(response.statusCode, 200);
  assert.ok(Buffer.byteLength(securityFunctionCode()) < 10000);
});

test('free-plan deploy is repeatable, tests before publication and retains origin/cache policy', () => {
  const fixture = functionAwsFixture();
  configureWebSecurityFunction('DIST123', fixture.aws, 'https://dev.vinnot.com');
  configureWebSecurityFunction('DIST123', fixture.aws, 'https://dev.vinnot.com');
  const result = fixture.distribution();
  assert.equal(fixture.calls.filter(op => op === 'create-function').length, 1);
  assert.equal(fixture.calls.filter(op => op === 'update-function').length, 1);
  assert.equal(fixture.calls.filter(op => op === 'test-function').length, 8);
  assert.equal(fixture.calls.filter(op => op === 'update-distribution').length, 1);
  assert.ok(fixture.calls.indexOf('test-function') < fixture.calls.indexOf('publish-function'));
  assert.ok(fixture.calls.indexOf('publish-function') < fixture.calls.indexOf('update-distribution'));
  assert.equal(result.DefaultCacheBehavior.ResponseHeadersPolicyId, managedSecurityPolicyId);
  assert.equal(result.DefaultCacheBehavior.CachePolicyId, 'cache');
  assert.deepEqual(result.DefaultCacheBehavior.FunctionAssociations.Items.map(item => item.EventType), ['viewer-request', 'viewer-response']);
  const existingCors = functionAwsFixture({ DefaultCacheBehavior: { TargetOriginId: 'web', ResponseHeadersPolicyId: 'managed-cors' } });
  configureWebSecurityFunction('DIST123', existingCors.aws, 'https://dev.vinnot.com');
  assert.equal(existingCors.distribution().DefaultCacheBehavior.ResponseHeadersPolicyId, 'managed-cors');
  const alreadyAssociated = functionAwsFixture({ DefaultCacheBehavior: {
    TargetOriginId: 'web', ResponseHeadersPolicyId: managedSecurityPolicyId,
    FunctionAssociations: { Quantity: 2, Items: result.DefaultCacheBehavior.FunctionAssociations.Items
      .map(item => ({ FunctionARN: item.FunctionARN, EventType: item.EventType })).reverse() },
  } });
  configureWebSecurityFunction('DIST123', alreadyAssociated.aws, 'https://dev.vinnot.com');
  assert.ok(!alreadyAssociated.calls.includes('update-distribution'));
});

test('public language routing uses the existing free function and strips all query/cookie values', () => {
  const base = functionTestEvents()[0];
  for (const uri of ['/share', '/share/', '/share/wines/758a7f04-2678-4b92-8f5a-00272d150318']) {
    const request = { ...base.request, uri, headers: { host: { value: 'vinnot.com' }, authorization: { value: 'private' }, cookie: { value: 'private' } },
      querystring: { lang: { value: 'en' }, token: { value: 'private' } },
      cookies: { session: { value: 'private' } } };
    const result = executeEdge({ ...base, request });
    assert.equal(result.uri, uri.replace(/\/$/, '') + '/en');
    assert.deepEqual(Object.keys(result.querystring), []);
    assert.deepEqual(Object.keys(result.cookies), []);
    assert.equal(result.headers.authorization, undefined);
    assert.equal(result.headers.cookie, undefined);
    for (const lang of [undefined, { value: 'es' }, { value: 'en', multiValue: [{ value: 'en' }, { value: 'other' }] }]) {
      assert.equal(executeEdge({ ...base, request: { ...request, querystring: { lang } } }).uri, uri);
    }
  }
});

test('function publication refreshes distribution ETag and refuses concurrent configuration changes', () => {
  for (const changed of [false, true]) {
    const fixture = functionAwsFixture();
    let published = false;
    let updated = false;
    const aws = (op, args) => {
      if (op === 'publish-function') published = true;
      if (op === 'get-distribution-config' && published) {
        const result = fixture.aws(op, args);
        result.ETag = 'after-publication';
        if (changed) result.DistributionConfig.Comment = 'concurrent operator change';
        return result;
      }
      if (op === 'update-distribution') {
        assert.equal(args[args.indexOf('--if-match') + 1], 'after-publication');
        updated = true;
      }
      return fixture.aws(op, args);
    };
    if (changed) assert.throws(() => configureWebSecurityFunction('DIST123', aws, 'https://dev.vinnot.com'), /concurrently/);
    else configureWebSecurityFunction('DIST123', aws, 'https://dev.vinnot.com');
    assert.equal(updated, !changed);
  }
});

test('free-plan deployment refuses cross-environment and unsupported/foreign behaviors before writing', () => {
  const cases = [
    { Aliases: { Items: ['vinnot.com'] } }, { CacheBehaviors: { Quantity: 1 } },
    { Origins: { Items: [{ Id: 'web', CustomOriginConfig: {} }] } },
    { DefaultCacheBehavior: { TargetOriginId: 'web', FunctionAssociations: { Items: [{ FunctionARN: 'foreign' }] } } },
    { DefaultCacheBehavior: { TargetOriginId: 'web', LambdaFunctionAssociations: { Items: [{ EventType: 'viewer-request' }] } } },
  ];
  for (const patch of cases) {
    const fixture = functionAwsFixture(patch);
    assert.throws(() => configureWebSecurityFunction('DIST123', fixture.aws, 'https://dev.vinnot.com'));
    assert.deepEqual(fixture.calls, ['get-distribution-config']);
  }
});

test('security function publication preserves the dedicated public share behaviors', () => {
  const shareOrigin = { Id: 'vinnot-sharing-api', DomainName: 'api-dev.vinnot.com', OriginPath: '/api',
    CustomOriginConfig: { OriginProtocolPolicy: 'https-only' } };
  const share = { Quantity: 2, Items: ['/share', '/share/*'].map(PathPattern => ({ PathPattern,
    TargetOriginId: shareOrigin.Id, ViewerProtocolPolicy: 'https-only',
    CachePolicyId: disabledCachePolicyId,
    FunctionAssociations: { Quantity: 1, Items: [{ EventType: 'viewer-request',
      FunctionARN: 'arn:aws:cloudfront::123456789012:function/vinnot-web-security-dist123' }] },
    AllowedMethods: { Quantity: 2, Items: ['HEAD', 'GET'] } })) };
  const fixture = functionAwsFixture({ Origins: { Items: [{ Id: 'web', S3OriginConfig: {} }, shareOrigin] }, CacheBehaviors: share,
    DefaultCacheBehavior: { TargetOriginId: 'web', FunctionAssociations: share.Items[0].FunctionAssociations } });
  configureWebSecurityFunction('DIST123', fixture.aws, 'https://dev.vinnot.com');
  assert.deepEqual(fixture.distribution().CacheBehaviors, share);
  assert.deepEqual(fixture.distribution().Origins.Items[1], shareOrigin);
});

test('function permission and runtime failures stop publication instead of bypassing security', () => {
  for (const failure of ['describe-function', 'test-function-error', 'test-function-output']) {
    const fixture = functionAwsFixture();
    const aws = (op, args) => {
      if (failure === op) throw new Error('AccessDenied');
      if (op === 'test-function') return { TestResult: failure.endsWith('-error')
        ? { FunctionErrorMessage: 'Runtime failed' } : { FunctionOutput: '{}' } };
      return fixture.aws(op, args);
    };
    assert.throws(() => configureWebSecurityFunction('DIST123', aws, 'https://dev.vinnot.com'));
    assert.ok(!fixture.calls.includes('publish-function'));
    assert.ok(!fixture.calls.includes('update-distribution'));
  }
});

test('security headers preserve CORS and unrelated custom headers', () => {
  const previous = { CorsConfig: { AccessControlAllowCredentials: true }, CustomHeadersConfig: { Items: [
    { Header: 'X-Example', Value: 'keep' }, { Header: 'permissions-policy', Value: 'replace' },
  ] } };
  const policy = securityPolicy('test', previous);
  assert.deepEqual(policy.CorsConfig, previous.CorsConfig);
  assert.equal(policy.CustomHeadersConfig.Quantity, 3);
  assert.equal(policy.CustomHeadersConfig.Items[0].Value, 'keep');
  assert.ok(!webHeaders['Content-Security-Policy'].includes("script-src 'unsafe-inline'"));
});

test('distribution policies remain independent and reruns update only owned policies', () => {
  const policies = new Map([['foreign', { Name: 'shared', CorsConfig: { AccessControlAllowCredentials: false } }]]);
  let distribution = { Aliases: { Quantity: 1, Items: ['dev.vinnot.com'] }, Origins: { keep: true }, DefaultCacheBehavior: { CachePolicyId: 'cache' },
    CacheBehaviors: { Quantity: 2, Items: [{ PathPattern: '/a/*', ResponseHeadersPolicyId: 'foreign' },
      { PathPattern: '/b/*', ResponseHeadersPolicyId: 'foreign' }] } };
  const aws = (op, args) => {
    const value = flag => args[args.indexOf(flag) + 1];
    if (op === 'get-distribution-config') return { DistributionConfig: structuredClone(distribution), ETag: 'dist' };
    if (op === 'list-response-headers-policies') return { ResponseHeadersPolicyList: { Items: [...policies].map(([Id, ResponseHeadersPolicyConfig]) => ({ ResponseHeadersPolicy: { Id, ResponseHeadersPolicyConfig } })) } };
    if (op === 'get-response-headers-policy-config') return { ResponseHeadersPolicyConfig: policies.get(value('--id')), ETag: 'policy' };
    if (op === 'create-response-headers-policy') {
      const Id = `created-${policies.size}`;
      policies.set(Id, JSON.parse(value('--response-headers-policy-config')));
      return { ResponseHeadersPolicy: { Id } };
    }
    if (op === 'update-response-headers-policy') {
      assert.notEqual(value('--id'), 'foreign');
      policies.set(value('--id'), JSON.parse(value('--response-headers-policy-config')));
      return {};
    }
    if (op === 'update-distribution') { distribution = JSON.parse(value('--distribution-config')); return {}; }
    throw new Error(op);
  };
  assert.throws(() => configureWebHeaders('', aws));
  configureWebHeaders('DIST123', aws, 'https://dev.vinnot.com');
  configureWebHeaders('DIST123', aws, 'https://dev.vinnot.com');
  assert.equal(policies.size, 3);
  assert.deepEqual(distribution.Origins, { keep: true });
  assert.equal(distribution.DefaultCacheBehavior.CachePolicyId, 'cache');
  const [a, b] = distribution.CacheBehaviors.Items;
  assert.equal(a.ResponseHeadersPolicyId, b.ResponseHeadersPolicyId);
  assert.notEqual(a.ResponseHeadersPolicyId, distribution.DefaultCacheBehavior.ResponseHeadersPolicyId);
  assert.deepEqual(policies.get(a.ResponseHeadersPolicyId).CorsConfig, { AccessControlAllowCredentials: false });
});

test('wrong environment and invalid public origins fail before any CloudFront mutation', () => {
  const calls = [];
  const aws = (operation) => {
    calls.push(operation);
    assert.equal(operation, 'get-distribution-config');
    return { DistributionConfig: { Aliases: { Items: ['vinnot.com'] } }, ETag: 'prod' };
  };
  assert.throws(() => configureWebHeaders('DIST123', aws, 'https://dev.vinnot.com'), /cross-environment/);
  assert.deepEqual(calls, ['get-distribution-config']);
  calls.length = 0;
  for (const origin of [undefined, '', 'http://dev.vinnot.com', 'https://user@dev.vinnot.com',
    'https://dev.vinnot.com:8443', 'https://dev.vinnot.com/path', 'https://dev.vinnot.com?x=1',
    'https://dev.vinnot.com#fragment']) {
    assert.throws(() => configureWebHeaders('DIST123', aws, origin));
  }
  assert.deepEqual(calls, []);
  for (const aliases of [undefined, { Items: [] }, { Items: ['dev.vinnot.com', 'vinnot.com'] }]) {
    assert.throws(() => configureWebHeaders('DIST123', () => ({ DistributionConfig: { Aliases: aliases } }),
      'https://dev.vinnot.com'), /cross-environment/);
  }
});

test('readiness requires the browser endpoint and credentialed exact-origin CORS', async () => {
  let count = 0;
  const origin = 'https://dev.vinnot.com';
  await waitBrowserSessionContract({ baseUrl: 'https://api-dev.vinnot.com/', origin, attempts: 3,
    pause: async () => {}, log: () => {}, fetcher: async (url, init) => {
      assert.equal(url, 'https://api-dev.vinnot.com/auth/web/refresh');
      assert.equal(init.headers['X-Vinnot-Web-Session'], '1');
      if (++count === 1) throw new Error('deploying');
      return new Response(null, { status: 204, headers: {
        'cache-control': 'no-store',
        'access-control-allow-origin': count === 2 ? '*' : origin, 'access-control-allow-credentials': 'true',
      } });
    } });
  assert.equal(count, 3);
  await assert.rejects(waitBrowserSessionContract({ baseUrl: '', origin }));
  await assert.rejects(waitBrowserSessionContract({ baseUrl: 'https://api-dev.vinnot.com', origin, attempts: 1,
    log: () => {}, fetcher: async () => new Response('{}', { status: 404 }) }), /not ready/);
});

test('anonymous readiness rejects old validation errors, cacheable responses and cookie changes', async () => {
  const origin = 'https://dev.vinnot.com';
  for (const patch of [{ status: 422 }, { cache: 'public' }, { cookie: 'unexpected' }, { credentials: 'false' }]) {
    await assert.rejects(waitBrowserSessionContract({ baseUrl: 'https://api-dev.vinnot.com', origin, attempts: 1,
      log: () => {}, fetcher: async () => new Response(patch.status ? '{}' : null, {
        status: patch.status ?? 204, headers: { 'cache-control': patch.cache ?? 'no-store',
          'access-control-allow-origin': origin, 'access-control-allow-credentials': patch.credentials ?? 'true',
          ...(patch.cookie ? { 'set-cookie': patch.cookie } : {}),
        },
      }) }), /not ready/);
  }
});
