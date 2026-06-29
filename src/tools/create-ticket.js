import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerCreateTicket = (server) => {
  server.registerTool(
    "create_ticket",
    {
      description: "Create a new Jira ticket (Story, Task, Bug, Sub-task)",
      inputSchema: z.object({
        project: z.string().describe("Project key, e.g. GEM"),
        summary: z.string().describe("Issue title"),
        issue_type: z.string().describe("Issue type: Story, Task, Bug, Sub-task"),
        body: z.string().optional().describe("Description text"),
        parent_key: z.string().optional().describe("Parent ticket key for Sub-task"),
        due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        original_estimate: z.string().optional().describe("Time estimate e.g. \"2h\""),
        labels: z.array(z.string()).optional().describe("Labels to assign"),
      }),
    },
    async ({ project, summary, issue_type, body, parent_key, due_date, original_estimate, labels }) => {
      try {
        const fields = {
          project: { key: project },
          summary,
          issuetype: { name: issue_type },
        };

        if (body) fields.description = body;
        if (parent_key) fields.parent = { key: parent_key };
        if (due_date) fields.duedate = due_date;
        if (labels?.length) fields.labels = labels;

        const requestBody = { fields };

        if (original_estimate) {
          requestBody.update = { timetracking: [{ edit: { originalEstimate: original_estimate } }] };
        }

        const result = await jiraRequest("POST", "/issue", requestBody);
        const url = `${process.env.JIRA_HOST}/browse/${result.key}`;
        return { content: [{ type: "text", text: `Created ${result.key}: ${url}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
