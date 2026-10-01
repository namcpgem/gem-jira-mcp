import {z} from "zod";
import {defineTool} from "../../define-tool.js";
import {
  ACTIVITIES,
  canonicalNames,
  logWorkPro,
  WORK_TYPES,
} from "./worklog-pro.js";

export const registerLogWork = (server) => {
  defineTool(
    server,
    "log_work",
    {
      description:
        "Log work (time) on a Jira ticket, optionally setting WorklogPRO Type of Work and Type of Activity",
      inputSchema: z.object({
        activity: z
          .string()
          .optional()
          .describe(
            `Type of Activity (required when work_type is set): ${canonicalNames(ACTIVITIES)}`,
          ),
        comment: z.string().optional().describe("Optional work log comment"),
        started: z
          .string()
          .optional()
          .describe("Start datetime ISO, e.g. '2026-06-29T09:00:00.000+0700'"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        time_spent: z
          .string()
          .describe("Time spent, e.g. '2h 30m', '1d', '45m'"),
        work_type: z
          .string()
          .optional()
          .describe(`Type of Work: ${canonicalNames(WORK_TYPES)}`),
      }),
    },
    async ({ticket_id, time_spent, comment, started, work_type, activity}) => {
      const {id} = await logWorkPro(ticket_id, time_spent, {
        activity,
        comment,
        started,
        workType: work_type,
      });
      const attrs = [work_type, activity].filter(Boolean).join("/");
      const attrNote = attrs ? ` [${attrs}]` : "";
      const idNote = id ? ` (worklog id: ${id})` : "";
      return `Logged ${time_spent} on ${ticket_id}${attrNote}${idNote}`;
    },
  );
};
