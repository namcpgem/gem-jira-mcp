import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerLinkIssues = (server) => {
  server.registerTool(
    "link_issues",
    {
      description: "Create a link between two Jira tickets (e.g. Blocks, Relates to, Clones, Duplicate)",
      inputSchema: z.object({
        inward_issue: z.string().describe("Issue key being linked FROM, e.g. GEM-1"),
        outward_issue: z.string().describe("Issue key being linked TO, e.g. GEM-2"),
        link_type: z.string().default("Blocks").describe("Link type: Blocks, Clones, Relates to, Duplicate, etc."),
      }),
    },
    async ({ inward_issue, outward_issue, link_type }) => {
      try {
        await jiraRequest("POST", "/issueLink", {
          type: { name: link_type },
          inwardIssue: { key: inward_issue },
          outwardIssue: { key: outward_issue },
        });
        return { content: [{ type: "text", text: `Linked: ${inward_issue} "${link_type}" ${outward_issue}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
