import {z} from "zod";
import {defineTool} from "../../define-tool.js";

export const registerDeleteWorklog = (server, jiraRequest) => {
  defineTool(
    server,
    "delete_worklog",
    {
      description:
        "Delete a worklog from a Jira ticket. This cannot be undone. Worklog IDs are shown by get_ticket with include_worklogs.",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        worklog_id: z.string().describe("Worklog ID, e.g. 20001"),
      }),
    },
    async ({ticket_id, worklog_id}, jira) => {
      await jira("DELETE", `/issue/${ticket_id}/worklog/${worklog_id}`);
      return `Worklog ${worklog_id} deleted from ${ticket_id}`;
    },
    jiraRequest,
  );
};
