# Plan: Jira MCP Server — JavaScript (Jira Server/Data Center)

## Context

Build a Jira MCP server in plain JavaScript (Node.js, ESM) targeting the company's
Jira Server/Data Center instance (REST API v2). Fixes gaps in existing MCPs:

- Missing fields: `start_date`, `due_date`, `original_estimate` on create/update
- Missing tool: `link_issues`

Tools to implement (8 total):

| #   | Tool                     | Endpoint                                       |
| --- | ------------------------ | ---------------------------------------------- |
| 1   | `get_ticket`             | GET /rest/api/2/issue/{key}                    |
| 2   | `transition_ticket`      | GET + POST /rest/api/2/issue/{key}/transitions |
| 3   | `update_ticket`          | PUT /rest/api/2/issue/{key}                    |
| 4   | `add_comment`            | POST /rest/api/2/issue/{key}/comment           |
| 5   | `search_tickets`         | GET /rest/api/2/search?jql=...                 |
| 6   | `create_ticket`          | POST /rest/api/2/issue                         |
| 7   | `generate_release_notes` | GET /rest/api/2/search?jql=fixVersion=...      |
| 8   | `link_issues`            | POST /rest/api/2/issueLink                     |

---

## Phase 0: Documentation Discovery (DONE)

### Allowed APIs

SDK: `@modelcontextprotocol/sdk` v1.29.0+

- Import: `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'`
- Import: `import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'`
- Tool registration: `server.registerTool(name, { description, inputSchema }, handler)`
- `inputSchema`: Zod object `z.object({ ... })` — peer dep `zod@3`
- Handler return: `{ content: [{ type: 'text', text: string }], isError?: boolean }`
- Transport: `StdioServerTransport` — NEVER write to stdout in handlers, use `console.error`

Jira Server REST API v2 (company instance):

- Instance: `https://pm.gem-corp.tech` — Jira Server 8.5.19
- Base: `https://pm.gem-corp.tech/rest/api/2`
- Auth: Basic Auth `username:password` encoded as Base64
- No ADF — descriptions are plain text strings (not objects)
- `duedate`: standard field, format `YYYY-MM-DD`
- `start_date`: typically `customfield_XXXXX` — must discover per instance
- `original_estimate`: set via `timetracking: { originalEstimate: "2h" }`
- Story points: `customfield_XXXXX` — must discover per instance
- `link_issues`: POST /rest/api/2/issueLink with `{ type, inwardIssue, outwardIssue }`
- Transitions: GET /transitions to list IDs, then POST with `{ transition: { id } }`

### Anti-patterns

- Do NOT use ADF format (`{ version:1, type:"doc", content:[...] }`) — Jira Server uses plain text
- Do NOT hardcode story_points field ID — read from env or config
- Do NOT write to stdout — only stderr for logs
- Do NOT use `@modelcontextprotocol/server` (old package) — use `@modelcontextprotocol/sdk`

---

## Phase 1: Project Scaffold

Goal: Create the project structure, install deps, wire up an empty MCP server on stdio.

### Tasks

1. Create directory structure:

```
jira-mcp/
├── src/
│   ├── index.js          # entry point — creates server, registers all tools, connects stdio
│   ├── jira-client.js    # Jira API wrapper (fetch-based, handles auth + base URL)
│   └── tools/
│       ├── get-ticket.js
│       ├── transition-ticket.js
│       ├── update-ticket.js
│       ├── add-comment.js
│       ├── search-tickets.js
│       ├── create-ticket.js
│       ├── generate-release-notes.js
│       └── link-issues.js
├── package.json
└── .env.example
```

2. `package.json`:

```json
{
  "name": "jira-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^3.25.0",
    "dotenv": "^16.0.0"
  }
}
```

3. `.env.example`:

```
JIRA_HOST=https://pm.gem-corp.tech
JIRA_USERNAME=namcp
JIRA_PASSWORD=your_password
```

### Verification

- `npm install` succeeds with no errors
- `node src/index.js` starts without crashing (server logs to stderr)

---

## Phase 2: Jira Client

Goal: `src/jira-client.js` — thin HTTP wrapper around Jira REST API v2.

### Pattern (copy from Phase 0 findings)

```js
// src/jira-client.js
import "dotenv/config";

const BASE = process.env.JIRA_HOST + "/rest/api/2";
const AUTH = Buffer.from(
  `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`,
).toString("base64");
const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function jiraRequest(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
```

