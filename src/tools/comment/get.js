import {z} from "zod";
import {defineTool} from "../../define-tool.js";
import {jiraDownload} from "../../jira-client.js";
import {fetchImages, IMAGE_LIMIT_MAX} from "../ticket/get.js";

// Jira wiki markup embeds an attachment as !name.png! or !name.png|width=520!.
const referencedFiles = (body) =>
  new Set([...body.matchAll(/!([^!|\n]+)(?:\|[^!\n]*)?!/g)].map((m) => m[1]));

export const registerGetComment = (
  server,
  jiraRequest,
  download = jiraDownload,
) => {
  defineTool(
    server,
    "get_comment",
    {
      description:
        "Get one comment of a Jira ticket by its ID, e.g. from a ?focusedCommentId= link. Cheaper than get_ticket when only that comment matters.",
      inputSchema: z.object({
        comment_id: z.string().describe("Comment ID, e.g. 10001"),
        include_images: z
          .boolean()
          .optional()
          .describe(
            "Return the image attachments this comment embeds as viewable images (default false)",
          ),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async ({ticket_id, comment_id, include_images}, jira) => {
      const c = await jira("GET", `/issue/${ticket_id}/comment/${comment_id}`);
      const text = `#${c.id} [${c.created?.slice(0, 10)}] ${c.author?.displayName || "Unknown"}: ${c.body}`;
      if (!include_images) return text;
      const refs = referencedFiles(c.body || "");
      if (!refs.size) return text;
      const {fields} = await jira(
        "GET",
        `/issue/${ticket_id}?fields=attachment`,
      );
      const attachments = (fields.attachment || []).filter((a) =>
        refs.has(a.filename),
      );
      const images = await fetchImages(attachments, download, IMAGE_LIMIT_MAX);
      const full = images.notes.length
        ? `${text}\nImages:\n${images.notes.join("\n")}`
        : text;
      if (!images.blocks.length) return full;
      return [{text: full, type: "text"}, ...images.blocks];
    },
    jiraRequest,
  );
};
