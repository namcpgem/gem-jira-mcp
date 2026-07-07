import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

const START_DATE_FIELD =
  process.env.JIRA_START_DATE_FIELD || "customfield_11300";

export const registerSearchTickets = (server) => {
  server.registerTool(
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
    async ({jql, max_results = 50}) => {
      try {
        const params = new URLSearchParams({
          fields: `summary,status,assignee,priority,issuetype,timetracking,duedate,${START_DATE_FIELD}`,
          jql,
          maxResults: String(max_results),
        });
        const data = await jiraRequest("GET", `/search?${params}`);
        if (!data.issues?.length) {
          return {content: [{text: "No issues found", type: "text"}]};
        }
        const lines = data.issues.map((i) => {
          const f = i.fields;
          const assignee = f.assignee?.displayName || "Unassigned";
          const estimate = f.timetracking?.originalEstimate || "-";
          const startDate = f[START_DATE_FIELD] || "-";
          const dueDate = f.duedate || "-";
          return `${i.key} | ${f.summary} | ${f.status?.name} | ${assignee} | ${f.priority?.name || "-"} | ${startDate} | ${dueDate} | ${estimate}`;
        });
        const text =
          `Found ${data.total} issue(s) (showing ${data.issues.length}):\n\n` +
          "KEY | Summary | Status | Assignee | Priority | Start Date | Due Date | Original Estimate\n" +
          lines.join("\n");
        return {content: [{text, type: "text"}]};
      } catch (err) {
        return {content: [{text: err.message, type: "text"}], isError: true};
      }
    },
  );
};
