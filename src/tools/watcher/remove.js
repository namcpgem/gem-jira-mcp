import {z} from "zod";
import {defineTool} from "../../define-tool.js";

export const registerRemoveWatcher = (server, jiraRequest) => {
  defineTool(
    server,
    "remove_watcher",
    {
      description: "Remove a user from the watchers of a Jira ticket",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        username: z.string().min(1).describe("Jira username to remove"),
      }),
    },
    async ({ticket_id, username}, jira) => {
      await jira(
        "DELETE",
        `/issue/${ticket_id}/watchers?username=${encodeURIComponent(username)}`,
      );
      return `${username} no longer watches ${ticket_id}`;
    },
    jiraRequest,
  );
};
