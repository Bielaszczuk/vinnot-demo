import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBranchName,
  getWorkTypeConfig,
  isAllowedPullRequestBranch,
  parseIssueNumber,
  slugifyWorkTitle,
} from "../github-work-item-policy.mjs";

test("work types resolve their intended base branch", () => {
  assert.equal(getWorkTypeConfig("feature").baseBranch, "development");
  assert.equal(getWorkTypeConfig("bugfix").baseBranch, "development");
  assert.equal(getWorkTypeConfig("task").baseBranch, "development");
  assert.equal(getWorkTypeConfig("hotfix").baseBranch, "main");
  assert.throws(() => getWorkTypeConfig("fix"), /Unsupported work type/);
});

test("issue numbers accept GitHub notation but reject invalid values", () => {
  assert.equal(parseIssueNumber("#101"), 101);
  assert.equal(parseIssueNumber("101"), 101);
  assert.equal(parseIssueNumber(""), null);
  assert.throws(() => parseIssueNumber("01"), /positive integer/);
  assert.throws(() => parseIssueNumber("issue-1"), /positive integer/);
});

test("titles become deterministic portable slugs", () => {
  assert.equal(slugifyWorkTitle("Lógica de pagos — negocio"), "logica-de-pagos-negocio");
  assert.equal(slugifyWorkTitle("  Business   payment logic!  "), "business-payment-logic");
  assert.throws(() => slugifyWorkTitle("---"), /ASCII letter or digit/);
});

test("branch names contain type, issue number, and normalized title", () => {
  assert.equal(
    buildBranchName("feature", 101, "Business payment logic"),
    "feature/101-business-payment-logic",
  );
  assert.equal(
    buildBranchName("feature", 101, "[Feature]: Business payment logic"),
    "feature/101-business-payment-logic",
  );
  assert.throws(
    () => buildBranchName("feature", 101, "[Bugfix]: Payment calculation"),
    /declares 'bugfix'/,
  );
});

test("pull request branch policy accepts canonical and integration branches", () => {
  assert.equal(isAllowedPullRequestBranch("feature/101-business-payment-logic"), true);
  assert.equal(isAllowedPullRequestBranch("hotfix/9-fix-login"), true);
  assert.equal(isAllowedPullRequestBranch("development"), true);
  assert.equal(isAllowedPullRequestBranch("dependabot/npm_and_yarn/react-20"), true);
  assert.equal(isAllowedPullRequestBranch("feature-#101-business-payment-logic"), false);
  assert.equal(isAllowedPullRequestBranch("feature/#101-business-payment-logic"), false);
  assert.equal(isAllowedPullRequestBranch("feature/01-business-payment-logic"), false);
  assert.equal(isAllowedPullRequestBranch("fix/101-business-payment-logic"), false);
});
