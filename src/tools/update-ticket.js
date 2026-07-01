import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerUpdateTicket = (server) => {
  server.registerTool(
    "update_ticket",
    {
      description: "Update fields of a Jira ticket: summary, description, issue type, parent, labels, due date, original estimate, implementation notes",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        summary: z.string().optional().describe("Replace ticket summary/title"),
        description: z.string().optional().describe("Replace full description"),
        implementation_notes: z.string().optional().describe("Append implementation notes to description"),
        issue_type: z.string().optional().describe("Issue type: Story, Task, Bug, Sub-task"),
        parent_key: z.string().optional().describe("Parent ticket key for Sub-task"),
        labels: z.array(z.string()).optional().describe("Labels to set"),
        due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        original_estimate: z.string().optional().describe("Time estimate e.g. \"2h\", \"1d 4h\""),
      }),
    },
    async ({ ticket_id, summary, description, implementation_notes, issue_type, parent_key, labels, due_date, original_estimate }) => {
      try {
        const fields = {};

        if (summary !== undefined) fields.summary = summary;
        if (description !== undefined) fields.description = description;

        if (implementation_notes !== undefined) {
          const current = await jiraRequest("GET", `/issue/${ticket_id}?fields=description`);
          const existing = current.fields.description || "";
          fields.description = existing + "\n\n--- Implementation Notes ---\n" + implementation_notes;
        }

        if (issue_type !== undefined) fields.issuetype = { name: issue_type };
        if (parent_key !== undefined) fields.parent = { key: parent_key };
        if (labels !== undefined) fields.labels = labels;
        if (due_date !== undefined) fields.duedate = due_date;

        const body = { fields };

        if (original_estimate !== undefined) {
          body.update = { timetracking: [{ edit: { originalEstimate: original_estimate } }] };
        }

        if (Object.keys(fields).length === 0 && !body.update) {
          return { content: [{ type: "text", text: "No fields provided to update" }], isError: true };
        }

        await jiraRequest("PUT", `/issue/${ticket_id}`, body);
        return { content: [{ type: "text", text: `${ticket_id} updated successfully` }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
