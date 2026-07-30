import {z} from "zod";
import {defineTool} from "../define-tool.js";
import {START_DATE_FIELD} from "../ticket-fields.js";

const COLUMNS = [
  "KEY",
  "Summary",
  "Status",
  "Assignee",
  "Priority",
  "Parent",
  "Start Date",
  "Due Date",
  "Original Estimate",
];

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
          .default(25)
          .optional()
          .describe("Max results to return (default 25)"),
      }),
    },
    async ({jql, max_results = 25}, jira) => {
      const params = new URLSearchParams({
        fields: `summary,status,assignee,priority,timetracking,duedate,parent,${START_DATE_FIELD}`,
        jql,
        maxResults: String(max_results),
      });
      const data = await jira("GET", `/search?${params}`);
      if (!data.issues?.length) return "No issues found";

      const rows = data.issues.map(({fields: f, key}) => ({
        Assignee: f.assignee?.displayName || "Unassigned",
        "Due Date": f.duedate,
        KEY: key,
        "Original Estimate": f.timetracking?.originalEstimate,
        Parent: f.parent?.key,
        Priority: f.priority?.name,
        "Start Date": f[START_DATE_FIELD],
        Status: f.status?.name,
        Summary: f.summary,
      }));
      // The caller pays tokens per cell, so a column earns its place only if it
      // says something per row. Empty everywhere (no due dates on the whole
      // result) is dropped; identical everywhere (searching one status) is
      // stated once above the table instead of repeated on every row.
      const collapsible = COLUMNS.filter((c) => c !== "KEY" && c !== "Summary");
      const values = (c) => rows.map((r) => r[c]).filter(Boolean);
      // "All: X" must hold for every row, so a column filled on only some rows
      // never counts as constant no matter how uniform those values are.
      const constant =
        rows.length >= 3
          ? collapsible.filter(
              (c) =>
                values(c).length === rows.length &&
                new Set(values(c)).size === 1,
            )
          : [];
      const empty = collapsible.filter((c) => !values(c).length);
      const columns = COLUMNS.filter(
        (c) => values(c).length && !constant.includes(c),
      );

      const line = (cells) => cells.join(" | ");
      // A missing column would otherwise be ambiguous — "no ticket has a due
      // date" reads the same as "this tool can't see due dates", and a caller
      // resolving that guess with one get_ticket per row costs far more than
      // naming the columns here does.
      const notes = [
        constant.length &&
          `All: ${constant.map((c) => `${c}=${rows[0][c]}`).join(", ")}`,
        empty.length && `Unset for every row: ${empty.join(", ")}`,
      ].filter(Boolean);
      return [
        `Found ${data.total} issue(s) (showing ${rows.length})` +
          `${notes.length ? `. ${notes.join(". ")}` : ""}\n`,
        line(columns),
        ...rows.map((r) => line(columns.map((c) => r[c] || "-"))),
      ].join("\n");
    },
    jiraRequest,
  );
};
