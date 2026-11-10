import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { imageRepository, validateManifest, digestPattern, hostPreparationOf, describeHostPreparation, releaseGuide } from './release-contract.mjs';
import { verifyProductionContext, verifyRun } from './verify-production-release.mjs';
import { publishWebRelease } from './publish-web-release.mjs';
import { publicationComponents } from './production-component-plan.mjs';
import { pathToFileURL } from 'node:url';

export async function publishProductionRelease({ env = process.env,
  aws = args => execFileSync('aws', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024,
    env: args[1] === 'send-command' ? { ...process.env, AWS_MAX_ATTEMPTS: '1' } : process.env }),
  docker = (args, options) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024, ...options }),
  verifyContext = verifyProductionContext, verifyWorkflow = verifyRun, fetcher = fetch,
  publishWeb = publishWebRelease, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  await verifyContext(env);
  const manifest = validateManifest(JSON.parse(readFileSync('release/manifest.json')), 'release');
  if (String(manifest.candidateRunId) !== env.CANDIDATE_RUN_ID) throw new Error('Candidate run identity mismatch');
  if (!['publish', 'rollback'].includes(env.RELEASE_ACTION)) throw new Error('Unknown publication action');
  if (env.RELEASE_ACTION === 'publish' && manifest.revision !== env.APPROVED_SHA) throw new Error('Publish requires the current approved revision');
  await verifyWorkflow({ runId: manifest.candidateRunId, revision: manifest.revision, kind: 'candidate', token: env.GH_TOKEN });
  await verifyWorkflow({ runId: manifest.ciRunId, revision: manifest.revision, kind: 'ci', token: env.GH_TOKEN });
  const preparation = hostPreparationOf(manifest, 'release');
  const components = await publicationComponents(manifest, env.RELEASE_ACTION, fetcher);
  // A host that still lacks the candidate's migrations or runtime files would refuse the deploy:
  // stop before SSM and web, unless the operator confirms the host was prepared.
  const awaitingHost = env.RELEASE_ACTION === 'publish' && components.backend.changed && preparation?.required === true
    && env.HOST_PREPARED !== 'true';
  if (preparation?.required && env.RELEASE_ACTION === 'publish') console.log(describeHostPreparation(preparation).join('\n'));
  if (env.RELEASE_VALIDATE_ONLY === 'true') {
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, Object.entries(components).map(([name, value]) => `${name}=${value.changed}\n`).join('')
      + `host_preparation=${awaitingHost ? 'pending' : 'ready'}\n`);
    return { components, validated: true };
  }
  if (!components.backend.changed && !components.web.changed) {
    const result = { revision: manifest.revision, components, status: 'unchanged' };
    writeFileSync('deployment-result.json', JSON.stringify(result, null, 2));
    return result;
  }
  if (JSON.parse(aws(['sts', 'get-caller-identity'])).Account !== '497675597655') throw new Error('Wrong AWS account');
  let image = null, commandId = null;
  if (components.backend.changed) {
    const backendRevision = components.backend.revision;
    const tag = `release-${manifest.revision}-${manifest.candidateRunId}`;
    const reference = `${imageRepository}:${tag}`;
    docker(['load', '--input', 'release/backend.tar']);
    const loaded = JSON.parse(docker(['image', 'inspect', `vinnot-candidate:${backendRevision}`]))[0];
    if (loaded.Id !== manifest.imageId || loaded.Config.Labels?.['org.opencontainers.image.revision'] !== backendRevision) throw new Error('Loaded image identity mismatch');
    docker(['login', '--username', 'AWS', '--password-stdin', imageRepository.split('/')[0]], { input: aws(['ecr', 'get-login-password', '--region', 'us-east-1']) });
    const findImage = () => {
      try { return JSON.parse(aws(['ecr', 'describe-images', '--repository-name', 'vinnot-backend-prod', '--image-ids', `imageTag=${tag}`, '--region', 'us-east-1'])).imageDetails[0].imageDigest; }
      catch (error) {
        if (String(error.stderr).includes('ImageNotFoundException')) return null;
        throw error;
      }
    };
    let digest = findImage();
    if (!digest) {
      docker(['tag', loaded.Id, reference]);
      docker(['push', reference]);
      digest = findImage();
    }
    if (!digestPattern.test(digest ?? '')) throw new Error('Invalid registry digest');
    image = `${imageRepository}@${digest}`;
    docker(['pull', image]);
    if (JSON.parse(docker(['image', 'inspect', image]))[0].Id !== manifest.imageId) throw new Error('Registry artifact differs from approved image');
    if (awaitingHost) return stopForHostPreparation({ env, manifest, components, preparation, image });
    // Recheck after upload: a concurrent main update must not reach the host.
    await verifyContext(env);
    const parameters = {
      Operation: [env.RELEASE_ACTION === 'rollback' ? 'rollback' : 'deploy'], Image: [image], Revision: [backendRevision],
      RuntimeHash: [manifest.runtimeHash], Schema: [Buffer.from(JSON.stringify(manifest.migrations)).toString('base64')],
    };
    const command = JSON.parse(aws(['ssm', 'send-command', '--region', 'us-east-1', '--document-name', 'Vinnot-ProductionRelease',
      '--instance-ids', 'i-06bff053f7584c6c2', '--parameters', JSON.stringify(parameters), '--output', 'json']));
    commandId = command.Command.CommandId;
    writeFileSync('deployment-result.json', JSON.stringify({ revision: manifest.revision, image, commandId, status: 'pending' }));
    let complete = false;
    for (let attempt = 0; attempt < 250; attempt++) {
      let result;
      try { result = JSON.parse(aws(['ssm', 'get-command-invocation', '--region', 'us-east-1', '--command-id', commandId, '--instance-id', 'i-06bff053f7584c6c2'])); }
      catch (error) {
        if (!String(error.stderr).includes('InvocationDoesNotExist')) throw error;
      }
      if (result?.Status === 'Success') { complete = true; break; }
      if (['Failed', 'Cancelled', 'TimedOut', 'Cancelling'].includes(result?.Status)) throw new Error(`Host deployment ${result.Status}; inspect command ${commandId}`);
      await sleep(10000);
    }
    if (!complete) throw new Error(`Host operation still unresolved: ${commandId}; inspect before retrying`);
  }
  // Recheck the untouched component after the host finishes and before switching web.
  await verifyContext(env);
  await publicationComponents(manifest, env.RELEASE_ACTION, fetcher);
  const web = components.web.changed ? publishWeb({ directory: 'release/web', revision: components.web.revision, environment: 'production', aws }) : null;
  const result = { revision: manifest.revision, components, image, commandId, web, status: 'published-private-acceptance-pending' };
  writeFileSync('deployment-result.json', JSON.stringify(result, null, 2));
  console.log('Changed components published; unchanged components preserved.');
  return result;
}

/** Expected stop: the image is staged for the migration window and production is untouched. */
function stopForHostPreparation({ env, manifest, components, preparation, image }) {
  const result = { revision: manifest.revision, components, image, requirements: describeHostPreparation(preparation),
    status: 'host-preparation-required' };
  writeFileSync('deployment-result.json', JSON.stringify(result, null, 2));
  const summary = ['## Production publish stopped before the host: preparation required', '',
    ...result.requirements.map(line => `- ${line}`), '',
    `Image staged in the registry: \`${image}\``, '',
    'Nothing changed in production: no SSM command was sent and web was not switched.', '',
    `Next: follow ${releaseGuide} (migrate-production.sh with this image and/or install the runtime files), `
      + `then dispatch publish again with candidate_run_id=${manifest.candidateRunId} and host_prepared=true.`, ''].join('\n');
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await publishProductionRelease();
