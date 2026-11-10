import assert from "node:assert/strict";
import test from "node:test";
import { GitHubProjectSchedule, parseSchedule, projectConfiguration } from "../github-project-schedule.mjs";

const configuration = { token: "project-test-token", owner: "owner", number: 3,
  startField: "Start date", endField: "Target date" };
const fields = [
  { id: "F_start", name: "Start date", dataType: "DATE" },
  { id: "F_end", name: "Target date", dataType: "DATE" },
];
function projectData(nodes = fields, overrides = {}, pageInfo = { hasNextPage: false, endCursor: null }) {
  return { user: { projectV2: { id: "P_3", url: "https://github.test/projects/3",
    viewerCanUpdate: true, fields: { nodes, pageInfo }, ...overrides } } };
}
function fixture(replies) {
  const calls = [];
  const client = new GitHubProjectSchedule({ url: "https://github.test/graphql", configuration,
    fetchImpl: async (url, options) => {
      calls.push({ url, ...JSON.parse(options.body), options });
      const reply = replies.shift();
      assert.ok(reply, "Unexpected request");
      return new Response(JSON.stringify(reply.body ?? { data: reply.data }), { status: reply.status ?? 200 });
    } });
  return { client, calls };
}

test("empty dates preserve the branch-only workflow", () => {
  assert.equal(parseSchedule(undefined, " "), null);
});
test("valid dates are trimmed, UTC-safe, and may span years or share a day", () => {
  assert.deepEqual(parseSchedule(" 2028-02-29 ", "2029-01-01"), { startDate: "2028-02-29", endDate: "2029-01-01" });
  assert.deepEqual(parseSchedule("2026-09-16", "2026-09-16"), { startDate: "2026-09-16", endDate: "2026-09-16" });
});
for (const [start, end] of [
  ["2026-09-16", ""], ["", "2026-09-16"], ["2026-09-17", "2026-09-16"],
  ["2026-02-29", "2026-03-01"], ["2026-04-31", "2026-05-01"],
  ["2026-00-01", "2026-09-16"], ["2026-13-01", "2027-01-01"],
  ["16/09/2026", "2026-09-17"], ["2026-9-16", "2026-09-17"],
  ["0000-01-01", "2026-09-16"], ["2026-09-16T00:00:00Z", "2026-09-17"],
  ["2026-09-16", "invalid"],
]) test("rejects invalid date pair " + JSON.stringify([start, end]), () => {
  assert.throws(() => parseSchedule(start, end));
});
test("project configuration requires a dedicated token and validates selectors", () => {
  assert.throws(() => projectConfiguration({}), /PROJECT_TOKEN/);
  assert.deepEqual(projectConfiguration({ PROJECT_TOKEN: " token " }), {
    token: "token", owner: "Bielaszczuk", number: 3, startField: "Start date", endField: "Target date",
  });
  for (const extra of [
    { PROJECT_OWNER: "invalid/login" }, { PROJECT_NUMBER: "0" }, { PROJECT_NUMBER: "3.2" },
    { PROJECT_NUMBER: "9007199254740992" }, { PROJECT_START_FIELD: "Date", PROJECT_END_FIELD: "Date" },
  ]) assert.throws(() => projectConfiguration({ PROJECT_TOKEN: "token", ...extra }));
  assert.equal(projectConfiguration({ PROJECT_TOKEN: "token", PROJECT_OWNER: "1337B",
    PROJECT_START_FIELD: "Inicio", PROJECT_END_FIELD: "Fin" }).startField, "Inicio");
});
test("preflight resolves date fields across pages without any mutation", async () => {
  const { client, calls } = fixture([
    { data: projectData([fields[0], {}], {}, { hasNextPage: true, endCursor: "next" }) },
    { data: projectData([fields[1]]) },
  ]);
  assert.deepEqual(await client.prepare(), {
    projectId: "P_3", url: "https://github.test/projects/3", startFieldId: "F_start", endFieldId: "F_end",
  });
  assert.equal(calls[1].variables.cursor, "next");
  assert.ok(calls.every(call => !call.query.includes("mutation")));
  assert.ok(calls.every(call => call.options.headers.Authorization === "Bearer project-test-token"));
  assert.ok(calls.every(call => call.options.signal instanceof AbortSignal));
});
for (const [name, data] of [
  ["missing project", { user: null }],
  ["read-only access", projectData(fields, { viewerCanUpdate: false })],
  ["missing field", projectData([fields[0]])],
  ["wrong field type", projectData([fields[0], { ...fields[1], dataType: "TEXT" }])],
  ["ambiguous field name", projectData([...fields, fields[0]])],
  ["incomplete response", projectData(fields, { fields: null })],
  ["invalid cursor", projectData(fields, {}, { hasNextPage: true, endCursor: null })],
]) test("preflight rejects " + name, async () => {
  const { client } = fixture([{ data }]);
  await assert.rejects(() => client.prepare());
});
test("writes both dates onto the returned item, including an already-added issue", async () => {
  const { client, calls } = fixture([
    { data: { addProjectV2ItemById: { item: { id: "existing-item" } } } },
    { data: { start: { projectV2Item: { id: "existing-item" } }, end: { projectV2Item: { id: "existing-item" } } } },
  ]);
  const project = { projectId: "P_3", startFieldId: "F_start", endFieldId: "F_end" };
  assert.equal(await client.apply(project, "I_9", parseSchedule("2026-09-16", "2026-09-20")), "existing-item");
  assert.deepEqual(calls[0].variables, { projectId: "P_3", contentId: "I_9" });
  assert.deepEqual(calls[1].variables, { ...project, itemId: "existing-item",
    startDate: "2026-09-16", endDate: "2026-09-20" });
});
test("does not report success for a partial date update", async () => {
  const { client } = fixture([
    { data: { addProjectV2ItemById: { item: { id: "item" } } } },
    { data: { start: { projectV2Item: { id: "item" } } } },
  ]);
  await assert.rejects(() => client.apply({ projectId: "P" }, "I", {}), /both date updates/);
});
for (const reply of [
  { status: 403, body: {} },
  { body: { errors: [{ message: "Permission denied" }] } },
  { body: {} },
]) test("surfaces API failure " + JSON.stringify(reply), async () => {
  const { client } = fixture([reply]);
  await assert.rejects(() => client.prepare());
});
