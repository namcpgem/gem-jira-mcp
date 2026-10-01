import {z} from "zod";
import {defineTool} from "../../define-tool.js";

const AGILE = "/rest/agile/1.0";

// Callers know sprints by name, the Agile API only by ID. Collect the active
// and future sprints of the scrum boards of the tickets' project; kanban
// boards have no sprints and reject the sprint listing.
// ponytail: first page of boards and sprints only (50 each), page if a project outgrows it.
const openSprints = async (jira, project) => {
  const {values: boards = []} = await jira(
    "GET",
    `${AGILE}/board?projectKeyOrId=${encodeURIComponent(project)}`,
  );
  const sprints = new Map();
  for (const board of boards.filter((b) => b.type === "scrum")) {
    const {values = []} = await jira(
      "GET",
      `${AGILE}/board/${board.id}/sprint?state=active,future`,
    );
    for (const s of values) sprints.set(s.id, s);
  }
  return [...sprints.values()];
};

export const registerMoveToSprint = (server, jiraRequest) => {
  defineTool(
    server,
    "move_to_sprint",
    {
      description:
        "Move Jira tickets into an active or future sprint, by sprint name or ID",
      inputSchema: z.object({
        sprint: z
          .string()
          .describe('Sprint name (e.g. "GEM Sprint 12") or numeric sprint ID'),
        ticket_ids: z
          .array(z.string())
          .min(1)
          .describe('Issue keys to move, e.g. ["GEM-1", "GEM-2"]'),
      }),
    },
    async ({ticket_ids, sprint}, jira) => {
      const issues = ticket_ids.map((k) => k.trim().toUpperCase());
      let id = sprint.trim();
      let name = id;
      if (!/^\d+$/.test(id)) {
        const project = issues[0].split("-")[0];
        const sprints = await openSprints(jira, project);
        const matches = sprints.filter(
          (s) => s.name.toLowerCase() === id.toLowerCase(),
        );
        if (matches.length !== 1) {
          const list = sprints.map((s) => `${s.name} (${s.id}, ${s.state})`);
          throw new Error(
            (matches.length
              ? `${matches.length} sprints named "${sprint}"; pass the sprint ID. `
              : `No active or future sprint named "${sprint}" in ${project}. `) +
              (list.length
                ? `Open sprints: ${list.join("; ")}`
                : "No open sprints found"),
          );
        }
        id = String(matches[0].id);
        name = matches[0].name;
      }
      await jira("POST", `${AGILE}/sprint/${id}/issue`, {issues});
      return `Moved ${issues.join(", ")} to sprint ${name}`;
    },
    jiraRequest,
  );
};
