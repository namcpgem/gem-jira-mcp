import {z} from "zod";
import {ACTIVITIES, logWorkPro, WORK_TYPES} from "../worklog-pro.js";

export const registerLogWork = (server) => {
  server.registerTool(
    "log_work",
    {
      description:
        "Log work (time) on a Jira ticket, optionally setting WorklogPRO Type of Work and Type of Activity",
      inputSchema: z.object({
        activity: z
          .string()
          .optional()
          .describe(
            `Type of Activity (required when work_type is set): ${Object.keys(ACTIVITIES).join(", ")}`,
          ),
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
        work_type: z
          .string()
          .optional()
          .describe(`Type of Work: ${Object.keys(WORK_TYPES).join(", ")}`),
      }),
    },
    async ({ticket_id, time_spent, comment, started, work_type, activity}) => {
      try {
        const opts = {comment, started};
        if (work_type) {
          const id = WORK_TYPES[work_type.toLowerCase()];
          if (id == null) {
            throw new Error(
              `Unknown work_type "${work_type}". Valid: ${Object.keys(WORK_TYPES).join(", ")}`,
            );
          }
          opts.workType = id;
        }
        if (activity) {
          const id = ACTIVITIES[activity.toLowerCase()];
          if (id == null) {
            throw new Error(
              `Unknown activity "${activity}". Valid: ${Object.keys(ACTIVITIES).join(", ")}`,
            );
          }
          opts.activity = id;
        }
        const result = await logWorkPro(ticket_id, time_spent, opts);
        const idNote = result?.id ? ` (worklog id: ${result.id})` : "";
        const attrNote = work_type
          ? ` [${work_type}${activity ? `/${activity}` : ""}]`
          : "";
        return {
          content: [
            {
              text: `Logged ${time_spent} on ${ticket_id}${attrNote}${idNote}`,
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
