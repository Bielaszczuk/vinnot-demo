import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("../create-github-work-item.mjs", import.meta.url));

async function runFlow(context, options = {}) {
  const calls = [];
  const issue = { number: 101, node_id: "I_101", title: "Scheduled work",
    html_url: "https://github.test/owner/repo/issues/101", state: "open",
    labels: [{ name: "type:task" }] };
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    calls.push({ url: request.url, method: request.method, token: request.headers.authorization, body });
    let result;
    if (request.url === "/graphql") {
      if (body.query.includes("query WorkProject")) {
        result = { data: { user: { projectV2: { id: "P_3", url: "https://github.test/projects/3",
          viewerCanUpdate: !options.denied,
          fields: { nodes: [
            { id: "F_start", name: "Start date", dataType: "DATE" },
            { id: "F_end", name: "Target date", dataType: "DATE" },
          ], pageInfo: { hasNextPage: false, endCursor: null } } } } } };
      } else if (body.query.includes("mutation ScheduleWorkItem")) {
        result = { data: { addProjectV2ItemById: { item: { id: "PI_101" } } } };
      } else if (body.query.includes("mutation SetWorkDates")) {
        result = options.updateFailure ? { errors: [{ message: "Update failed" }] } : {
          data: { start: { projectV2Item: { id: "PI_101" } }, end: { projectV2Item: { id: "PI_101" } } },
        };
      } else if (body.query.includes("mutation CreateLinkedBranch")) {
        result = { data: { createLinkedBranch: { linkedBranch: {
          ref: { name: body.variables.branchName },
        } } } };
      }
    } else if (request.url === "/repos/owner/repo") result = { node_id: "R_repo" };
    else if (request.url === "/repos/owner/repo/git/ref/heads/development") result = { object: { sha: "base" } };
    else if (request.url === "/repos/owner/repo/issues" || request.url === "/repos/owner/repo/issues/101") result = issue;
    else if (request.url === "/repos/owner/repo/labels/type%3Atask") result = { name: "type:task" };
    response.setHeader("Content-Type", "application/json");
    response.statusCode = result ? 200 : 500;
    response.end(JSON.stringify(result ?? { message: "Unexpected request" }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const url = "http://127.0.0.1:" + server.address().port;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: options.workingDirectory,
      env: { ...process.env, GITHUB_TOKEN: "repo-token", PROJECT_TOKEN: "project-token",
        GITHUB_REPOSITORY: "owner/repo", GITHUB_API_URL: url, GITHUB_GRAPHQL_URL: url + "/graphql",
        GITHUB_SERVER_URL: "https://github.test", GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "",
        WORK_TYPE: "task", ISSUE_NUMBER: options.existing ? "101" : "",
        WORK_TITLE: "Scheduled work", WORK_DESCRIPTION: "Schedule",
        WORK_START_DATE: "2026-09-16", WORK_END_DATE: "2026-09-23",
        PROJECT_OWNER: "owner", PROJECT_NUMBER: "3",
        PROJECT_START_FIELD: "Start date", PROJECT_END_FIELD: "Target date",
        ...options.environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("close", code => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
  return { ...result, calls };
}

for (const existing of [false, true]) test("full scheduled workflow with " + (existing ? "existing" : "new") + " issue", async context => {
  const result = await runFlow(context, { existing });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Created task\/101-scheduled-work/);
  assert.ok(result.calls[0].body.query.includes("query WorkProject"));
  assert.equal(result.calls.filter(c => c.method === "POST" && c.url.endsWith("/issues")).length, existing ? 0 : 1);
  const dateIndex = result.calls.findIndex(c => c.body?.query?.includes("mutation SetWorkDates"));
  const branchIndex = result.calls.findIndex(c => c.body?.query?.includes("mutation CreateLinkedBranch"));
  assert.ok(dateIndex < branchIndex);
  assert.equal(result.calls[dateIndex].body.variables.startDate, "2026-09-16");
  assert.equal(result.calls[dateIndex].body.variables.endDate, "2026-09-23");
  assert.equal(result.calls[dateIndex].token, "Bearer project-token");
  assert.equal(result.calls[branchIndex].token, "Bearer repo-token");
  assert.ok(result.calls.filter(c => c.url !== "/graphql").every(c => c.token === "Bearer repo-token"));
});
for (const directory of ["frontend-mobile", "frontend-react"]) {
  test(`scheduled workflow resolves its script from ${directory}`, async context => {
    const result = await runFlow(context, {
      existing: true,
      workingDirectory: fileURLToPath(new URL(`../../${directory}/`, import.meta.url)),
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Created task\/101-scheduled-work/);
  });
}

test("invalid dates and missing secret fail before any network operation", async context => {
  for (const environment of [{ WORK_END_DATE: "2026-02-30" }, { PROJECT_TOKEN: "" }]) {
    const result = await runFlow(context, { environment });
    assert.equal(result.code, 1);
    assert.equal(result.calls.length, 0);
  }
});
test("denied project fails before creating issues or branches", async context => {
  const result = await runFlow(context, { denied: true });
  assert.equal(result.code, 1);
  assert.equal(result.calls.length, 1);
  assert.match(result.stderr, /write access/);
});
test("failed date mutation exposes recovery issue and does not create a branch", async context => {
  const result = await runFlow(context, { updateFailure: true });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /issue_number=101/);
  assert.match(result.stderr, /Update failed/);
  assert.ok(!result.calls.some(c => c.body?.query?.includes("mutation CreateLinkedBranch")));
});
