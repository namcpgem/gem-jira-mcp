import {z} from "zod";
import {defineTool} from "../define-tool.js";

const NOT_SHIPPED = /cancel|reject|duplicat|won't/i;

export const registerGenerateReleaseNotes = (server, jiraRequest) => {
  defineTool(
    server,
    "generate_release_notes",
    {
      description:
        "Generate Markdown release notes for a fix version, grouped by issue type",
      inputSchema: z.object({
        fix_version: z.string().describe('Release version label, e.g. "v2.4"'),
        project: z
          .string()
          .optional()
          .describe('Limit to project key, e.g. "GEM"'),
      }),
    },
    async ({fix_version, project}, jira) => {
      // Status names differ per workflow, and JQL rejects the whole query (400)
      // if one named status does not exist, so match the category instead.
      let jql = `fixVersion = "${fix_version}" AND statusCategory = Done`;
      if (project) jql += ` AND project = ${project}`;
      jql += " ORDER BY issuetype ASC";

      const params = new URLSearchParams({
        fields: "summary,issuetype,status",
        jql,
        maxResults: "200",
      });
      const data = await jira("GET", `/search?${params}`);
      // The Done category also holds work that never shipped. Filtered here,
      // not in JQL, for the same reason as above.
      // ponytail: name heuristic; list excluded statuses in config if it misses
      const issues = (data.issues || []).filter(
        (i) => !NOT_SHIPPED.test(i.fields.status?.name || ""),
      );

      if (!issues.length) {
        return `No resolved issues found for version "${fix_version}"`;
      }

      const groups = {Bug: [], Other: [], Story: [], Task: []};
      for (const issue of issues) {
        const type = issue.fields.issuetype?.name || "Other";
        if (type === "Story") groups.Story.push(issue);
        else if (type === "Task" || type === "Sub-task")
          groups.Task.push(issue);
        else if (type === "Bug") groups.Bug.push(issue);
        else groups.Other.push(issue);
      }

      const fmt = (issues) =>
        issues.map((i) => `- ${i.key}: ${i.fields.summary}`).join("\n");
      const sections = [`# Release Notes — ${fix_version}\n`];
      if (groups.Story.length)
        sections.push(`## Features\n${fmt(groups.Story)}`);
      if (groups.Task.length)
        sections.push(`## Improvements\n${fmt(groups.Task)}`);
      if (groups.Bug.length) sections.push(`## Bug Fixes\n${fmt(groups.Bug)}`);
      if (groups.Other.length) sections.push(`## Other\n${fmt(groups.Other)}`);

      return sections.join("\n\n");
    },
    jiraRequest,
  );
};
