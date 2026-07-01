import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

export const registerLogWork = (server) => {
  server.registerTool(
    "log_work",
    {
      description: "Log work (time) on a Jira ticket",
      inputSchema: z.object({
        comment: z.string().optional().describe("Optional work log comment"),
        started: z
          .string()
          .optional()
          .describe(
            "Start datetime ISO format, e.g. '2026-06-29T09:00:00.000+0700'. Defaults to now.",
          ),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        time_spent: z
          .string()
          .describe("Time spent, e.g. '2h 30m', '1d', '45m'"),
      }),
    },
    async ({ticket_id, time_spent, comment, started}) => {
      try {
        const body = {timeSpent: time_spent};
        if (comment) body.comment = comment;
        if (started) {
          body.started = started;
        } else {
          const now = new Date();
          const offset = -now.getTimezoneOffset();
          const sign = offset >= 0 ? "+" : "-";
          const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
          body.started = now
            .toISOString()
            .replace("Z", `${sign}${pad(offset / 60)}${pad(offset % 60)}`);
        }
        const result = await jiraRequest(
          "POST",
          `/issue/${ticket_id}/worklog`,
          body,
        );
        return {
          content: [
            {
              text: `Logged ${time_spent} on ${ticket_id} (worklog id: ${result.id})`,
              type: "text",
            },
          ],
        };
      } catch (err) {
        return {content: [{text: err.message, type: "text"}], isError: true};
      }
    },
  );
};
