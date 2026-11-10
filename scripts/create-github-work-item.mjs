import fs from "node:fs";
import { GitHubProjectSchedule, parseSchedule, projectConfiguration } from "./github-project-schedule.mjs";
import {
  buildBranchName,
  getWorkTypeConfig,
  parseIssueNumber,
} from "./github-work-item-policy.mjs";

class GitHubApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.response = response;
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  const rawBody = await response.text();
  const body = rawBody ? JSON.parse(rawBody) : null;
  if (!response.ok) {
    const detail = body?.message ?? rawBody ?? response.statusText;
    throw new GitHubApiError(`GitHub API ${response.status}: ${detail}`, response.status, body);
  }
  return body;
}

function issueBody(workType, baseBranch, description) {
  const objective = description.trim() || "Completar alcance y criterios de aceptación.";
  return [
    "## Objetivo",
    "",
    objective,
    "",
    "## Clasificación",
    "",
    `- Tipo de trabajo: \`${workType}\``,
    `- Rama base: \`${baseBranch}\``,
    "",
    "> La rama de trabajo se crea y vincula automáticamente desde GitHub Actions.",
  ].join("\n");
}

async function loadOrCreateIssue({ apiUrl, repository, token, issueNumber, title, description, workType, baseBranch }) {
  if (issueNumber !== null) {
    const issue = await requestJson(`${apiUrl}/repos/${repository}/issues/${issueNumber}`, token);
    if (issue.pull_request) {
      throw new Error(`#${issueNumber} is a pull request, not an issue.`);
    }
    if (issue.state !== "open") {
      throw new Error(`#${issueNumber} is not open.`);
    }
    return issue;
  }

  if (!title) {
    throw new Error("Title is required when a new issue must be created.");
  }
  return requestJson(`${apiUrl}/repos/${repository}/issues`, token, {
    method: "POST",
    body: JSON.stringify({
      title,
      body: issueBody(workType, baseBranch, description),
    }),
  });
}

async function ensureTypeLabel({ apiUrl, repository, token, config, issue }) {
  const labelUrl = `${apiUrl}/repos/${repository}/labels/${encodeURIComponent(config.label)}`;
  try {
    await requestJson(labelUrl, token);
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 404) {
      throw error;
    }
    try {
      await requestJson(`${apiUrl}/repos/${repository}/labels`, token, {
        method: "POST",
        body: JSON.stringify({
          name: config.label,
          color: config.color,
          description: config.description,
        }),
      });
    } catch (createError) {
      // A concurrent run may have created the same label after the 404.
      if (!(createError instanceof GitHubApiError) || createError.status !== 422) {
        throw createError;
      }
    }
  }

  const currentLabels = issue.labels
    .map((label) => (typeof label === "string" ? label : label.name))
    .filter(Boolean);
  const conflictingType = currentLabels.find(
    (label) => label.startsWith("type:") && label !== config.label,
  );
  if (conflictingType) {
    throw new Error(
      `Issue #${issue.number} already has conflicting label '${conflictingType}'.`,
    );
  }
  if (!currentLabels.includes(config.label)) {
    await requestJson(`${apiUrl}/repos/${repository}/issues/${issue.number}`, token, {
      method: "PATCH",
      body: JSON.stringify({ labels: [...currentLabels, config.label] }),
    });
  }
}

async function createLinkedBranch({ graphqlUrl, token, issueId, repositoryId, baseOid, branchName }) {
  const query = `
    mutation CreateLinkedBranch(
      $issueId: ID!
      $repositoryId: ID!
      $baseOid: GitObjectID!
      $branchName: String!
    ) {
      createLinkedBranch(input: {
        issueId: $issueId
        repositoryId: $repositoryId
        oid: $baseOid
        name: $branchName
      }) {
        linkedBranch {
          id
          ref { name }
        }
      }
    }
  `;
  const response = await requestJson(graphqlUrl, token, {
    method: "POST",
    body: JSON.stringify({
      query,
      variables: { issueId, repositoryId, baseOid, branchName },
    }),
  });
  if (response.errors?.length) {
    throw new Error(`GitHub GraphQL: ${response.errors.map((error) => error.message).join("; ")}`);
  }
  const createdName = response.data?.createLinkedBranch?.linkedBranch?.ref?.name;
  if (createdName !== branchName) {
    throw new Error("GitHub did not return the expected linked branch.");
  }
}

function writeOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`, "utf8");
  }
}

function writeSummary(lines) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, `${lines.join("\n")}\n`, "utf8");
  }
}

async function main() {
  const token = requiredEnvironment("GITHUB_TOKEN");
  const repository = requiredEnvironment("GITHUB_REPOSITORY");
  const apiUrl = process.env.GITHUB_API_URL?.trim() || "https://api.github.com";
  const graphqlUrl = process.env.GITHUB_GRAPHQL_URL?.trim() || "https://api.github.com/graphql";
  const serverUrl = process.env.GITHUB_SERVER_URL?.trim() || "https://github.com";
  const config = getWorkTypeConfig(requiredEnvironment("WORK_TYPE"));
  const requestedIssueNumber = parseIssueNumber(process.env.ISSUE_NUMBER);
  const title = process.env.WORK_TITLE?.trim() || "";
  const description = process.env.WORK_DESCRIPTION?.trim() || "";
  const schedule = parseSchedule(process.env.WORK_START_DATE, process.env.WORK_END_DATE);
  const projectClient = schedule ? new GitHubProjectSchedule({
    url: graphqlUrl,
    configuration: projectConfiguration(process.env),
  }) : null;
  const project = projectClient ? await projectClient.prepare() : null;

  const repositoryData = await requestJson(`${apiUrl}/repos/${repository}`, token);
  const baseRef = await requestJson(
    `${apiUrl}/repos/${repository}/git/ref/heads/${encodeURIComponent(config.baseBranch)}`,
    token,
  );
  const issue = await loadOrCreateIssue({
    apiUrl,
    repository,
    token,
    issueNumber: requestedIssueNumber,
    title,
    description,
    workType: config.type,
    baseBranch: config.baseBranch,
  });

  // Preserve the issue identity before subsequent writes so failures can be retried safely.
  writeOutput("issue_number", issue.number);
  writeOutput("issue_url", issue.html_url);
  if (schedule) {
    console.log("Scheduling issue #" + issue.number + ". If this run fails, retry with issue_number=" + issue.number + ".");
    writeSummary([
      "## Roadmap scheduling",
      "",
      "- Issue: [#" + issue.number + "](" + issue.html_url + ")",
      "- On failure, reuse this issue number and check whether the linked branch was already created before retrying.",
    ]);
  }
  const branchName = buildBranchName(config.type, issue.number, issue.title);
  await ensureTypeLabel({ apiUrl, repository, token, config, issue });
  if (schedule) {
    await projectClient.apply(project, issue.node_id, schedule);
    writeOutput("project_url", project.url);
    writeOutput("start_date", schedule.startDate);
    writeOutput("end_date", schedule.endDate);
  }
  await createLinkedBranch({
    graphqlUrl,
    token,
    issueId: issue.node_id,
    repositoryId: repositoryData.node_id,
    baseOid: baseRef.object.sha,
    branchName,
  });

  const branchUrl = `${serverUrl}/${repository}/tree/${branchName}`;
  writeOutput("branch_name", branchName);
  writeOutput("branch_url", branchUrl);
  writeOutput("base_branch", config.baseBranch);
  writeSummary([
    "## Work branch created",
    "",
    `- Issue: [#${issue.number}](${issue.html_url})`,
    `- Branch: [\`${branchName}\`](${branchUrl})`,
    `- Base: \`${config.baseBranch}\``,
    `- Type: \`${config.type}\``,
    ...(schedule ? [
      "- Project: " + project.url,
      "- Start date: " + schedule.startDate,
      "- Planned end date: " + schedule.endDate,
    ] : []),
  ]);
  console.log(`Created ${branchName} from ${config.baseBranch} and linked it to #${issue.number}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
