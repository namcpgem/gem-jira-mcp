import {z} from "zod";
import {defineTool} from "../../define-tool.js";
import {jiraDownload} from "../../jira-client.js";
import {START_DATE_FIELD} from "../../ticket-fields.js";

// Formats MCP clients can render as images; SVG and the rest stay name-only.
const IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Each image costs the caller far more tokens than the whole text response.
// Claude's vision limits are on base64 size: 5 MB per image on Bedrock and
// Google Cloud (10 MB on the Claude API), 32 MB per request, and the images
// are resent on every later turn. So budget base64 bytes, well under those.
// No resizing: the API downscales oversized images itself, which already
// caps their token cost.
// The caller can raise the count up to IMAGE_LIMIT_MAX; the byte budget
// below still applies, so more images never means a bigger request. Max 20:
// past 20 images in one request Claude applies a stricter per-image limit.
const IMAGE_LIMIT = 5;
const IMAGE_LIMIT_MAX = 20;
const IMAGE_MAX_B64 = 5_000_000;
const IMAGES_TOTAL_B64 = 10_000_000;
const b64Size = (bytes) => Math.ceil(bytes / 3) * 4;

const fetchImages = async (attachments, download, limit) => {
  const images = attachments.filter((a) => IMAGE_TYPES.has(a.mimeType));
  const picked = [];
  let budget = IMAGES_TOTAL_B64;
  for (const a of images) {
    const size = b64Size(a.size);
    if (picked.length === limit) break;
    if (size > IMAGE_MAX_B64 || size > budget) continue;
    picked.push(a);
    budget -= size;
  }
  const results = await Promise.allSettled(
    picked.map((a) => download(a.content)),
  );
  const blocks = [];
  const notes = [];
  results.forEach((r, i) => {
    const a = picked[i];
    if (r.status === "fulfilled") {
      notes.push(`  [image ${blocks.length + 1}] ${a.filename}`);
      blocks.push({data: r.value, mimeType: a.mimeType, type: "image"});
    } else notes.push(`  ${a.filename}: download failed (${r.reason.message})`);
  });
  const skipped = images.length - picked.length;
  if (skipped)
    notes.push(
      `  ${skipped} more image(s) not shown (max ${limit} images, ~3.7 MB each, ~7.5 MB total)`,
    );
  return {blocks, notes};
};

// A busy ticket can carry hundreds of comments; returning them all would cost
// the caller more tokens than the rest of the server put together. The newest
// are the ones that answer questions, and the header admits what was cut.
const COMMENT_LIMIT = 20;

const formatComments = ({comments = [], total = 0} = {}) => {
  if (!comments.length) return "Comments: None";
  const shown = comments.slice(-COMMENT_LIMIT);
  const body = shown
    .map(
      (c) =>
        `  [${c.created?.slice(0, 10)}] ${c.author?.displayName || "Unknown"}: ${c.body}`,
    )
    .join("\n");
  // Jira can also cap the inline list, so trust its total over what arrived.
  const all = Math.max(total, comments.length);
  const count =
    shown.length < all ? `${shown.length} most recent of ${all}` : all;
  return `Comments (${count}):\n${body}`;
};

export const registerGetTicket = (
  server,
  jiraRequest,
  download = jiraDownload,
) => {
  defineTool(
    server,
    "get_ticket",
    {
      description: "Get full details of a Jira ticket by its key",
      inputSchema: z.object({
        image_limit: z
          .number()
          .int()
          .min(1)
          .max(IMAGE_LIMIT_MAX)
          .optional()
          .describe(
            `Max images to return with include_images (default ${IMAGE_LIMIT}, max ${IMAGE_LIMIT_MAX}); the total size cap still applies`,
          ),
        include_comments: z
          .boolean()
          .optional()
          .describe("Include the ticket's comments (default false)"),
        include_images: z
          .boolean()
          .optional()
          .describe(
            "Return image attachments (screenshots referenced as !name.png! in the description/comments) as viewable images (default false)",
          ),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async (
      {ticket_id, include_comments, include_images, image_limit},
      jira,
    ) => {
      const issue = await jira("GET", `/issue/${ticket_id}`);
      const f = issue.fields;
      const subtasks = (f.subtasks || [])
        .map((s) => `  - ${s.key}: ${s.fields.summary}`)
        .join("\n");
      // Unset fields are omitted rather than printed as "Not set" — the caller
      // is an LLM paying tokens for every line.
      const line = (label, value) => (value ? `${label}: ${value}` : null);
      const attachments = f.attachment || [];
      const images = include_images
        ? await fetchImages(attachments, download, image_limit ?? IMAGE_LIMIT)
        : {blocks: [], notes: []};
      const text = [
        `Key: ${issue.key}`,
        `Summary: ${f.summary}`,
        `Status: ${f.status?.name}`,
        `Assignee: ${f.assignee?.displayName || "Unassigned"}`,
        line("Reporter", f.reporter?.displayName),
        line("Priority", f.priority?.name),
        line("Start Date", f[START_DATE_FIELD]),
        line("Due Date", f.duedate),
        line("Original Estimate", f.timetracking?.originalEstimate),
        line("Labels", (f.labels || []).join(", ")),
        f.description ? `Description:\n${f.description}` : null,
        subtasks ? `Subtasks:\n${subtasks}` : null,
        include_comments ? formatComments(f.comment) : null,
        line("Attachments", attachments.map((a) => a.filename).join(", ")),
        images.notes.length ? `Images:\n${images.notes.join("\n")}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      if (!images.blocks.length) return text;
      return [{text, type: "text"}, ...images.blocks];
    },
    jiraRequest,
  );
};
