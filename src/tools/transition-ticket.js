import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

export const registerTransitionTicket = (server) => {
  server.registerTool(
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
    async ({ticket_id, status}) => {
      try {
        const {transitions} = await jiraRequest(
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
          return {
            content: [
              {
                text: `Status "${status}" not found. Available: ${available}`,
                type: "text",
              },
            ],
            isError: true,
          };
        }
        await jiraRequest("POST", `/issue/${ticket_id}/transitions`, {
          transition: {id: match.id},
        });
        return {
          content: [
            {
              text: `${ticket_id} transitioned to "${match.name}"`,
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
