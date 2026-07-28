import {z} from "zod";
import {defineTool} from "../define-tool.js";

export const registerTransitionTicket = (server, jiraRequest) => {
  defineTool(
    server,
    "transition_ticket",
    {
      description: "Change the status of a Jira ticket by status name",
      inputSchema: z.object({
        status: z
          .string()
          .describe('Target status name, e.g. "In Progress", "Done"'),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, status}, jira) => {
      const {transitions} = await jira(
        "GET",
        `/issue/${ticket_id}/transitions`,
      );
      const match =
        transitions.find(
          (t) => t.name.toLowerCase() === status.toLowerCase(),
        ) ||
        transitions.find((t) =>
          t.name.toLowerCase().includes(status.toLowerCase()),
        );
      if (!match) {
        const available = transitions.map((t) => t.name).join(", ");
        throw new Error(
          `Status "${status}" not found. Available: ${available}`,
        );
      }
      await jira("POST", `/issue/${ticket_id}/transitions`, {
        transition: {id: match.id},
      });
      return `${ticket_id} transitioned to "${match.name}"`;
    },
    jiraRequest,
  );
};
