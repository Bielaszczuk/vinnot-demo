import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const digest = `497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend@sha256:${'a'.repeat(64)}`;
const production = {
  PROD_BACKEND_IMAGE: digest, PROD_GOOGLE_OAUTH_AUDIENCES: 'production-client.apps.googleusercontent.com',
  PROD_APPLE_TEAM_ID: 'production-team', PROD_APPLE_KEY_ID: 'production-key',
  PROD_AI_MONTHLY_LIMIT_USD: '8',
};

function render({ prod = false, dataOnly = false, missing, migration = true } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-compose-policy-'));
  try {
    for (const name of ['docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml', 'compose.production-data.yml', 'Caddyfile']) {
      cpSync(new URL(`../../infra/aws-low-cost/${name}`, import.meta.url), join(directory, name));
    }
    mkdirSync(join(directory, 'secrets'));
    writeFileSync(join(directory, 'secrets/postgres-bootstrap-password'), 'bootstrap-test-only');
    writeFileSync(join(directory, 'runtime.env'), [
      'DB_PASSWORD=runtime-test-only', 'JWT_SECRET=test-only',
      'FACEBOOK_APP_ID=unexpected-app', 'FACEBOOK_APP_SECRET=unexpected-secret',
      'EVENT_PAYMENTS_REDIRECT_URI=https://dev.vinnot.com/partner/payments/callback',
      'EVENT_PAYMENTS_CHECKOUT_RETURN_URI=https://dev.vinnot.com/payments/return',
      'EVENT_PAYMENTS_NOTIFICATION_URI=https://api-dev.vinnot.com/api/payments/mercadopago/webhooks',
    ].join('\n') + '\n');
    if (migration) writeFileSync(join(directory, 'migration.env'), 'VINNOT_MIGRATION_DB_PASSWORD=migration-test-only\n');
    const env = { ...process.env, DB_PASSWORD: 'runtime-test-only', ...production };
    // This test cannot inherit an operator's Compose selection or secret file.
    for (const key of ['COMPOSE_FILE', 'COMPOSE_ENV_FILES', 'COMPOSE_PROJECT_NAME']) delete env[key];
    if (missing) delete env[missing];
    if (dataOnly) for (const key of ['DB_PASSWORD', ...Object.keys(production)]) delete env[key];
    const args = ['compose', '--project-directory', directory, '-f', join(directory, dataOnly ? 'compose.production-data.yml' : 'docker-compose.yml')];
    if (prod) args.push('-f', join(directory, 'compose.production.yml'), '--profile', 'migration');
    const result = spawnSync('docker', [...args, 'config', '--format', 'json'], { encoding: 'utf8', env });
    return { ...result, config: result.status === 0 ? JSON.parse(result.stdout) : undefined };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('production data provisioning requires no backend, runtime, or social credentials', () => {
  const { status, config, stderr } = render({ dataOnly: true });
  assert.equal(status, 0, stderr);
  assert.deepEqual(Object.keys(config.services), ['postgres']);
  assert.equal(config.services.postgres.environment.POSTGRES_PASSWORD, undefined);
  assert.equal(config.services.postgres.environment.POSTGRES_USER, 'vinnot_prod_bootstrap');
  assert.equal(config.volumes.postgres_data.name, 'vinnot-production_postgres_data');
  assert.equal(config.services.postgres.ports, undefined);
  assert.deepEqual(config.services.postgres.command, render().config.services.postgres.command);
});

test('development keeps its current database, network, migration behavior and frontend', () => {
  const { status, config, stderr } = render();
  assert.equal(status, 0, stderr);
  assert.equal(config.name, 'vinnot-low-cost');
  assert.equal(config.services.postgres.environment.POSTGRES_DB, 'vinnot');
  assert.equal(config.services.postgres.environment.POSTGRES_PASSWORD, 'runtime-test-only');
  assert.equal(config.services.backend.environment.DB_USERNAME, 'vinnot_admin');
  assert.equal(config.services.backend.environment.SPRING_FLYWAY_ENABLED, undefined);
  assert.equal(config.services.backend.environment.APP_AUTH_FRONTEND_BASE_URL, 'https://dev.vinnot.com');
  assert.equal(config.services.backend.environment.APP_PUBLIC_API_BASE_URL, 'https://api-dev.vinnot.com/api');
  assert.deepEqual(config.services.backend.environment.CORS_ALLOWED_ORIGINS.split(','),
    ['https://api-dev.vinnot.com', 'https://dev.vinnot.com', 'http://localhost:5173']);
  assert.doesNotMatch(config.services.backend.environment.CORS_ALLOWED_ORIGINS, /pages\.dev/);
  assert.equal(config.services.backend.environment.EMAIL_SES_CONFIGURATION_SET, 'vinnot-dev');
  assert.match(config.services.backend.environment.EMAIL_FEEDBACK_QUEUE_URL, /\/vinnot-dev-email-feedback$/);
  assert.equal(config.services.backend.environment.PUSH_PROVIDER, undefined);
  assert.equal(config.networks.runtime.name, 'vinnot-low-cost-runtime');
  assert.equal(config.services.migrate, undefined);
});

test('production separates credentials, names, storage, callbacks and the migration process', () => {
  const { status, config, stderr } = render({ prod: true });
  assert.equal(status, 0, stderr);
  const { backend, postgres, migrate, proxy } = config.services;
  assert.equal(config.name, 'vinnot-production');
  assert.equal(config.networks.runtime.name, 'vinnot-production-runtime');
  assert.equal(config.volumes.postgres_data.name, 'vinnot-production_postgres_data');
  assert.equal(postgres.environment.POSTGRES_DB, 'vinnot_prod');
  assert.equal(postgres.environment.POSTGRES_PASSWORD, undefined);
  assert.equal(postgres.environment.POSTGRES_PASSWORD_FILE, '/run/secrets/postgres-bootstrap-password');
  assert.match(postgres.healthcheck.test[1], /-h 127\.0\.0\.1/);
  assert.equal(backend.environment.DB_PASSWORD, 'runtime-test-only');
  assert.equal(backend.environment.DB_USERNAME, 'vinnot_prod_runtime');
  assert.equal(backend.environment.SPRING_FLYWAY_ENABLED, 'false');
  assert.equal(backend.environment.FACEBOOK_APP_ID, '');
  assert.equal(backend.environment.FACEBOOK_APP_SECRET, '');
  assert.equal(backend.environment.APP_STORAGE_S3_BUCKET, 'vinnot-prod-uploads-497675597655');
  assert.equal(backend.image, digest);
  assert.equal(migrate.image, digest);
  assert.equal(migrate.environment.VINNOT_MIGRATION_DB_PASSWORD, 'migration-test-only');
  assert.equal(backend.environment.VINNOT_MIGRATION_DB_PASSWORD, undefined);
  assert.equal(migrate.environment.DB_PASSWORD, undefined);
  assert.equal(migrate.environment.JWT_SECRET, undefined);
  assert.equal(migrate.restart, 'no');
  assert.equal(migrate.entrypoint.at(-1), 'org.springframework.boot.loader.launch.PropertiesLauncher');
  assert.equal(backend.ports, undefined);
  assert.equal(postgres.ports, undefined);
  assert.equal(migrate.ports, undefined);
  assert.equal(proxy.environment.VINNOT_API_HOST, 'api.vinnot.com');
  assert.equal(backend.environment.EVENT_PAYMENTS_REDIRECT_URI, 'https://vinnot.com/partner/payments/callback');
  assert.equal(backend.environment.EVENT_PAYMENTS_CHECKOUT_RETURN_URI, 'https://vinnot.com/payments/return');
  assert.equal(backend.environment.EVENT_PAYMENTS_NOTIFICATION_URI, 'https://api.vinnot.com/api/payments/mercadopago/webhooks');
  assert.equal(backend.environment.APP_PUBLIC_API_BASE_URL, 'https://api.vinnot.com/api');
  assert.equal(backend.environment.EMAIL_SES_CONFIGURATION_SET, 'vinnot-prod');
  assert.equal(backend.environment.PUSH_PROVIDER, 'expo');
  assert.equal(backend.environment.EMAIL_FEEDBACK_QUEUE_URL,
    'https://sqs.us-east-1.amazonaws.com/497675597655/vinnot-prod-email-feedback');
  for (const key of ['APP_AUTH_FRONTEND_BASE_URL', 'CORS_ALLOWED_ORIGINS', 'APPLE_REDIRECT_URIS',
    'APPLE_OAUTH_AUDIENCES', 'GOOGLE_OAUTH_AUDIENCES', 'SPRING_DATASOURCE_URL',
    'EVENT_PAYMENTS_REDIRECT_URI', 'EVENT_PAYMENTS_CHECKOUT_RETURN_URI', 'EVENT_PAYMENTS_NOTIFICATION_URI',
    'APP_PUBLIC_API_BASE_URL']) {
    assert.doesNotMatch(backend.environment[key], /api-dev|dev\.vinnot|\.app\.dev|localhost/);
  }
});

for (const missing of Object.keys(production)) {
  test(`production refuses missing explicit ${missing}`, () => {
    const result = render({ prod: true, missing });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(missing));
  });
}

test('normal rendering remains possible after the ephemeral migration credentials are removed', () => {
  const result = render({ prod: true, migration: false });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.config.services.migrate.environment.VINNOT_MIGRATION_DB_PASSWORD, undefined);
});
