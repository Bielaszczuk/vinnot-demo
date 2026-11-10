import {
  branchNamingHelp,
  isAllowedPullRequestBranch,
} from "./github-work-item-policy.mjs";

const branchName = process.argv[2]?.trim();
if (!branchName) {
  console.error("A branch name is required.");
  process.exitCode = 1;
} else if (!isAllowedPullRequestBranch(branchName)) {
  console.error(`Invalid pull request branch '${branchName}'.\n${branchNamingHelp()}`);
  process.exitCode = 1;
} else {
  console.log(`Branch '${branchName}' follows the repository policy.`);
}
