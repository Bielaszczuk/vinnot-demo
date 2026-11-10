import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = new URL('../infra/aws-low-cost/monitoring/external_probe.py', import.meta.url);
const ref = name => ({ Ref: name });
const sub = value => ({ 'Fn::Sub': value });
const get = (name, field) => ({ 'Fn::GetAtt': [name, field] });

export function monitoringStack() {
  const resources = {};
  const metricPermission = { Effect: 'Allow', Action: 'cloudwatch:PutMetricData', Resource: '*',
    Condition: { StringEquals: { 'cloudwatch:namespace': 'Vinnot/Production' } } };
  resources.Notifications = { Type: 'AWS::SNS::Topic', Properties: { TopicName: 'vinnot-prod-operations' } };
  resources.AlarmTopicPolicy = { Type: 'AWS::SNS::TopicPolicy', Properties: {
    Topics: [ref('Notifications')], PolicyDocument: { Version: '2012-10-17', Statement: [{
      Effect: 'Allow', Principal: { Service: 'cloudwatch.amazonaws.com' }, Action: 'sns:Publish',
      Resource: ref('Notifications'), Condition: { StringEquals: { 'aws:SourceAccount': ref('AWS::AccountId') },
        ArnLike: { 'aws:SourceArn': sub('arn:${AWS::Partition}:cloudwatch:${AWS::Region}:${AWS::AccountId}:alarm:vinnot-prod-*') } },
    }] },
  } };
  resources.Email = { Type: 'AWS::SNS::Subscription', Properties: {
    Protocol: 'email', Endpoint: ref('OperatorEmail'), TopicArn: ref('Notifications'),
  } };
  resources.HostMetricsPolicy = { Type: 'AWS::IAM::Policy', Properties: {
    PolicyName: 'vinnot-prod-operational-metrics', Roles: ['vinnot-prod-low-cost-host-role'],
    PolicyDocument: { Version: '2012-10-17', Statement: [metricPermission] },
  } };
  resources.ProbeRole = { Type: 'AWS::IAM::Role', Properties: {
    AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [{ Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }] },
    Policies: [{ PolicyName: 'bounded-probe', PolicyDocument: { Version: '2012-10-17', Statement: [
      metricPermission, { Effect: 'Allow', Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: sub('arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/vinnot-prod-edge-probe:*') },
    ] } }],
  } };
  resources.ProbeLogs = { Type: 'AWS::Logs::LogGroup', Properties: {
    LogGroupName: '/aws/lambda/vinnot-prod-edge-probe', RetentionInDays: 7,
  } };
  resources.Probe = { Type: 'AWS::Lambda::Function', DependsOn: 'ProbeLogs', Properties: {
    FunctionName: 'vinnot-prod-edge-probe', Runtime: 'python3.13', Handler: 'index.handler',
    Role: get('ProbeRole', 'Arn'), MemorySize: 128, Timeout: 20,
    Environment: { Variables: { ACCEPTANCE_MODE: ref('AcceptanceMode') } },
    Code: { ZipFile: readFileSync(source, 'utf8') },
  } };
  // Small accounts cannot reserve concurrency below their required unreserved pool.
  // Bound the single scheduled source and discard stale events instead of requesting more quota.
  resources.ProbeAsyncPolicy = { Type: 'AWS::Lambda::EventInvokeConfig', Properties: {
    FunctionName: ref('Probe'), Qualifier: '$LATEST', MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60,
  } };
  resources.Schedule = { Type: 'AWS::Events::Rule', Properties: {
    ScheduleExpression: 'rate(5 minutes)', State: 'ENABLED',
    Targets: [{ Arn: get('Probe', 'Arn'), Id: 'edge', RetryPolicy: { MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60 } }],
  } };
  resources.ProbeInvocation = { Type: 'AWS::Lambda::Permission', Properties: {
    FunctionName: ref('Probe'), Action: 'lambda:InvokeFunction', Principal: 'events.amazonaws.com',
    SourceArn: get('Schedule', 'Arn'), SourceAccount: ref('AWS::AccountId'),
  } };
  function alarm(id, name, props, description) {
    resources[id] = { Type: 'AWS::CloudWatch::Alarm', Properties: {
      AlarmName: `vinnot-prod-${name}`, AlarmDescription: description,
      AlarmActions: [ref('Notifications')], OKActions: [ref('Notifications')],
      EvaluationPeriods: 3, DatapointsToAlarm: 2, ComparisonOperator: 'LessThanThreshold',
      Threshold: 1, TreatMissingData: 'breaching', ...props,
    } };
  }
  const groups = {
    ServiceHealthy: 'API, container or HTTP error/latency degradation. Read /var/lib/vinnot-monitor/latest.json over SSM; inspect release and health.',
    ResourcesHealthy: 'Host/container memory, disk, PostgreSQL or Hikari saturation. Read latest.json; preserve data and bound load before resizing.',
    BackupHealthy: 'Backup is missing, over 30h old, unverified, or timer/service failed. Inspect timer and remote object before retrying.',
    EffectsHealthy: 'Durable effect exhausted or overdue. Inspect metadata only; storage retry requires guarded idempotent recovery. Never blindly replay email.',
    AiHealthy: 'Provider/admission failure, timeout, quota, budget or unresolved accounting. Inspect aggregate deltas; preserve reservations and cached results.',
    EdgeHealthy: 'Independent probe failed or stopped. Private mode checks web rejection/TLS and API DNS only; public mode requires web/API success.',
  };
  for (const [metric, description] of Object.entries(groups)) {
    alarm(metric, metric.replace(/Healthy$/, '').toLowerCase(), {
      Namespace: 'Vinnot/Production', MetricName: metric, Period: 300, Statistic: 'Minimum',
      Dimensions: [{ Name: 'Environment', Value: 'production' }],
      ...(['AiHealthy', 'EffectsHealthy'].includes(metric) ? { EvaluationPeriods: 1, DatapointsToAlarm: 1 } : {}),
    }, description);
  }
  alarm('HostStatus', 'host-status', { Namespace: 'AWS/EC2', MetricName: 'StatusCheckFailed',
    Dimensions: [{ Name: 'InstanceId', Value: ref('ProductionInstanceId') }], Period: 300, Statistic: 'Maximum',
    Threshold: 0, ComparisonOperator: 'GreaterThanThreshold' }, 'EC2 status check failed/missing. Inspect instance/system status; do not replace volumes.');
  alarm('CpuCredits', 'cpu-credits', { Namespace: 'AWS/EC2', MetricName: 'CPUCreditBalance',
    Dimensions: [{ Name: 'InstanceId', Value: ref('ProductionInstanceId') }], Period: 300, Statistic: 'Average',
    Threshold: 12, EvaluationPeriods: 3, DatapointsToAlarm: 3 },
  'CPU credits below 12 for three samples: about six full-CPU minutes on a two-vCPU host. Inspect workload; keep Standard mode.');
  alarm('SesDelivery', 'ses-delivery', { ComparisonOperator: 'GreaterThanThreshold', Threshold: 0,
    EvaluationPeriods: 1, DatapointsToAlarm: 1, TreatMissingData: 'notBreaching', Metrics: [
      ...['Bounce', 'Reject', 'Complaint'].map((name, i) => ({ Id: `m${i}`, ReturnData: false,
        MetricStat: { Metric: { Namespace: 'AWS/SES', MetricName: name }, Period: 300, Stat: 'Sum' } })),
      { Id: 'events', Expression: 'FILL(m0,0)+FILL(m1,0)+FILL(m2,0)', Label: 'SES delivery failures', ReturnData: true },
    ] }, 'SES bounce, rejection or complaint observed (account-wide). Inspect SES/suppression; alerts use SNS independently of SES.');
  return { AWSTemplateFormatVersion: '2010-09-09', Description: 'Bounded Vinnot production monitoring; no network/runtime/data changes',
    Parameters: {
      OperatorEmail: { Type: 'String', AllowedPattern: '[^\\s@]+@[^\\s@]+\\.[^\\s@]+', Description: 'Approved recipient; must confirm SNS subscription' },
      ProductionInstanceId: { Type: 'String', AllowedValues: ['i-06bff053f7584c6c2'], Default: 'i-06bff053f7584c6c2' },
      AcceptanceMode: { Type: 'String', AllowedValues: ['private', 'public'], Default: 'public', Description: 'public matches the launched site; private only while the site is deliberately closed to the public' },
    }, Resources: resources, Outputs: { TopicArn: { Value: ref('Notifications') }, ProbeName: { Value: ref('Probe') } } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/build-monitoring-stack.mjs <output.json>');
  writeFileSync(process.argv[2], JSON.stringify(monitoringStack(), null, 2) + '\n', { mode: 0o600 });
  console.log(`Monitoring template written to ${fileURLToPath(pathToFileURL(process.argv[2]))}`);
}