### Field ID helpers (read from env)

```js
export const FIELDS = {
  storyPoints: process.env.JIRA_STORY_POINTS_FIELD || "customfield_10016",
  startDate: process.env.JIRA_START_DATE_FIELD || "customfield_10015",
};
```

### Verification

- `jiraRequest('GET', '/issue/PROJ-1')` returns issue data without error
- 4xx errors throw with readable message

---

## Phase 3: Tool — `get_ticket`

File: `src/tools/get-ticket.js`

Input schema:

```js
z.object({
  ticket_id: z.string().describe("Jira issue key, e.g. GEM-234"),
});
```

Handler:

1. `GET /issue/{ticket_id}?expand=transitions`
2. Extract: summary, status.name, description, assignee.displayName, subtasks[], duedate, customfield for start_date
3. Return formatted text

---

## Phase 4: Tool — `transition_ticket`

File: `src/tools/transition-ticket.js`

Input schema:

```js
z.object({
  ticket_id: z.string(),
  status: z.string().describe('Target status name, e.g. "In Progress"'),
});
```

Handler:

1. `GET /issue/{ticket_id}/transitions` — get available transitions
2. Find transition where `name.toLowerCase() === status.toLowerCase()` (or fuzzy match)
3. `POST /issue/{ticket_id}/transitions` with `{ transition: { id } }`
4. Return success/error

---

## Phase 5: Tool — `update_ticket`

File: `src/tools/update-ticket.js`

Input schema:

```js
z.object({
  ticket_id: z.string(),
  description: z.string().optional(),
  implementation_notes: z.string().optional(),
  story_points: z.number().optional(),
  labels: z.array(z.string()).optional(),
  due_date: z.string().optional().describe("YYYY-MM-DD"),
  start_date: z.string().optional().describe("YYYY-MM-DD"),
  original_estimate: z.string().optional().describe('e.g. "2h", "1d 4h"'),
});
```

Handler:

1. Build `fields` object from provided params
2. Map `story_points` → `FIELDS.storyPoints`
3. Map `start_date` → `FIELDS.startDate`
4. Map `due_date` → `duedate`
5. Map `original_estimate` → `timetracking: { originalEstimate }`
6. If `implementation_notes`: append to description (fetch current, then append section)
7. `PUT /issue/{ticket_id}` with built fields
8. Return success

---

## Phase 6: Tool — `add_comment`

File: `src/tools/add-comment.js`

Input schema:

```js
z.object({
  ticket_id: z.string(),
  body: z.string().describe("Comment text (plain text for Jira Server)"),
});
```

Handler:

1. `POST /issue/{ticket_id}/comment` with `{ body: body_string }`
2. Return comment URL from response

---

## Phase 7: Tool — `search_tickets`

File: `src/tools/search-tickets.js`

Input schema:

```js
z.object({
  jql: z.string().describe("JQL query string"),
  max_results: z.number().default(50).optional(),
});
```

Handler:

1. `GET /search?jql={encoded_jql}&maxResults={max_results}&fields=summary,status,assignee,priority`
2. Return formatted list: `KEY | Summary | Status | Assignee`

---

## Phase 8: Tool — `create_ticket`

File: `src/tools/create-ticket.js`

Input schema:

```js
z.object({
  project: z.string().describe("Project key, e.g. GEM"),
  summary: z.string(),
  issue_type: z.string().describe("Story, Task, Bug, Sub-task"),
  body: z.string().optional().describe("Description"),
  parent_key: z.string().optional().describe("Parent ticket for sub-task"),
  due_date: z.string().optional().describe("YYYY-MM-DD"),
  start_date: z.string().optional().describe("YYYY-MM-DD"),
  original_estimate: z.string().optional().describe('e.g. "2h"'),
  story_points: z.number().optional(),
  labels: z.array(z.string()).optional(),
});
```

Handler:

1. Build `fields` object with all provided params
2. Sub-task: add `parent: { key: parent_key }` to fields
3. `POST /issue` with fields
4. Return new issue key + URL

---

## Phase 9: Tool — `generate_release_notes`

File: `src/tools/generate-release-notes.js`

Input schema:

```js
z.object({
  fix_version: z.string().describe('Release version label, e.g. "v2.4"'),
  project: z.string().optional().describe("Limit to project key"),
});
```

Handler:

