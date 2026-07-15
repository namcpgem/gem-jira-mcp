# Jira mcp

MCP server for Jira Server/Data Center (REST API v2). Lets an AI assistant (Claude Code, Claude Desktop, ...) read and write your Jira directly.

## Requirements

- A Jira Server/Data Center account (username + password).
- Node.js 18+.

## Quick start

Use Claude Code CLI:

```bash
claude mcp add jira-mcp npx -y g-jira-mcp@latest \
  --env JIRA_HOST="https://jira.company.com" \
  --env JIRA_USERNAME="your_username" \
  --env JIRA_PASSWORD="your_password"
```

Or manually add to `.claude/settings.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "npx",
      "args": ["-y", "g-jira-mcp@latest"],
      "env": {
        "JIRA_HOST": "https://jira.company.com",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password"
      }
    }
  }
}
```

Restart Claude Code/Desktop after editing the config.

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

## Tools

| Tool                     | Description                                                                                                   | Key parameters                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_ticket`             | Get full details of a Jira ticket by its key                                                                  | `ticket_id`                                                                                                                                                              |
| `search_tickets`         | Search Jira tickets using JQL query language                                                                  | `jql`, `max_results` (optional, default 50)                                                                                                                              |
| `create_ticket`          | Create a new Jira ticket (Story, Task, Bug, Sub-task)                                                         | `project`, `summary`, `issue_type`, optional: `body`, `parent_key`, `due_date`, `start_date`, `original_estimate`, `labels`                                              |
| `update_ticket`          | Update fields of a Jira ticket (summary, description, type, parent, labels, dates, estimate, assignee, notes) | `ticket_id`, optional: `summary`, `description`, `issue_type`, `parent_key`, `labels`, `due_date`, `start_date`, `original_estimate`, `implementation_notes`, `assignee` |
| `transition_ticket`      | Change the status of a Jira ticket by status name                                                             | `ticket_id`, `status`                                                                                                                                                    |
| `add_comment`            | Add a comment to a Jira ticket                                                                                | `ticket_id`, `body`                                                                                                                                                      |
| `log_work`               | Log work (time) on a Jira ticket                                                                              | `ticket_id`, `time_spent`, optional: `comment`, `started`                                                                                                                |
| `link_issues`            | Create a link between two Jira tickets (e.g. Blocks, Relates to, Clones, Duplicate)                           | `inward_issue`, `outward_issue`, optional: `link_type` (default "Blocks")                                                                                                |
| `generate_release_notes` | Generate Markdown release notes for a fix version, grouped by issue type                                      | `fix_version`, optional: `project`                                                                                                                                       |

### Notes

- Jira Server uses plain text for descriptions — no ADF format.
- `duedate` is a standard field (`YYYY-MM-DD`); "Start date" is a custom field, configurable via `JIRA_START_DATE_FIELD`.
- `search_tickets` uses JQL syntax, e.g. `project = GEM AND status = 'In Progress'`.
- `transition_ticket` matches the target status by name and resolves the transition ID automatically.
- `update_ticket` only changes the fields you pass; omit a field to keep its current value. Pass `assignee=""` to unassign. `implementation_notes` appends to the description.
- `generate_release_notes` groups tickets by type into Features / Improvements / Bug Fixes / Other.
- All logs go to stderr; stdout is reserved for the MCP protocol.

## Example prompts

- "Search tickets in project GEM that are In Progress"
- "Create a Story in GEM titled 'Release notes v2.0' due 2026-08-01"
- "Update GEM-234, set the assignee to namcp and add label BugFix"
- "Add a comment to GEM-234: 'Review done'"
- "Generate release notes for fix version v2.4 in project GEM"

## Troubleshooting

- 401/403: recheck `JIRA_USERNAME`/`JIRA_PASSWORD` and whether the account can access the project.
- Connection/timeout: verify `JIRA_HOST` format (starts with `https://`, no trailing `/`), and whether VPN/internal network is required.
- Start date not saving: confirm `JIRA_START_DATE_FIELD` matches your instance (see the discovery command above).
- No error logs: server logs go to stderr — check the MCP client (Claude Code/Desktop) output, not stdout.

## Development

```bash
pnpm install
cp .env.example .env   # edit with your credentials
pnpm build             # bundle to dist/index.js via esbuild
pnpm lint              # biome check + tsc + prettier (markdown)
pnpm release           # release-it: bumps version, commits, tags, pushes (runs lint + build first, no pre-commit needed)
pnpm archive           # package release/jira-mcp-v<version>.zip
```

## Support

Questions or issues? Email [NamCP](mailto:namcp@gem-corp.global).

If this project helps you, consider buying me a coffee:

<img src="https://raw.githubusercontent.com/namcpgem/gem-jira-mcp/main/docs/buy-me-a-coffee.jpg" alt="Buy Me A Coffee" width="300">
