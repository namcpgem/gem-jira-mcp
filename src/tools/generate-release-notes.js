import { z } from "zod";
import { jiraRequest } from "../jira-client.js";

export const registerGenerateReleaseNotes = (server) => {
  server.registerTool(
    "generate_release_notes",
    {
      description: "Generate Markdown release notes for a fix version, grouped by issue type",
      inputSchema: z.object({
        fix_version: z.string().describe("Release version label, e.g. \"v2.4\""),
        project: z.string().optional().describe("Limit to project key, e.g. \"GEM\""),
      }),
    },
    async ({ fix_version, project }) => {
      try {
        let jql = `fixVersion = "${fix_version}" AND status in (Done, Fixed, Resolved, Closed)`;
        if (project) jql += ` AND project = ${project}`;
        jql += " ORDER BY issuetype ASC";

        const params = new URLSearchParams({ jql, maxResults: "200", fields: "summary,issuetype,key" });
        const data = await jiraRequest("GET", `/search?${params}`);

        if (!data.issues?.length) {
          return { content: [{ type: "text", text: `No resolved issues found for version "${fix_version}"` }] };
        }

        const groups = { Story: [], Task: [], Bug: [], Other: [] };
        for (const issue of data.issues) {
          const type = issue.fields.issuetype?.name || "Other";
          if (type === "Story") groups.Story.push(issue);
          else if (type === "Task" || type === "Sub-task") groups.Task.push(issue);
          else if (type === "Bug") groups.Bug.push(issue);
          else groups.Other.push(issue);
        }

        const fmt = (issues) => issues.map((i) => `- ${i.key}: ${i.fields.summary}`).join("\n");
        const sections = [`# Release Notes — ${fix_version}\n`];
        if (groups.Story.length) sections.push(`## Features\n${fmt(groups.Story)}`);
        if (groups.Task.length) sections.push(`## Improvements\n${fmt(groups.Task)}`);
        if (groups.Bug.length) sections.push(`## Bug Fixes\n${fmt(groups.Bug)}`);
        if (groups.Other.length) sections.push(`## Other\n${fmt(groups.Other)}`);

        return { content: [{ type: "text", text: sections.join("\n\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );
};