1. Build JQL: `fixVersion = "{fix_version}"` + optional `AND project = {project}`
   - ` AND status in (Done, Fixed, Resolved) ORDER BY issuetype`
2. `GET /search?jql=...&maxResults=200&fields=summary,issuetype,key`
3. Group by issuetype: Features (Story), Improvements (Task), Bug Fixes (Bug)
4. Return Markdown release notes

---

## Phase 10: Tool — `link_issues` (NEW)

File: `src/tools/link-issues.js`

Input schema:

```js
z.object({
  inward_issue: z.string().describe("Issue key being linked FROM, e.g. GEM-1"),
  outward_issue: z.string().describe("Issue key being linked TO, e.g. GEM-2"),
  link_type: z
    .string()
    .default("Blocks")
    .describe("Link type name: Blocks, Clones, Relates to, Duplicate, etc."),
});
```

Handler:

1. `POST /issueLink` with:

```json
{
  "type": { "name": link_type },
  "inwardIssue": { "key": inward_issue },
  "outwardIssue": { "key": outward_issue }
}
```

2. Response is 201 No Content on success
3. Return formatted confirmation

Note: To list available link types: `GET /issueLinkType`

---

## Phase 11: Wire Everything in `src/index.js`

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";

import { registerGetTicket } from "./tools/get-ticket.js";
import { registerTransitionTicket } from "./tools/transition-ticket.js";
import { registerUpdateTicket } from "./tools/update-ticket.js";
import { registerAddComment } from "./tools/add-comment.js";
import { registerSearchTickets } from "./tools/search-tickets.js";
import { registerCreateTicket } from "./tools/create-ticket.js";
import { registerGenerateReleaseNotes } from "./tools/generate-release-notes.js";
import { registerLinkIssues } from "./tools/link-issues.js";

const server = new McpServer({ name: "jira-mcp", version: "1.0.0" });

registerGetTicket(server);
registerTransitionTicket(server);
registerUpdateTicket(server);
registerAddComment(server);
registerSearchTickets(server);
registerCreateTicket(server);
registerGenerateReleaseNotes(server);
registerLinkIssues(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Jira MCP server running on stdio");
```

### MCP Config for Claude (claude_desktop_config.json / .claude/settings.json)

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["d:/ws/lab/jira-mcp/src/index.js"],
      "env": {
        "JIRA_HOST": "https://jira.yourcompany.com",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password",
        "JIRA_STORY_POINTS_FIELD": "customfield_10016",
        "JIRA_START_DATE_FIELD": "customfield_10015"
      }
    }
  }
}
```

---

## Phase 12: Verification Checklist

For each tool, run via Claude or MCP Inspector:

- [ ] `get_ticket("PROJ-1")` — returns summary, status, description
- [ ] `transition_ticket("PROJ-1", "In Progress")` — status changes in Jira
- [ ] `update_ticket("PROJ-1", { due_date: "2026-07-01", original_estimate: "4h" })` — fields updated
- [ ] `update_ticket("PROJ-1", { start_date: "2026-06-28" })` — start_date updated
- [ ] `add_comment("PROJ-1", "test comment")` — comment appears in Jira
- [ ] `search_tickets('project = PROJ AND status = "In Progress"')` — returns list
- [ ] `create_ticket("PROJ", "Test task", "Task", { due_date, start_date, original_estimate })` — ticket created with all fields
- [ ] `generate_release_notes("v1.0", "PROJ")` — Markdown output grouped by type
- [ ] `link_issues("PROJ-1", "PROJ-2", "Blocks")` — link appears in Jira

### Anti-pattern grep checks

```bash
# Should return 0 results (no ADF format used)
grep -r '"type": "doc"' src/

# Should return 0 (no stdout writes in handlers)
grep -r 'console.log' src/
```

---

## Discovery Tasks Before Coding

Before Phase 2, run these against the actual Jira instance to get real field IDs:

```bash
# Get all fields for an existing issue (replace PROJ-1 with real ticket)
curl -u username:password https://jira.company.com/rest/api/2/issue/PROJ-1 | jq '.fields | keys'

# Get story points field name
curl -u username:password https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|SP"; "i")) | {id, name}'

# Get start date field name
curl -u username:password https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("start"; "i")) | {id, name}'

# Get available link types
curl -u username:password https://jira.company.com/rest/api/2/issueLinkType | jq '.issueLinkTypes[].name'
```
