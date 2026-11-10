import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stack = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/production-stack.json', import.meta.url)));
const boundary = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/iam/dev-deployer-boundary.json', import.meta.url)));
const resources = stack.Resources;
const list = value => Array.isArray(value) ? value : [value];
const matches = (pattern, value) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`, 'i').test(value);
// Tests the allowlist shape; effective permissions are also checked with AWS IAM simulation.
const boundaryIncludes = (action, resource) => boundary.Statement.some(statement =>
  statement.Effect === 'Allow' && list(statement.Action).some(pattern => matches(pattern, action))
  && list(statement.Resource).some(pattern => matches(pattern, resource)));

test('production has its own network and no hidden NAT, ALB, RDS or shutdown schedule', () => {
  assert.equal(resources.Vpc.Properties.CidrBlock, '10.30.0.0/16');
  assert.deepEqual(resources.Subnet.Properties.VpcId, { Ref: 'Vpc' });
  assert.equal(resources.Subnet.Properties.MapPublicIpOnLaunch, false);
  const types = Object.values(resources).map(resource => resource.Type);
  for (const type of types) assert.doesNotMatch(type, /NATGateway|NatGateway|LoadBalancer|RDS::|Scheduler::/);
  assert.equal(types.filter(type => type === 'AWS::EC2::Instance').length, 1);
});

test('production encrypts persistent storage and does not enable CPU overage billing', () => {
  const host = resources.Host;
  assert.equal(host.Properties.InstanceType, 't3a.small');
  assert.equal(host.Properties.CreditSpecification.CPUCredits, 'standard');
  assert.equal(host.Properties.MetadataOptions.HttpTokens, 'required');
  assert.equal(host.Properties.DisableApiTermination, true);
  assert.equal(host.DeletionPolicy, 'Retain');
  assert.equal(host.UpdateReplacePolicy, 'Retain');
  const disk = host.Properties.BlockDeviceMappings[0].Ebs;
  assert.equal(disk.Encrypted, true);
  assert.equal(disk.DeleteOnTermination, false);
  assert.equal(disk.VolumeSize, 32);
});

// Reviewed copy of https://www.cloudflare.com/ips-v4 (fetched 2026-10-29). The Caddyfile trusts
// the same ranges; scripts/test/proxy-trust-policy.test.mjs pins them there.
const CLOUDFLARE_IPV4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];

test('launched network accepts HTTP (ACME, redirect) and HTTPS only from Cloudflare, never database or SSH', () => {
  const ingress = resources.SecurityGroup.Properties.SecurityGroupIngress;
  const expected = [80, 443].flatMap(port => CLOUDFLARE_IPV4.map(cidr => ['tcp', port, port, cidr]));
  assert.deepEqual(ingress.map(rule => [rule.IpProtocol, rule.FromPort, rule.ToPort, rule.CidrIp]), expected);
  assert.ok(!ingress.some(rule => rule.CidrIp === '0.0.0.0/0'), 'the origin is never open to every address');
  assert.ok(ingress.every(rule => /^Cloudflare /.test(rule.Description)));
  // 30 rules stay well under the default quota of 60 inbound IPv4 rules per security group.
  assert.equal(ingress.length, 30);
  // The VPC has no IPv6 block, so an IPv6 rule would be meaningless.
  assert.ok(ingress.every(rule => rule.CidrIpv6 === undefined));
  for (const port of [22, 5432]) {
    assert.ok(!ingress.some(rule => rule.FromPort <= port && port <= rule.ToPort), `port ${port} must stay closed`);
  }
  const types = Object.values(resources).map(resource => resource.Type);
  assert.ok(!types.includes('AWS::EC2::SecurityGroupIngress'));
  assert.ok(!types.includes('AWS::EC2::VPCCidrBlock'));
  assert.equal(stack.Parameters.OperatorCidr, undefined);
  // A new GroupDescription makes CloudFormation replace the live security group, so the
  // pre-launch wording stays on purpose; the rules and their descriptions carry the truth.
  assert.equal(resources.SecurityGroup.Properties.GroupDescription,
    'Vinnot production: ACME HTTP and operator-only HTTPS; administration through SSM');
  assert.doesNotMatch(JSON.stringify(ingress), /[Oo]perator|[Pp]re-launch/);
  assert.doesNotMatch(JSON.stringify(stack), /OperatorCidr|[Pp]re-launch/);
});

for (const name of ['MediaBucket', 'BackupBucket', 'WebBucket']) {
  test(`${name} is private, encrypted, versioned and retained`, () => {
    const bucket = resources[name];
    assert.equal(bucket.DeletionPolicy, 'Retain');
    assert.equal(bucket.UpdateReplacePolicy, 'Retain');
    assert.ok(Object.values(bucket.Properties.PublicAccessBlockConfiguration).every(Boolean));
    assert.equal(bucket.Properties.VersioningConfiguration.Status, 'Enabled');
    assert.equal(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm, 'AES256');
    const policyName = { MediaBucket: 'MediaTlsPolicy', BackupBucket: 'BackupTlsPolicy', WebBucket: 'WebTlsPolicy' }[name];
    const deny = resources[policyName].Properties.PolicyDocument.Statement[0];
    assert.equal(deny.Effect, 'Deny');
    assert.equal(deny.Condition.Bool['aws:SecureTransport'], 'false');
  });
}

test('runtime identity cannot delete backups or retrieve database-owner credentials', () => {
  const statements = resources.HostRole.Properties.Policies[0].PolicyDocument.Statement;
  const backup = statements.find(item => item.Sid === 'WriteAndVerifyBackupsWithoutDelete');
  assert.deepEqual(backup.Action, ['s3:PutObject', 's3:GetObject']);
  const secret = statements.find(item => item.Sid === 'ReadRuntimeSecretOnly');
  assert.match(secret.Resource['Fn::Sub'], /secret:vinnot\/prod\/backend-\*$/);
  assert.equal(resources.Repository.Properties.ImageTagMutability, 'IMMUTABLE');
  assert.doesNotMatch(JSON.stringify(statements), /vinnot\/dev|vinnot-dev|iam:|sts:AssumeRole/);
});

test('production keeps both current and replaced backup versions for 30 days', () => {
  const rule = resources.BackupBucket.Properties.LifecycleConfiguration.Rules[0];
  assert.equal(rule.ExpirationInDays, 30);
  assert.equal(rule.NoncurrentVersionExpiration.NoncurrentDays, 30);
  assert.equal(rule.Prefix, 'database-backups/');
});

test('web origin access is opt-in, read-only and bound to one distribution in this account', () => {
  const parameter = stack.Parameters.WebDistributionId;
  assert.equal(parameter.Default, '');
  const pattern = new RegExp(parameter.AllowedPattern);
  for (const value of ['', 'ELFTVWJHW2QAA']) assert.ok(pattern.test(value));
  for (const value of ['*', 'E*', 'distribution/ELFTVWJHW2QAA', 'ELFTVWJHW2QAA/other']) {
    assert.ok(!pattern.test(value));
  }
  assert.deepEqual(stack.Conditions.HasWebDistribution, {
    'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'WebDistributionId' }, ''] }],
  });
  const statements = resources.WebTlsPolicy.Properties.PolicyDocument.Statement;
  assert.equal(statements.length, 2);
  const [condition, allow, omitted] = statements[1]['Fn::If'];
  assert.equal(condition, 'HasWebDistribution');
  assert.deepEqual(omitted, { Ref: 'AWS::NoValue' });
  assert.equal(allow.Effect, 'Allow');
  assert.deepEqual(allow.Principal, { Service: 'cloudfront.amazonaws.com' });
  assert.equal(allow.Action, 's3:GetObject');
  assert.deepEqual(allow.Resource, { 'Fn::Sub': '${WebBucket.Arn}/*' });
  assert.deepEqual(allow.Condition, {
    StringEquals: { 'AWS:SourceArn': {
      'Fn::Sub': 'arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${WebDistributionId}',
    } },
  });
  for (const name of ['MediaTlsPolicy', 'BackupTlsPolicy']) {
    assert.equal(resources[name].Properties.PolicyDocument.Statement.length, 1);
  }
});

test('dev boundary preserves current CI destinations and excludes production and role escalation', () => {
  const dev = 'arn:aws:ec2:us-east-1:497675597655:instance/i-0c0c6e1119024f13f';
  const prod = 'arn:aws:ec2:us-east-1:497675597655:instance/i-00000000000000147';
  for (const action of ['ec2:StartInstances', 'ec2:StopInstances', 'ec2:ModifyInstanceAttribute']) {
    assert.ok(boundaryIncludes(action, dev));
    assert.ok(!boundaryIncludes(action, prod));
  }
  for (const action of ['iam:AttachRolePolicy', 'iam:PutRolePolicy', 'iam:UpdateAssumeRolePolicy', 'iam:DeleteUserPermissionsBoundary']) {
    assert.ok(!boundaryIncludes(action, 'arn:aws:iam::497675597655:role/vinnot-dev-low-cost-host-role'));
  }
  assert.ok(boundaryIncludes('ecr:PutImage', 'arn:aws:ecr:us-east-1:497675597655:repository/vinnot-backend'));
  assert.ok(!boundaryIncludes('ecr:PutImage', 'arn:aws:ecr:us-east-1:497675597655:repository/vinnot-backend-prod'));
  assert.ok(boundaryIncludes('s3:PutObject', 'arn:aws:s3:::vinnot-dev-web-497675597655/index.html'));
  assert.ok(!boundaryIncludes('s3:GetObject', 'arn:aws:s3:::vinnot-prod-backups-497675597655/database-backups/test.dump'));
  assert.ok(!boundaryIncludes('secretsmanager:GetSecretValue', 'arn:aws:secretsmanager:us-east-1:497675597655:secret:vinnot/prod/backend-abcdef'));
});
