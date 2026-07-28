import {z} from "zod";
import {defineTool} from "../define-tool.js";

export const registerLinkIssues = (server, jiraRequest) => {
  defineTool(
    server,
    "link_issues",
    {
      description:
        "Create a link between two Jira tickets (e.g. Blocks, Relates to, Clones, Duplicate)",
      inputSchema: z.object({
        inward_issue: z
          .string()
          .describe("Issue key being linked FROM, e.g. GEM-1"),
        link_type: z
          .string()
          .default("Blocks")
          .describe("Link type: Blocks, Clones, Relates to, Duplicate, etc."),
        outward_issue: z
          .string()
          .describe("Issue key being linked TO, e.g. GEM-2"),
      }),
    },
    async ({inward_issue, outward_issue, link_type}, jira) => {
      await jira("POST", "/issueLink", {
        inwardIssue: {key: inward_issue},
        outwardIssue: {key: outward_issue},
        type: {name: link_type},
      });
      return `Linked: ${inward_issue} "${link_type}" ${outward_issue}`;
    },
    jiraRequest,
  );
};
