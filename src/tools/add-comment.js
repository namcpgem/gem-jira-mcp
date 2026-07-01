import {z} from "zod";
import {jiraRequest} from "../jira-client.js";

export const registerAddComment = (server) => {
  server.registerTool(
    "add_comment",
    {
      description: "Add a comment to a Jira ticket",
      inputSchema: z.object({
        body: z.string().describe("Comment text (plain text)"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, body}) => {
      try {
        const result = await jiraRequest(
          "POST",
          `/issue/${ticket_id}/comment`,
          {body},
        );
        const commentUrl = `${process.env.JIRA_HOST}/browse/${ticket_id}?focusedCommentId=${result.id}`;
        return {
          content: [{text: `Comment added: ${commentUrl}`, type: "text"}],
        };
      } catch (err) {
        return {content: [{text: err.message, type: "text"}], isError: true};
      }
    },
  );
};
