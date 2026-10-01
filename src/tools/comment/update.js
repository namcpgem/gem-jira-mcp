import {z} from "zod";
import {defineTool} from "../../define-tool.js";

export const registerUpdateComment = (server, jiraRequest) => {
  defineTool(
    server,
    "update_comment",
    {
      description:
        "Replace the text of an existing comment on a Jira ticket. Comment IDs are shown by get_ticket with include_comments.",
      inputSchema: z.object({
        body: z.string().describe("New comment text (plain text)"),
        comment_id: z.string().describe("Comment ID, e.g. 10001"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, comment_id, body}, jira) => {
      await jira("PUT", `/issue/${ticket_id}/comment/${comment_id}`, {body});
      return `Comment updated: ${process.env.JIRA_HOST}/browse/${ticket_id}?focusedCommentId=${comment_id}`;
    },
    jiraRequest,
  );
};
