import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const proxy = readFileSync(new URL('../../infra/aws-low-cost/Caddyfile', import.meta.url), 'utf8');
const compose = readFileSync(new URL('../../infra/aws-low-cost/docker-compose.yml', import.meta.url), 'utf8');

// Reviewed copy of https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6.
// When Cloudflare publishes a change, update this list, the Caddyfile and the API security group together.
const CLOUDFLARE_IPV4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_IPV6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
];

const serversBlock = () => {
  const globalOptions = proxy.slice(proxy.indexOf('{'), proxy.indexOf('\n}\n') + 2);
  const match = globalOptions.match(/\n\tservers\s*\{([\s\S]*?)\n\t\}/);
  assert.ok(match, 'the global options must hold a servers block');
  return match[1];
};
const trustedRanges = () => {
  const lines = serversBlock().match(/^\s*trusted_proxies\b.*$/gm) ?? [];
  assert.equal(lines.length, 1, 'exactly one reviewed trusted_proxies policy');
  const [directive, source, ...ranges] = lines[0].trim().split(/\s+/);
  assert.equal(directive, 'trusted_proxies');
  assert.equal(source, 'static');
  return ranges;
};
const reverseProxy = () => {
  const match = proxy.match(/reverse_proxy backend:8080\s*\{([\s\S]*?)\n\t\}/);
  assert.ok(match, 'the API site proxies to the backend');
  return match[1];
};

test('public proxy removes client-controlled RFC 7239 headers before Spring parses forwarded headers', () => {
  assert.match(reverseProxy(), /^\s*header_up\s+-Forwarded\s*$/m);
});

test('the reviewed CDN trust policy trusts exactly the published Cloudflare ranges', () => {
  const ranges = trustedRanges();
  assert.deepEqual([...ranges].sort(), [...CLOUDFLARE_IPV4, ...CLOUDFLARE_IPV6].sort());
  assert.equal(new Set(ranges).size, ranges.length, 'no duplicated range');
  // Anything wider than the CDN would let a direct client claim any address.
  for (const forbidden of ['private_ranges', '0.0.0.0/0', '::/0', '10.0.0.0/8', '172.16.0.0/12',
    '192.168.0.0/16', '127.0.0.1/8', 'fd00::/8', '::1']) {
    assert.ok(!ranges.includes(forbidden), `${forbidden} must not be trusted`);
  }
  assert.match(proxy, /fetched 2026-10-29/, 'the comment records when the ranges were fetched');
  // The trust policy is global, never a per-handler override that skips client IP parsing.
  assert.doesNotMatch(reverseProxy(), /trusted_proxies/);
});

test('the client address comes only from CF-Connecting-IP, which Caddy reads from trusted peers only', () => {
  const lines = serversBlock().match(/^\s*client_ip_headers\b.*$/gm) ?? [];
  assert.deepEqual(lines.map(line => line.trim()), ['client_ip_headers CF-Connecting-IP']);
});

test('Spring receives one X-Forwarded-For entry: the resolved client address', () => {
  const block = reverseProxy();
  assert.match(block, /^\s*header_up\s+X-Forwarded-For\s+\{client_ip\}\s*$/m);
  // Raw request headers are client-controlled; only {client_ip} honours the trust policy.
  assert.doesNotMatch(block, /header_up\s+X-Forwarded-For\s+\{http\.request\.header\./);
  // Trusting Cloudflare would otherwise pass client-supplied host and scheme through to Spring.
  assert.match(block, /^\s*header_up\s+X-Forwarded-Host\s+\{host\}\s*$/m);
  assert.match(block, /^\s*header_up\s+X-Forwarded-Proto\s+\{scheme\}\s*$/m);
});

test('backend HTTP and PostgreSQL ports remain private behind the sanitizing proxy', () => {
  const backend = compose.split('\n  backend:')[1].split('\n  proxy:')[0];
  const postgres = compose.split('\n  postgres:')[1].split('\n  backend:')[0];
  assert.doesNotMatch(backend, /^\s+ports:/m);
  assert.doesNotMatch(postgres, /^\s+ports:/m);
  assert.match(backend, /expose:\s*\n\s*- "8080"/);
  // The rate limiter reads the rightmost X-Forwarded-For entry, which Caddy now sets alone.
  assert.match(backend, /RATE_LIMIT_TRUST_FORWARDED_FOR: "true"/);
});
