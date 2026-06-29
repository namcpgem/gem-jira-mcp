import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerAddComment = (server) => {
  server.registerTool(
    "add_comment",
    {
      description: "Add a comment to a Jira ticket",
      inputSchema: z.object({
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
        body: z.string().describe("Comment text (plain text)"),
      }),
    },
    async ({ ticket_id, body }) => {
      try {
        const result = await jiraRequest("POST", `/issue/${ticket_id}/comment`, { body });
        const commentUrl = `${process.env.JIRA_HOST}/browse/${ticket_id}?focusedCommentId=${result.id}`;
        return { content: [{ type: "text", text: `Comment added: ${commentUrl}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
