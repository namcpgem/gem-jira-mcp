import {z} from "zod";
import {defineTool} from "../define-tool.js";
import {START_DATE_FIELD} from "../ticket-fields.js";

export const registerCreateTicket = (server, jiraRequest) => {
  defineTool(
    server,
    "create_ticket",
    {
      description: "Create a new Jira ticket",
      inputSchema: z.object({
        assignee: z
          .string()
          .optional()
          .describe("Assignee username, e.g. username"),
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
    async (
      {
        project,
        summary,
        issue_type,
        body,
        parent_key,
        due_date,
        start_date,
        original_estimate,
        labels,
        assignee,
      },
      jira,
    ) => {
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
      if (assignee) fields.assignee = {name: assignee};

      const result = await jira("POST", "/issue", {fields});
      const url = `${process.env.JIRA_HOST}/browse/${result.key}`;

      // timetracking in the create payload makes Jira Data Center answer a bare
      // 500 ({"errorMessages":["Internal server error"]}), so the estimate goes
      // on afterwards through the same update.timetracking.edit path
      // update_ticket uses. The key is reported either way: losing it on a
      // failed estimate would send the caller back to create a duplicate.
      if (original_estimate) {
        try {
          await jira("PUT", `/issue/${result.key}`, {
            update: {
              timetracking: [{edit: {originalEstimate: original_estimate}}],
            },
          });
        } catch (err) {
          return `Created ${result.key}: ${url}\nWarning: original_estimate "${original_estimate}" was not applied (${err.message}). The ticket exists — set the estimate with update_ticket.`;
        }
      }
      return `Created ${result.key}: ${url}`;
    },
    jiraRequest,
  );
};
