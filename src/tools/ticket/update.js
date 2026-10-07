import {z} from "zod";
import {defineTool} from "../../define-tool.js";
import {EPIC_LINK_FIELD, START_DATE_FIELD} from "../../ticket-fields.js";

// Jira's REST API silently ignores certain field writes (issue-type/Sub-task
// conversions in particular) instead of rejecting the request, so callers
// that depend on the write actually landing need to re-read and compare.
const verifyFieldApplied = async (
  jira,
  ticket_id,
  {expected, field, hint, label, noneText = "", readActual},
) => {
  const check = await jira("GET", `/issue/${ticket_id}?fields=${field}`);
  const actual = readActual(check.fields);
  if (actual !== expected) {
    throw new Error(
      `${ticket_id} was updated, but Jira did not apply the ${label} change ` +
        `(still "${actual || noneText}"). ${hint}`,
    );
  }
};

export const registerUpdateTicket = (server, jiraRequest) => {
  defineTool(
    server,
    "update_ticket",
    {
      description:
        "Update fields of a Jira ticket. Converting between a standard issue " +
        'type and Sub-task is a Jira REST API limitation — use Jira\'s UI "Move" action instead.',
      inputSchema: z.object({
        assignee: z
          .string()
          .optional()
          .describe("Username to assign, or empty string to unassign"),
        description: z.string().optional().describe("Replace full description"),
        due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        epic_key: z
          .string()
          .optional()
          .describe(
            "Epic ticket key to set as this issue's Epic Link (shows under " +
              'the Epic\'s "Issues in Epic" panel, not Linked Issues)',
          ),
        implementation_notes: z
          .string()
          .optional()
          .describe("Append implementation notes to description"),
        issue_type: z
          .string()
          .optional()
          .describe(
            'Issue type name exactly as defined in the project, e.g. Story, Task, Bug, Sub-task, or a custom type like "QA Sub-Task"',
          ),
        labels: z.array(z.string()).optional().describe("Labels to set"),
        original_estimate: z
          .string()
          .optional()
          .describe('Time estimate e.g. "2h", "1d 4h"'),
        parent_key: z
          .string()
          .optional()
          .describe(
            "Parent ticket key for any sub-task type (Sub-task or a custom one)",
          ),
        priority: z
          .string()
          .optional()
          .describe('Priority name, e.g. "High", "Medium", "Low"'),
        start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
        summary: z.string().optional().describe("Replace ticket summary/title"),
        ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
      }),
    },
    async (
      {
        ticket_id,
        summary,
        description,
        implementation_notes,
        issue_type,
        parent_key,
        epic_key,
        labels,
        due_date,
        start_date,
        original_estimate,
        assignee,
        priority,
      },
      jira,
    ) => {
      const fields = {};

      if (summary !== undefined) fields.summary = summary;
      if (description !== undefined) fields.description = description;
      if (assignee !== undefined) {
        fields.assignee = assignee ? {name: assignee} : null;
      }

      if (implementation_notes !== undefined) {
        const current = await jira(
          "GET",
          `/issue/${ticket_id}?fields=description`,
        );
        const existing = current.fields.description || "";
        fields.description =
          existing +
          "\n\n--- Implementation Notes ---\n" +
          implementation_notes;
      }

      if (issue_type !== undefined) fields.issuetype = {name: issue_type};
      if (priority !== undefined) fields.priority = {name: priority};
      if (parent_key !== undefined) fields.parent = {key: parent_key};
      if (epic_key !== undefined) fields[EPIC_LINK_FIELD] = epic_key;
      if (labels !== undefined) fields.labels = labels;
      if (due_date !== undefined) fields.duedate = due_date;
      if (start_date !== undefined) fields[START_DATE_FIELD] = start_date;

      const body = {fields};

      if (original_estimate !== undefined) {
        body.update = {
          timetracking: [{edit: {originalEstimate: original_estimate}}],
        };
      }

      if (Object.keys(fields).length === 0 && !body.update) {
        throw new Error("No fields provided to update");
      }

      await jira("PUT", `/issue/${ticket_id}`, body);

      if (parent_key !== undefined) {
        await verifyFieldApplied(jira, ticket_id, {
          expected: parent_key,
          field: "parent",
          hint: 'The Parent field is only editable on Sub-task issues, and Jira\'s REST API cannot convert an issue type to Sub-task directly. Use the Jira UI "Move" action: first convert the ticket to Task (if not already), then convert Task → Sub-task and set the parent in that same Move step.',
          label: "parent",
          noneText: "no parent",
          readActual: (f) => f.parent?.key,
        });
      }

      if (issue_type !== undefined) {
        await verifyFieldApplied(jira, ticket_id, {
          expected: issue_type,
          field: "issuetype",
          hint: 'Jira\'s REST API silently rejects conversions between standard issue types and Sub-task. Use the "Move" action in the Jira UI instead, or create a new Sub-task and migrate the content.',
          label: "issue type",
          readActual: (f) => f.issuetype.name,
        });
      }

      if (epic_key !== undefined) {
        await verifyFieldApplied(jira, ticket_id, {
          expected: epic_key,
          field: EPIC_LINK_FIELD,
          hint: "Epic Link can only be set on standard issue types (Story/Task/Bug), not on Sub-tasks or Epics themselves.",
          label: "Epic Link",
          noneText: "no epic",
          readActual: (f) => f[EPIC_LINK_FIELD],
        });
      }

      return `${ticket_id} updated successfully`;
    },
    jiraRequest,
  );
};
