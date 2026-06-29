import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerSearchTickets = (server) => {
  server.registerTool(
    "search_tickets",
    {
      description: "Search Jira tickets using JQL query language",
      inputSchema: z.object({
        jql: z.string().describe("JQL query, e.g. 'project = GEM AND status = \"In Progress\"'"),
        max_results: z.number().default(50).optional().describe("Max results to return (default 50)"),
      }),
    },
    async ({ jql, max_results = 50 }) => {
      try {
        const params = new URLSearchParams({
          jql,
          maxResults: String(max_results),
          fields: "summary,status,assignee,priority,issuetype",
        });
        const data = await jiraRequest("GET", `/search?${params}`);
        if (!data.issues?.length) {
          return { content: [{ type: "text", text: "No issues found" }] };
        }
        const lines = data.issues.map((i) => {
          const f = i.fields;
          const assignee = f.assignee?.displayName || "Unassigned";
          return `${i.key} | ${f.summary} | ${f.status?.name} | ${assignee} | ${f.priority?.name || "-"}`;
        });
        const text =
          `Found ${data.total} issue(s) (showing ${data.issues.length}):\n\n` +
          "KEY | Summary | Status | Assignee | Priority\n" +
          lines.join("\n");
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
