import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

const START_DATE_FIELD =
  process.env.JIRA_START_DATE_FIELD || "customfield_11300";

export const registerCreateTicket = (server) => {
  server.registerTool(
    "create_ticket",
    {
      description: "Create a new Jira ticket (Story, Task, Bug, Sub-task)",
      inputSchema: z.object({
        body: z.string().optional().describe("Description text"),
        due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        issue_type: z
          .string()
          .describe("Issue type: Story, Task, Bug, Sub-task"),
        labels: z.array(z.string()).optional().describe("Labels to assign"),
        original_estimate: z
          .string()
          .optional()
          .describe('Time estimate e.g. "2h"'),
        parent_key: z
          .string()
          .optional()
          .describe("Parent ticket key for Sub-task"),
        project: z.string().describe("Project key, e.g. GEM"),
        start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
        summary: z.string().describe("Issue title"),
      }),
    },
    async ({
      project,
      summary,
      issue_type,
      body,
      parent_key,
      due_date,
      start_date,
      original_estimate,
      labels,
    }) => {
      try {
        const fields = {
          issuetype: {name: issue_type},
          project: {key: project},
          summary,
        };

        if (body) fields.description = body;
        if (parent_key) fields.parent = {key: parent_key};
        if (due_date) fields.duedate = due_date;
        if (start_date) fields[START_DATE_FIELD] = start_date;
        if (labels?.length) fields.labels = labels;
        if (original_estimate) {
          fields.timetracking = {originalEstimate: original_estimate};
        }

        const result = await jiraRequest("POST", "/issue", {fields});
        const url = `${process.env.JIRA_HOST}/browse/${result.key}`;
        return {
          content: [{text: `Created ${result.key}: ${url}`, type: "text"}],
        };
      } catch (err) {
        return {content: [{text: err.message, type: "text"}], isError: true};
      }
    },
  );
};
