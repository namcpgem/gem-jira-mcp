import {z} from "zod";
import {defineTool} from "../../define-tool.js";

export const registerAddWatcher = (server, jiraRequest) => {
  defineTool(
    server,
    "add_watcher",
    {
      description: "Add a user as a watcher of a Jira ticket",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        // min(1): an empty string is falsy, so jiraRequest would send no body.
        username: z.string().min(1).describe("Jira username to add"),
      }),
    },
    async ({ticket_id, username}, jira) => {
      // Jira Data Center takes the bare username as a JSON string body.
      await jira("POST", `/issue/${ticket_id}/watchers`, username);
      return `${username} is now watching ${ticket_id}`;
    },
    jiraRequest,
  );
};
