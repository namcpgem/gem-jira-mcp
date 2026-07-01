import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

export const registerLinkIssues = (server) => {
  server.registerTool(
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
    async ({inward_issue, outward_issue, link_type}) => {
      try {
        await jiraRequest("POST", "/issueLink", {
          inwardIssue: {key: inward_issue},
          outwardIssue: {key: outward_issue},
          type: {name: link_type},
        });
        return {
          content: [
            {
              text: `Linked: ${inward_issue} "${link_type}" ${outward_issue}`,
              type: "text",
            },
          ],
        };
      } catch (err) {
        return {content: [{text: err.message, type: "text"}], isError: true};
      }
    },
  );
};
