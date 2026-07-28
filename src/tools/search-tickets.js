import {z} from "zod";
import {defineTool} from "../define-tool.js";
import {START_DATE_FIELD} from "../ticket-fields.js";

export const registerSearchTickets = (server, jiraRequest) => {
  defineTool(
    server,
    "search_tickets",
    {
      description: "Search Jira tickets using JQL query language",
      inputSchema: z.object({
        jql: z
          .string()
          .describe(
            "JQL query, e.g. 'project = GEM AND status = \"In Progress\"'",
          ),
        max_results: z
          .number()
          .default(50)
          .optional()
          .describe("Max results to return (default 50)"),
      }),
    },
    async ({jql, max_results = 50}, jira) => {
      const params = new URLSearchParams({
        fields: `summary,status,assignee,priority,issuetype,timetracking,duedate,parent,${START_DATE_FIELD}`,
        jql,
        maxResults: String(max_results),
      });
      const data = await jira("GET", `/search?${params}`);
      if (!data.issues?.length) return "No issues found";
      const lines = data.issues.map((i) => {
        const f = i.fields;
        const assignee = f.assignee?.displayName || "Unassigned";
        const estimate = f.timetracking?.originalEstimate || "-";
        const startDate = f[START_DATE_FIELD] || "-";
        const dueDate = f.duedate || "-";
        const parent = f.parent?.key || "-";
        return `${i.key} | ${f.summary} | ${f.status?.name} | ${assignee} | ${f.priority?.name || "-"} | ${parent} | ${startDate} | ${dueDate} | ${estimate}`;
      });
      return (
        `Found ${data.total} issue(s) (showing ${data.issues.length}):\n\n` +
        "KEY | Summary | Status | Assignee | Priority | Parent | Start Date | Due Date | Original Estimate\n" +
        lines.join("\n")
      );
    },
    jiraRequest,
  );
};
