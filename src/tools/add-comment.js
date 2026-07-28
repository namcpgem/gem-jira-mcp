import {z} from "zod";
import {defineTool} from "../define-tool.js";

export const registerAddComment = (server, jiraRequest) => {
  defineTool(
    server,
    "add_comment",
    {
      description: "Add a comment to a Jira ticket",
      inputSchema: z.object({
        body: z.string().describe("Comment text (plain text)"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, body}, jira) => {
      const result = await jira("POST", `/issue/${ticket_id}/comment`, {body});
      const commentUrl = `${process.env.JIRA_HOST}/browse/${ticket_id}?focusedCommentId=${result.id}`;
      return `Comment added: ${commentUrl}`;
    },
    jiraRequest,
  );
};
