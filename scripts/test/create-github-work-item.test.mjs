import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const scriptPath = fileURLToPath(new URL("../create-github-work-item.mjs", import.meta.url));

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function runScript(environment, workingDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: workingDirectory,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

async function assertWorkItemWorkflow(context, workingDirectory) {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    const body = await readJson(request);
    requests.push({ method: request.method, url: request.url, body });
    response.setHeader("Content-Type", "application/json");

    if (request.method === "GET" && request.url === "/repos/owner/repo") {
      response.end(JSON.stringify({ node_id: "R_repo" }));
      return;
    }
    if (
      request.method === "GET" &&
      request.url === "/repos/owner/repo/git/ref/heads/development"
    ) {
      response.end(JSON.stringify({ object: { sha: "abc123" } }));
      return;
    }
    if (request.method === "POST" && request.url === "/repos/owner/repo/issues") {
      response.statusCode = 201;
      response.end(
        JSON.stringify({
          number: 101,
          node_id: "I_issue",
          title: body.title,
          html_url: "https://github.test/owner/repo/issues/101",
          state: "open",
          labels: [{ name: "priority:normal" }],
        }),
      );
      return;
    }
    if (request.method === "GET" && request.url === "/repos/owner/repo/labels/type%3Afeature") {
      response.statusCode = 404;
      response.end(JSON.stringify({ message: "Not Found" }));
      return;
    }
    if (request.method === "POST" && request.url === "/repos/owner/repo/labels") {
      response.statusCode = 201;
      response.end(JSON.stringify({ name: body.name }));
      return;
    }
    if (request.method === "PATCH" && request.url === "/repos/owner/repo/issues/101") {
      response.end(JSON.stringify({ labels: body.labels }));
      return;
    }
    if (request.method === "POST" && request.url === "/graphql") {
      const branchName = body.variables.branchName;
      response.end(
        JSON.stringify({
          data: {
            createLinkedBranch: {
              linkedBranch: { id: "LB_branch", ref: { name: branchName } },
            },
          },
        }),
      );
      return;
    }

    response.statusCode = 500;
    response.end(JSON.stringify({ message: `Unexpected ${request.method} ${request.url}` }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vinnot-work-item-"));
  context.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const outputFile = path.join(temporaryDirectory, "output.txt");
  const summaryFile = path.join(temporaryDirectory, "summary.md");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await runScript({
    GITHUB_TOKEN: "test-token",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_API_URL: baseUrl,
    GITHUB_GRAPHQL_URL: `${baseUrl}/graphql`,
    GITHUB_SERVER_URL: "https://github.test",
    GITHUB_OUTPUT: outputFile,
    GITHUB_STEP_SUMMARY: summaryFile,
    WORK_TYPE: "feature",
    ISSUE_NUMBER: "",
    WORK_TITLE: "Lógica de pagos del negocio",
    WORK_DESCRIPTION: "Permitir pagos idempotentes.",
    WORK_START_DATE: "",
    WORK_END_DATE: "",
    PROJECT_TOKEN: "",
  }, workingDirectory ?? temporaryDirectory);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Created feature\/101-logica-de-pagos-del-negocio/);
  assert.match(fs.readFileSync(outputFile, "utf8"), /branch_name=feature\/101-logica-de-pagos-del-negocio/);
  assert.match(fs.readFileSync(summaryFile, "utf8"), /Issue: \[#101\]/);

  const labelPatch = requests.find(
    (request) => request.method === "PATCH" && request.url.endsWith("/issues/101"),
  );
  assert.deepEqual(labelPatch.body.labels, ["priority:normal", "type:feature"]);

  const linkedBranch = requests.find((request) => request.url === "/graphql");
  assert.equal(linkedBranch.body.variables.issueId, "I_issue");
  assert.equal(linkedBranch.body.variables.repositoryId, "R_repo");
  assert.equal(linkedBranch.body.variables.baseOid, "abc123");
  assert.equal(
    linkedBranch.body.variables.branchName,
    "feature/101-logica-de-pagos-del-negocio",
  );
}

for (const [location, workingDirectory] of [
  ["repository root", repositoryRoot],
  ["mobile directory", path.join(repositoryRoot, "frontend-mobile")],
  ["web directory", path.join(repositoryRoot, "frontend-react")],
  ["unrelated temporary directory", null],
]) {
  test(`workflow client creates an issue, preserves labels, and links a branch from ${location}`,
    (context) => assertWorkItemWorkflow(context, workingDirectory));
}
