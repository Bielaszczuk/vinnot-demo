const WORK_TYPE_CONFIG = Object.freeze({
  feature: Object.freeze({
    baseBranch: "development",
    label: "type:feature",
    color: "1D76DB",
    description: "New product or business capability",
  }),
  bugfix: Object.freeze({
    baseBranch: "development",
    label: "type:bugfix",
    color: "D73A4A",
    description: "Correction of a non-production-critical defect",
  }),
  hotfix: Object.freeze({
    baseBranch: "main",
    label: "type:hotfix",
    color: "B60205",
    description: "Urgent correction for a production incident",
  }),
  task: Object.freeze({
    baseBranch: "development",
    label: "type:task",
    color: "5319E7",
    description: "Technical, documentation, infrastructure, or maintenance work",
  }),
});

const CANONICAL_BRANCH_PATTERN =
  /^(feature|bugfix|hotfix|task)\/[1-9][0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INTEGRATION_BRANCHES = new Set(["main", "development"]);
const AUTOMATION_BRANCH_PREFIXES = ["dependabot/", "renovate/"];

export function getWorkTypeConfig(workType) {
  const normalized = String(workType ?? "").trim().toLowerCase();
  const config = WORK_TYPE_CONFIG[normalized];
  if (!config) {
    throw new Error(
      `Unsupported work type '${workType}'. Expected one of: ${Object.keys(WORK_TYPE_CONFIG).join(", ")}.`,
    );
  }
  return { type: normalized, ...config };
}

export function parseIssueNumber(value) {
  const normalized = String(value ?? "").trim().replace(/^#/, "");
  if (!normalized) {
    return null;
  }
  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error("Issue number must be a positive integer, with or without a leading #.");
  }
  return Number(normalized);
}

export function slugifyWorkTitle(title, maxLength = 72) {
  const slug = String(title ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  if (!slug) {
    throw new Error("The work title must contain at least one ASCII letter or digit after normalization.");
  }
  return slug;
}

export function buildBranchName(workType, issueNumber, title) {
  const { type } = getWorkTypeConfig(workType);
  const number = parseIssueNumber(issueNumber);
  if (number === null) {
    throw new Error("An issue number is required to build a branch name.");
  }
  const issuePrefix = String(title ?? "").match(
    /^\s*\[(feature|bugfix|hotfix|task)\]\s*:?\s*/i,
  );
  if (issuePrefix && issuePrefix[1].toLowerCase() !== type) {
    throw new Error(
      `Issue title declares '${issuePrefix[1].toLowerCase()}' but the selected work type is '${type}'.`,
    );
  }
  const titleWithoutPrefix = issuePrefix
    ? String(title).slice(issuePrefix[0].length)
    : title;
  return `${type}/${number}-${slugifyWorkTitle(titleWithoutPrefix)}`;
}

export function isAllowedPullRequestBranch(branchName) {
  const normalized = String(branchName ?? "").trim();
  return (
    INTEGRATION_BRANCHES.has(normalized) ||
    AUTOMATION_BRANCH_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    CANONICAL_BRANCH_PATTERN.test(normalized)
  );
}

export function branchNamingHelp() {
  return [
    "Expected: <type>/<issue-number>-<slug>",
    "Allowed types: feature, bugfix, hotfix, task",
    "Example: feature/101-business-payment-logic",
    "Use the numeric issue number without # and without zero padding.",
  ].join("\n");
}
