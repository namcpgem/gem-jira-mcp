import {z} from "zod";
import {defineTool} from "../define-tool.js";
import {START_DATE_FIELD} from "../ticket-fields.js";

// A busy ticket can carry hundreds of comments; returning them all would cost
// the caller more tokens than the rest of the server put together. The newest
// are the ones that answer questions, and the header admits what was cut.
const COMMENT_LIMIT = 20;

const formatComments = ({comments = [], total = 0} = {}) => {
  if (!comments.length) return "Comments: None";
  const shown = comments.slice(-COMMENT_LIMIT);
  const body = shown
    .map(
      (c) =>
        `  [${c.created?.slice(0, 10)}] ${c.author?.displayName || "Unknown"}: ${c.body}`,
    )
    .join("\n");
  // Jira can also cap the inline list, so trust its total over what arrived.
  const all = Math.max(total, comments.length);
  const count =
    shown.length < all ? `${shown.length} most recent of ${all}` : all;
  return `Comments (${count}):\n${body}`;
};

export const registerGetTicket = (server, jiraRequest) => {
  defineTool(
    server,
    "get_ticket",
    {
      description: "Get full details of a Jira ticket by its key",
      inputSchema: z.object({
        include_comments: z
          .boolean()
          .optional()
          .describe("Include the ticket's comments (default false)"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, include_comments}, jira) => {
      const issue = await jira("GET", `/issue/${ticket_id}`);
      const f = issue.fields;
      const subtasks = (f.subtasks || [])
        .map((s) => `  - ${s.key}: ${s.fields.summary}`)
        .join("\n");
      // Unset fields are omitted rather than printed as "Not set" — the caller
      // is an LLM paying tokens for every line.
      const line = (label, value) => (value ? `${label}: ${value}` : null);
      return [
        `Key: ${issue.key}`,
        `Summary: ${f.summary}`,
        `Status: ${f.status?.name}`,
        `Assignee: ${f.assignee?.displayName || "Unassigned"}`,
        line("Reporter", f.reporter?.displayName),
        line("Priority", f.priority?.name),
        line("Start Date", f[START_DATE_FIELD]),
        line("Due Date", f.duedate),
        line("Original Estimate", f.timetracking?.originalEstimate),
        line("Labels", (f.labels || []).join(", ")),
        f.description ? `Description:\n${f.description}` : null,
        subtasks ? `Subtasks:\n${subtasks}` : null,
        include_comments ? formatComments(f.comment) : null,
      ]
        .filter(Boolean)
        .join("\n");
    },
    jiraRequest,
  );
};
