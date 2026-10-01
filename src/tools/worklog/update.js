import {z} from "zod";
import {defineTool} from "../../define-tool.js";

// REST can edit time, start and comment only; WorklogPRO Type of Work and
// Type of Activity are set through its web form, which has no edit path here.
// A REST edit keeps both attributes (checked in the WorklogPRO UI); REST
// cannot read them back to verify.
export const registerUpdateWorklog = (server, jiraRequest) => {
  defineTool(
    server,
    "update_worklog",
    {
      description:
        "Edit a worklog's time, start or comment. Worklog IDs are shown by get_ticket with include_worklogs. To change Type of Work/Activity, delete the worklog and log_work again.",
      inputSchema: z.object({
        comment: z.string().optional().describe("New worklog comment"),
        started: z
          .string()
          .optional()
          .describe("Start datetime ISO, e.g. '2026-06-29T09:00:00.000+0700'"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        time_spent: z
          .string()
          .optional()
          .describe("Time spent, e.g. '2h 30m', '1d', '45m'"),
        worklog_id: z.string().describe("Worklog ID, e.g. 20001"),
      }),
    },
    async ({ticket_id, worklog_id, time_spent, started, comment}, jira) => {
      const body = {};
      if (time_spent !== undefined) body.timeSpent = time_spent;
      if (started !== undefined) body.started = started;
      if (comment !== undefined) body.comment = comment;
      if (!Object.keys(body).length) {
        throw new Error(
          "Nothing to update: pass time_spent, started or comment",
        );
      }
      await jira("PUT", `/issue/${ticket_id}/worklog/${worklog_id}`, body);
      return `Worklog ${worklog_id} on ${ticket_id} updated`;
    },
    jiraRequest,
  );
};
