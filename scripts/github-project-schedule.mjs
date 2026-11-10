/**
 * Roadmap policy and GitHub Projects adapter.
 * Repository mutations retain GITHUB_TOKEN; this adapter uses PROJECT_TOKEN only.
 */
export function parseSchedule(startValue, endValue) {
  const startDate = String(startValue ?? "").trim();
  const endDate = String(endValue ?? "").trim();
  if (!startDate && !endDate) return null;
  if (!startDate || !endDate) {
    throw new Error("Provide both start_date and end_date, or leave both empty.");
  }
  for (const [name, value] of [["start_date", startDate], ["end_date", endDate]]) {
    const parsed = new Date(value + "T00:00:00.000Z");
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)
        || value.startsWith("0000") || Number.isNaN(parsed.getTime())
        || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error(name + " must be a real calendar date in YYYY-MM-DD format.");
    }
  }
  if (endDate < startDate) throw new Error("end_date must be on or after start_date.");
  return { startDate, endDate };
}

export function projectConfiguration(environment) {
  const token = environment.PROJECT_TOKEN?.trim();
  if (!token) throw new Error("Configure the PROJECT_TOKEN Actions secret with write access to the user project before using dates.");
  const owner = environment.PROJECT_OWNER?.trim() || "Bielaszczuk";
  const number = environment.PROJECT_NUMBER?.trim() || "3";
  if (!/^[a-zA-Z0-9-]+$/.test(owner)) throw new Error("PROJECT_OWNER must be a GitHub user login.");
  if (!/^[1-9][0-9]*$/.test(number) || !Number.isSafeInteger(Number(number))) {
    throw new Error("PROJECT_NUMBER must be a positive integer.");
  }
  const startField = environment.PROJECT_START_FIELD?.trim() || "Start date";
  const endField = environment.PROJECT_END_FIELD?.trim() || "Target date";
  if (startField === endField) throw new Error("Start and end date fields must be different.");
  return { token, owner, number: Number(number), startField, endField };
}

export class GitHubProjectSchedule {
  constructor({ url, configuration, fetchImpl = fetch }) {
    this.url = url;
    this.configuration = configuration;
    this.fetch = fetchImpl;
  }

  async graphql(query, variables) {
    const response = await this.fetch(this.url, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: "Bearer " + this.configuration.token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error("Projects API HTTP " + response.status + ". Check PROJECT_TOKEN access.");
    const result = await response.json();
    if (result.errors?.length) {
      throw new Error("Projects GraphQL: " + result.errors.map(error => error.message).join("; "));
    }
    if (!result.data) throw new Error("Projects API returned no data.");
    return result.data;
  }

  /** Read-only preflight: validate access and discover exact DATE fields. */
  async prepare() {
    const { owner, number, startField, endField } = this.configuration;
    const fields = [];
    let cursor = null;
    let project;
    do {
      const data = await this.graphql(`
        query WorkProject($owner: String!, $number: Int!, $cursor: String) {
          user(login: $owner) {
            projectV2(number: $number) {
              id url viewerCanUpdate
              fields(first: 100, after: $cursor) {
                nodes { ... on ProjectV2Field { id name dataType } }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        }`, { owner, number, cursor });
      project = data.user?.projectV2;
      if (!project?.id) throw new Error("User project was not found. Check PROJECT_OWNER, PROJECT_NUMBER and PROJECT_TOKEN.");
      if (project.viewerCanUpdate !== true) throw new Error("PROJECT_TOKEN does not have write access to this project.");
      if (!project.fields?.nodes || !project.fields.pageInfo) throw new Error("Projects API returned an incomplete field list.");
      fields.push(...project.fields.nodes.filter(Boolean));
      const page = project.fields.pageInfo;
      if (page.hasNextPage && (!page.endCursor || page.endCursor === cursor)) {
        throw new Error("Projects API returned an invalid pagination cursor.");
      }
      cursor = page.hasNextPage ? page.endCursor : null;
    } while (cursor);
    const resolveField = name => {
      const matches = fields.filter(field => field.name === name);
      if (matches.length !== 1 || matches[0].dataType !== "DATE") {
        throw new Error("Project must contain exactly one DATE field named '" + name + "'. Configure the field or WORK_PROJECT_*_FIELD variables.");
      }
      return matches[0].id;
    };
    return { projectId: project.id, url: project.url,
      startFieldId: resolveField(startField), endFieldId: resolveField(endField) };
  }

  async apply(project, issueId, schedule) {
    // GitHub returns the existing item when this content is already in the project.
    const added = await this.graphql(`
      mutation ScheduleWorkItem($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item { id }
        }
      }`, { projectId: project.projectId, contentId: issueId });
    const itemId = added.addProjectV2ItemById?.item?.id;
    if (!itemId) throw new Error("Projects API did not return the issue's project item.");
    const updated = await this.graphql(`
      mutation SetWorkDates($projectId: ID!, $itemId: ID!, $startFieldId: ID!,
        $endFieldId: ID!, $startDate: Date!, $endDate: Date!) {
        start: updateProjectV2ItemFieldValue(input: {
          projectId: $projectId, itemId: $itemId, fieldId: $startFieldId,
          value: {date: $startDate}
        }) { projectV2Item { id } }
        end: updateProjectV2ItemFieldValue(input: {
          projectId: $projectId, itemId: $itemId, fieldId: $endFieldId,
          value: {date: $endDate}
        }) { projectV2Item { id } }
      }`, { projectId: project.projectId, itemId,
        startFieldId: project.startFieldId, endFieldId: project.endFieldId,
        startDate: schedule.startDate, endDate: schedule.endDate });
    if (updated.start?.projectV2Item?.id !== itemId || updated.end?.projectV2Item?.id !== itemId) {
      throw new Error("Projects API did not confirm both date updates.");
    }
    return itemId;
  }
}
