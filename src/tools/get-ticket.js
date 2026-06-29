import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerGetTicket = (server) => {
  server.registerTool(
    "get_ticket",
    {
      description: "Get full details of a Jira ticket by its key",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ ticket_id }) => {
      try {
        const issue = await jiraRequest("GET", `/issue/${ticket_id}`);
        const f = issue.fields;
        const subtasks = (f.subtasks || [])
          .map((s) => `  - ${s.key}: ${s.fields.summary}`)
          .join("\n");
        const text = [
          `Key: ${issue.key}`,
          `Summary: ${f.summary}`,
          `Status: ${f.status?.name}`,
          `Assignee: ${f.assignee?.displayName || "Unassigned"}`,
          `Priority: ${f.priority?.name || "None"}`,
          `Due Date: ${f.duedate || "Not set"}`,
          `Labels: ${(f.labels || []).join(", ") || "None"}`,
          `Description:\n${f.description || "No description"}`,
          subtasks ? `Subtasks:\n${subtasks}` : "Subtasks: None",
        ].join("\n");
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
