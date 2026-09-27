import {z} from "zod";
import {defineTool} from "../define-tool.js";

// A link type is addressable by its name ("Bugs") or by either verb ("is bug
// of", "has bug"), since callers usually say the relation, not the type.
const namesOf = (type) =>
  [type.name, type.inward, type.outward].map((n) => n.toLowerCase());

export const registerUnlinkIssues = (server, jiraRequest) => {
  defineTool(
    server,
    "unlink_issues",
    {
      description:
        "Remove a link between two Jira tickets. Direction does not matter. If several links connect them, pass link_type to pick one.",
      inputSchema: z.object({
        link_type: z
          .string()
          .optional()
          .describe(
            'Link type name or verb, e.g. "Blocks", "Relates", "is bug of"',
          ),
        linked_ticket_id: z
          .string()
          .describe("The other issue key, e.g. GEM-2"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-1"),
      }),
    },
    async ({ticket_id, linked_ticket_id, link_type}, jira) => {
      const issue = await jira("GET", `/issue/${ticket_id}?fields=issuelinks`);
      const other = linked_ticket_id.trim().toUpperCase();
      const between = (issue.fields.issuelinks || []).filter(
        (l) => (l.outwardIssue || l.inwardIssue)?.key === other,
      );
      const want = link_type?.trim().toLowerCase();
      const matches = want
        ? between.filter((l) => namesOf(l.type).includes(want))
        : between;
      const describe = (l) =>
        `${issue.key} ${l.outwardIssue ? l.type.outward : l.type.inward} ${other}`;
      const existing = between.map(describe).join("; ");

      if (!matches.length) {
        const which = link_type ? `"${link_type}" link` : "link";
        throw new Error(
          `No ${which} between ${issue.key} and ${other}` +
            (existing ? `. Existing: ${existing}` : ""),
        );
      }
      // Deleting is not undoable, so an ambiguous request removes nothing.
      if (matches.length > 1) {
        throw new Error(
          `${matches.length} links between ${issue.key} and ${other} (${matches.map(describe).join("; ")}); pass link_type to pick one`,
        );
      }
      await jira("DELETE", `/issueLink/${matches[0].id}`);
      return `Removed link: ${describe(matches[0])}`;
    },
    jiraRequest,
  );
};
