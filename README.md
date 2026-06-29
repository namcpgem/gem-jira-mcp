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

| Variable        | Required | Description                               |
| --------------- | -------- | ----------------------------------------- |
| `JIRA_HOST`     | yes      | Base URL, e.g. `https://jira.company.com` |
| `JIRA_USERNAME` | yes      | Jira username                             |
| `JIRA_PASSWORD` | yes      | Jira password                             |

To discover custom field IDs on your instance:

```bash
curl -u user:pass https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|start"; "i")) | {id, name}'
```

## Claude Code config

Add to `.claude/settings.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["/path/to/jira-mcp/src/index.js"],
      "env": {
        "JIRA_HOST": "https://jira.company.com",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password"
      }
    }
  }
}
```

## Tools

| Tool                     | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `get_ticket`             | Get ticket details (summary, status, description, assignee, subtasks) |
| `search_tickets`         | Search using JQL                                                      |
| `create_ticket`          | Create issue with due date, start date, estimate, story points        |
| `update_ticket`          | Update fields, description, estimate, labels                          |
| `transition_ticket`      | Change ticket status by name                                          |
| `add_comment`            | Add a comment                                                         |
| `log_work`               | Log time spent                                                        |
| `link_issues`            | Create issue links (Blocks, Relates to, etc.)                         |
| `generate_release_notes` | Generate Markdown release notes for a fix version                     |

## Notes

- Jira Server uses plain text for descriptions — no ADF format
- `duedate` is a standard field (`YYYY-MM-DD`)
- `start_date` is a custom field — verify the field ID on your instance
- All logs go to stderr; stdout is reserved for MCP protocol
