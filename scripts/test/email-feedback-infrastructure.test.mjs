import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const template = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/email-feedback-stack.json', import.meta.url)));
const resources = template.Resources;
const sub = value => value['Fn::Sub'];

test('the configuration set publishes only bounces and complaints, and suppresses them itself', () => {
  assert.deepEqual(template.Parameters.Environment.AllowedValues, ['dev', 'prod']);
  assert.equal(sub(resources.ConfigurationSet.Properties.Name), 'vinnot-${Environment}');
  assert.deepEqual(resources.ConfigurationSet.Properties.SuppressionOptions.SuppressedReasons, ['BOUNCE', 'COMPLAINT']);
  const destination = resources.FeedbackEvents.Properties.EventDestination;
  assert.deepEqual(destination.MatchingEventTypes, ['bounce', 'complaint']);
  assert.deepEqual(destination.SnsDestination.TopicARN, { Ref: 'FeedbackTopic' });
});

test('only this configuration set publishes, only the topic sends, and raw events reach the queue', () => {
  const publish = resources.FeedbackTopicPolicy.Properties.PolicyDocument.Statement;
  assert.equal(publish.length, 1);
  assert.equal(publish[0].Principal.Service, 'ses.amazonaws.com');
  assert.match(sub(publish[0].Condition.ArnLike['aws:SourceArn']), /configuration-set\/vinnot-\$\{Environment\}$/);
  const send = resources.FeedbackQueuePolicy.Properties.PolicyDocument.Statement;
  assert.equal(send.length, 1);
  assert.equal(send[0].Action, 'sqs:SendMessage');
  assert.deepEqual(send[0].Condition.ArnEquals['aws:SourceArn'], { Ref: 'FeedbackTopic' });
  assert.equal(resources.FeedbackSubscription.Properties.RawMessageDelivery, true);
});

test('unreadable feedback is kept in an encrypted dead-letter queue that raises an alarm', () => {
  const queue = resources.FeedbackQueue.Properties;
  assert.equal(queue.RedrivePolicy.maxReceiveCount, 5);
  assert.deepEqual(queue.RedrivePolicy.deadLetterTargetArn, { 'Fn::GetAtt': ['DeadLetterQueue', 'Arn'] });
  assert.ok(queue.VisibilityTimeout > 15, 'longer than one poll');
  for (const name of ['FeedbackQueue', 'DeadLetterQueue']) {
    assert.equal(resources[name].Properties.SqsManagedSseEnabled, true, name);
    assert.equal(resources[name].Properties.MessageRetentionPeriod, 1209600, name);
  }
  const alarm = resources.DeadLetterAlarm.Properties;
  assert.equal(alarm.Threshold, 0);
  assert.equal(alarm.ComparisonOperator, 'GreaterThanThreshold');
});

test('the host may only read this queue and send through this configuration set', () => {
  const policy = resources.HostFeedbackPolicy.Properties;
  assert.deepEqual(policy.Roles, [{ 'Fn::Sub': 'vinnot-${Environment}-low-cost-host-role' }]);
  const [read, sendMail] = policy.PolicyDocument.Statement;
  assert.deepEqual(read.Action, ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes']);
  assert.deepEqual(read.Resource, { 'Fn::GetAtt': ['FeedbackQueue', 'Arn'] });
  assert.equal(sendMail.Action, 'ses:SendEmail');
  assert.match(sub(sendMail.Resource), /:configuration-set\/\$\{ConfigurationSet\}$/);
  assert.doesNotMatch(JSON.stringify(policy), /"\*"/);
});
