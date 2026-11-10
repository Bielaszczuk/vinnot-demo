import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const template = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/production-web-stack.json', import.meta.url)));
const resources = template.Resources;
const distribution = resources.Distribution.Properties.DistributionConfig;

test('new edge is disabled and cannot use a development bucket or certificate', () => {
  assert.equal(template.Parameters.AcceptanceEnabled.Default, 'false');
  assert.deepEqual(distribution.Enabled, { 'Fn::If': ['EnableAcceptance', true, false] });
  assert.deepEqual(template.Conditions.EnableAcceptance, { 'Fn::Equals': [{ Ref: 'AcceptanceEnabled' }, 'true'] });
  assert.deepEqual(distribution.Aliases, ['vinnot.com']);
  assert.match(distribution.Origins[0].DomainName['Fn::Sub'], /^vinnot-prod-web-/);
  assert.doesNotMatch(JSON.stringify(template), /vinnot-dev|dev\.vinnot/);
  const certificate = new RegExp(template.Parameters.CertificateArn.AllowedPattern);
  assert.ok(certificate.test('arn:aws:acm:us-east-1:497675597655:certificate/abc-123'));
  assert.ok(!certificate.test('arn:aws:acm:eu-west-1:497675597655:certificate/abc-123'));
});

test('private S3 origin requires signed reads and HTTPS with security headers', () => {
  const origin = resources.OriginAccess.Properties.OriginAccessControlConfig;
  assert.equal(origin.SigningBehavior, 'always');
  assert.equal(origin.SigningProtocol, 'sigv4');
  assert.equal(distribution.DefaultCacheBehavior.ViewerProtocolPolicy, 'redirect-to-https');
  assert.deepEqual(distribution.DefaultCacheBehavior.AllowedMethods, ['GET', 'HEAD']);
  assert.equal(distribution.ViewerCertificate.MinimumProtocolVersion, 'TLSv1.2_2021');
  assert.equal(distribution.DefaultCacheBehavior.ResponseHeadersPolicyId, '67f7725c-6f97-4210-82d7-5512b31e9d03');
});

test('free flat-rate subscription covers only its dedicated CDN and WAF', () => {
  const plan = resources.FreePlan.Properties;
  assert.equal(plan.PlanTier, 'FREE');
  assert.equal(plan.PlanFamily, 'CloudFront');
  assert.equal(plan.ResourceArns.length, 2);
  assert.match(plan.ResourceArns[0]['Fn::Sub'], /\$\{Distribution\}$/);
  assert.deepEqual(plan.ResourceArns[1], { 'Fn::GetAtt': ['WebAcl', 'Arn'] });
  const acl = resources.WebAcl.Properties;
  assert.equal(acl.Scope, 'CLOUDFRONT');
  assert.equal(acl.VisibilityConfig.SampledRequestsEnabled, false);
  assert.equal(acl.Rules.length, 3);
  assert.ok(acl.Rules.every(rule => rule.Statement.ManagedRuleGroupStatement.VendorName === 'AWS'));
});

test('the launched site is public: only the three managed groups, no operator IP set or parameter', () => {
  const acl = resources.WebAcl.Properties;
  assert.deepEqual(acl.DefaultAction, { Allow: {} });
  assert.deepEqual(acl.Rules.map(rule => [rule.Name, rule.Priority, rule.Statement.ManagedRuleGroupStatement.Name]), [
    ['AmazonIpReputation', 10, 'AWSManagedRulesAmazonIpReputationList'],
    ['CommonRules', 20, 'AWSManagedRulesCommonRuleSet'],
    ['KnownBadInputs', 30, 'AWSManagedRulesKnownBadInputsRuleSet'],
  ]);
  assert.ok(acl.Rules.every(rule => JSON.stringify(rule.OverrideAction) === '{"None":{}}' && rule.Action === undefined));
  assert.ok(!Object.values(resources).some(resource => resource.Type === 'AWS::WAFv2::IPSet'));
  assert.equal(template.Parameters.OperatorCidr, undefined);
  assert.doesNotMatch(JSON.stringify(template), /OperatorCidr|AcceptanceOperator|PreLaunch|IPSetReferenceStatement|[Pp]re-launch/);
});

test('acceptance requires the tested security function and preserves both associations', () => {
  const rule = template.Rules.AcceptanceRequiresSecurityFunction;
  assert.deepEqual(rule.RuleCondition, { 'Fn::Equals': [{ Ref: 'AcceptanceEnabled' }, 'true'] });
  assert.deepEqual(rule.Assertions[0].Assert, { 'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'SecurityFunctionArn' }, ''] }] });
  assert.equal(template.Parameters.SecurityFunctionArn.Default, '');
  const [condition, associations, omitted] = distribution.DefaultCacheBehavior.FunctionAssociations['Fn::If'];
  assert.equal(condition, 'HasSecurityFunction');
  assert.deepEqual(associations, ['viewer-request', 'viewer-response'].map(EventType => ({
    EventType, FunctionARN: { Ref: 'SecurityFunctionArn' },
  })));
  assert.deepEqual(omitted, { Ref: 'AWS::NoValue' });
});
