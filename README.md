# jira-mcp

MCP server for Jira Server/Data Center (REST API v2). Written in Node.js ESM.

## Requirements

- Node.js 18+
- Access to a Jira Server or Data Center instance

## Setup

```bash
pnpm install
cp .env.example .env
# edit .env with your credentials
```

## Environment variables

| Variable                | Required | Description                                                                                |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `JIRA_HOST`             | yes      | Base URL, e.g. `https://jira.company.com`                                                  |
| `JIRA_USERNAME`         | yes      | Jira username                                                                              |
| `JIRA_PASSWORD`         | yes      | Jira password                                                                              |
| `JIRA_START_DATE_FIELD` | no       | Custom field ID for "Start date" (default `customfield_11300`, matches `pm.gem-corp.tech`) |

To discover custom field IDs on your instance:

```bash
curl -u user:pass https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|start"; "i")) | {id, name}'
```

## Build

```bash
pnpm build
```

Bundles the server into a single file at `dist/index.js` (via esbuild).

## Release

```bash
pnpm release
```

Builds the server and packages it into `release/jira-mcp-v<version>.zip`, containing:

- `index.js` — bundled server, no `node_modules` required
- `package.json` — name/version reference
- `README.md`
- `.env.example`

### Using the release zip (end users)

1. Extract `jira-mcp-v<version>.zip` to a folder, e.g. `C:\tools\jira-mcp`
2. Copy `.env.example` to `.env` in that folder and fill in your Jira credentials, **or** set the env vars directly in your MCP client config (see below)
3. Point your MCP client at the extracted `index.js` — no `npm install`/`pnpm install` needed, the file is self-contained

## Claude Code config

Add to `.claude/settings.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["/path/to/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_HOST": "https://jira.company.com",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password"
      }
    }
  }
}
```

Adjust the path in `args` to wherever you extracted the release zip. For local development from source, point `args` at `src/index.js` instead.

## Tools

| Tool                     | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `get_ticket`             | Get ticket details (summary, status, description, assignee, subtasks)                   |
| `search_tickets`         | Search using JQL                                                                        |
| `create_ticket`          | Create issue with due date, start date, estimate, labels, parent (Sub-task)             |
| `update_ticket`          | Update summary, description, issue type, parent, labels, due date, start date, estimate |
| `transition_ticket`      | Change ticket status by name                                                            |
| `add_comment`            | Add a comment                                                                           |
| `log_work`               | Log time spent                                                                          |
| `link_issues`            | Create issue links (Blocks, Relates to, etc.)                                           |
| `generate_release_notes` | Generate Markdown release notes for a fix version                                       |

## Notes

- Jira Server uses plain text for descriptions — no ADF format
- `duedate` is a standard field (`YYYY-MM-DD`)
- All logs go to stderr; stdout is reserved for MCP protocol
