import {z} from "zod";
import {defineTool} from "../../define-tool.js";

export const registerDeleteComment = (server, jiraRequest) => {
  defineTool(
    server,
    "delete_comment",
    {
      description:
        "Delete a comment from a Jira ticket. This cannot be undone. Comment IDs are shown by get_ticket with include_comments.",
      inputSchema: z.object({
        comment_id: z.string().describe("Comment ID, e.g. 10001"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, comment_id}, jira) => {
      await jira("DELETE", `/issue/${ticket_id}/comment/${comment_id}`);
      return `Comment ${comment_id} deleted from ${ticket_id}`;
    },
    jiraRequest,
  );
};
