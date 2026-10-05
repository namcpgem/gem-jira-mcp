# Jira mcp

MCP server for Jira Server/Data Center (REST API v2). Lets an AI assistant (Claude Code, Claude Desktop, ...) read and write your Jira directly.

## Requirements

- A Jira Server/Data Center account (username + password).
- Node.js 18+.

## Quick start

Use Claude Code CLI. Run the command in a regular terminal, not inside a Claude Code session. Pick the block for your shell, since each one continues lines differently.

bash / zsh (macOS, Linux, Git Bash or WSL on Windows):

```bash
claude mcp add g-jira-mcp \
  -e JIRA_HOST="https://jira.company.com" \
  -e JIRA_USERNAME="your_username" \
  -e JIRA_PASSWORD="your_password" \
  -- npx -y g-jira-mcp@latest
```

PowerShell (Windows):

```powershell
claude mcp add g-jira-mcp `
  -e JIRA_HOST="https://jira.company.com" `
  -e JIRA_USERNAME="your_username" `
  -e JIRA_PASSWORD="your_password" `
  -- npx -y g-jira-mcp@latest
```

Command Prompt (cmd.exe): put the whole command on one line, or end each line with `^` instead of `\`.

Or manually add to `.claude/settings.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "g-jira-mcp": {
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

| Variable                | Required | Description                                                    |
| ----------------------- | -------- | -------------------------------------------------------------- |
| `JIRA_HOST`             | yes      | Base URL, e.g. `https://jira.company.com`                      |
| `JIRA_USERNAME`         | yes      | Jira username                                                  |
| `JIRA_PASSWORD`         | yes      | Jira password                                                  |
| `JIRA_START_DATE_FIELD` | no       | Custom field ID for "Start date" (default `customfield_11300`) |
| `JIRA_EPIC_LINK_FIELD`  | no       | Custom field ID for "Epic Link" (default `customfield_10001`)  |
| `JIRA_TIMEZONE`         | no       | Timezone for WorklogPRO form (default `Asia/Ho_Chi_Minh`)      |

To discover custom field IDs on your instance:

```bash
curl -u user:pass https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|start"; "i")) | {id, name}'
```

## Tools

| Tool                     | Description                                                                                       | Key parameters                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_ticket`             | Get full details of a Jira ticket by its key; for a single comment use `get_comment`              | `ticket_id`, optional: `include_comments`, `include_images`, `include_worklogs`, `image_limit`                                                                                                   |
| `search_tickets`         | Search Jira tickets using JQL query language                                                      | `jql`, `max_results` (optional, default 25)                                                                                                                                                      |
| `create_ticket`          | Create a new Jira ticket                                                                          | `project`, `summary`, `issue_type`, optional: `assignee`, `body`, `parent_key`, `due_date`, `start_date`, `original_estimate`, `labels`                                                          |
| `update_ticket`          | Update fields of a Jira ticket                                                                    | `ticket_id`, optional: `summary`, `description`, `issue_type`, `parent_key`, `epic_key`, `labels`, `due_date`, `start_date`, `original_estimate`, `implementation_notes`, `assignee`, `priority` |
| `transition_ticket`      | Change a Jira ticket's status by name, alias-aware                                                | `ticket_id`, `status`                                                                                                                                                                            |
| `add_comment`            | Add a comment to a Jira ticket                                                                    | `ticket_id`, `body`                                                                                                                                                                              |
| `update_comment`         | Replace the text of an existing comment (IDs come from `get_ticket` with `include_comments`)      | `ticket_id`, `comment_id`, `body`                                                                                                                                                                |
| `delete_comment`         | Delete a comment from a Jira ticket (cannot be undone)                                            | `ticket_id`, `comment_id`                                                                                                                                                                        |
| `get_comment`            | Get one comment by ID, e.g. from a focusedCommentId link; cheaper than get_ticket                 | `ticket_id`, `comment_id`, optional: `include_images`                                                                                                                                            |
| `log_work`               | Log work (time) on a Jira ticket, optionally setting WorklogPRO Type of Work and Type of Activity | `ticket_id`, `time_spent`, optional: `comment`, `started`, `work_type`, `activity`                                                                                                               |
| `update_worklog`         | Edit a worklog's time, start or comment (IDs come from `get_ticket` with `include_worklogs`)      | `ticket_id`, `worklog_id`, optional: `time_spent`, `started`, `comment`                                                                                                                          |
| `delete_worklog`         | Delete a worklog from a Jira ticket (cannot be undone)                                            | `ticket_id`, `worklog_id`                                                                                                                                                                        |
| `link_issues`            | Create a link between two Jira tickets                                                            | `inward_issue`, `outward_issue`, optional: `link_type` (default "Blocks")                                                                                                                        |
| `unlink_issues`          | Remove a link between two Jira tickets (either direction)                                         | `ticket_id`, `linked_ticket_id`, optional: `link_type` (required when several links connect them)                                                                                                |
| `add_watcher`            | Add a user as a watcher of a Jira ticket                                                          | `ticket_id`, `username`                                                                                                                                                                          |
| `remove_watcher`         | Remove a user from the watchers of a Jira ticket                                                  | `ticket_id`, `username`                                                                                                                                                                          |
| `move_to_sprint`         | Move tickets into an active or future sprint                                                      | `ticket_ids`, `sprint` (name or ID)                                                                                                                                                              |
| `generate_release_notes` | Generate Markdown release notes for a fix version, grouped by issue type                          | `fix_version`, optional: `project`                                                                                                                                                               |

### Notes

- Jira Server uses plain text for descriptions — no ADF format.
- `get_ticket` omits unset fields rather than printing placeholder text. Key, Summary, Status and Assignee are always present (Assignee shows "Unassigned" when empty); other fields appear only when set. Pass `include_comments=true` to append the ticket's comment thread; comments are off by default to keep output small and save tokens. The same Jira request fetches everything, so including comments costs no extra API call. Comments are capped at 20 most recent; if a ticket has more, the header reads `Comments (20 most recent of 45):` so the caller knows older comments exist and can open the ticket in Jira to see them. Each comment line starts with its ID (`#10001`), which `update_comment` and `delete_comment` take.
- `get_ticket` lists attachment file names in an `Attachments:` line whenever the ticket has any. Pass `include_images=true` to also receive image attachments (PNG, JPEG, GIF, WebP) as MCP image content, so the caller can see screenshots referenced as `!image.png!` in the description or comments. Images are off by default because each one costs far more tokens than the text. At most 5 images are returned by default (raise it with `image_limit`, up to 20), each up to about 3.7 MB and about 7.5 MB in total, so the response stays inside Claude's vision limits (5 MB base64 per image on Bedrock and Google Cloud, 32 MB per request). Images are sent as-is; the model API downscales large ones itself. Each image costs one extra download request; an `Images:` section maps `[image N]` to its file name, reports each skipped image with its reason (too large or total size cap reached), reports failed downloads, and when `image_limit` is hit, says how many images were left out. Raising `image_limit` brings back only images that hit the count limit; images skipped for size will not reappear.
- `get_comment` returns a single comment as `#id [date] author: body`. Pass `include_images=true` to fetch and return only the image attachments that comment embeds via `!filename.png!` or `!filename.png|width=…!` markup (by contrast, `get_ticket` returns all images on the ticket). Fetching attachments costs one extra request only when the comment embeds something. Images follow the same per-image and total size limits as `get_ticket`, up to 20 max. Use `get_comment` instead of `get_ticket` for `?focusedCommentId=` links, or when only a single comment matters.
- `search_tickets` output is adaptive: empty columns (no value anywhere) are dropped entirely, and constant columns (same value on every row, when there are 3+ rows) are stated once in the header as `All: Status=In Progress` and removed from the table. When columns are dropped, the header also notes which ones were empty across all results (e.g. `Unset for every row: Priority, Parent, Start Date`) so the caller can tell "no ticket has a due date" from "this tool doesn't return due dates". KEY and Summary are always kept. This keeps results focused and token-efficient. The header's `Found N issue(s) (showing M)` reports when the result was truncated — raise `max_results` above the default 25 to see more.
- `create_ticket` and `update_ticket` both accept an `assignee` parameter (Jira username as a string, sent as `{name: assignee}`). In `create_ticket`, an empty assignee value is ignored. In `update_ticket`, pass `assignee=""` to unassign.
- `create_ticket` applies `original_estimate` in a follow-up PUT rather than in the create payload: Jira Data Center answers a bare `500 Internal server error` when `timetracking` is present in `POST /issue`, while the same value applies cleanly as an update afterwards. The ticket key is reported even if that second call fails, with a warning to set the estimate via `update_ticket` — so a failed estimate never sends you back to create a duplicate.
- `duedate` is a standard field (`YYYY-MM-DD`); "Start date" is a custom field, configurable via `JIRA_START_DATE_FIELD`.
- `update_ticket`'s `epic_key` sets the Epic Link field (a custom field, configurable via `JIRA_EPIC_LINK_FIELD`, default `customfield_10001`) so the ticket shows under the epic's "Issues in Epic" panel — not the same as `link_issues`, which only creates a generic Linked Issue (e.g. "Relates"). Epic Link can only be set on standard issue types (Story/Task/Bug), not on Sub-tasks or Epics themselves.
- `search_tickets` uses JQL syntax, e.g. `project = GEM AND status = 'In Progress'`.
- `move_to_sprint` takes a sprint name or numeric ID. A name is looked up among the active and future sprints of the scrum boards of the first ticket's project (Agile API, `/rest/agile/1.0`); if it matches none, or several, nothing is moved and the error lists the open sprints with their IDs. To list a sprint's tickets, use `search_tickets` with JQL such as `sprint = "GEM Sprint 12"` or `sprint in openSprints()`.
- `transition_ticket` resolves the transition ID automatically, matching either the transition's own name ("Resolve Issue") or the status it lands on ("Done"). Common aliases map onto whatever the workflow actually offers (Closed/Resolved/Complete → Done, Reopen → Re-Open, Todo → To Do, Cancelled → Won't Do), so the same call works across workflows with different status names. Exact matches win, then aliases, then a substring fallback. When nothing matches, the error lists every valid option for that issue as `Transition -> Target Status`; the tool description cannot list them because they vary per issue and workflow.
- `update_ticket` only changes the fields you pass; omit a field to keep its current value. Pass `assignee=""` to unassign. `implementation_notes` appends to the description. Converting a standard issue type (Story, Task, Bug) to Sub-task or vice versa is a Jira REST API limitation — use the Jira UI "Move" action instead.
- `log_work` advertises one canonical name per work type (code, deploy, design, fix, management, meeting, misc, operation, qa, req, research, translation) and per activity (correct, create, review) so its schema stays small; every alias still works as input (coding, dev, testing, ops, requirement, other, and the rest). `activity` is required when `work_type` is set. If neither is set, logs via plain REST (no WorklogPRO form). If `work_type` or `activity` is set and the WorklogPRO form is unavailable, nothing is logged and the call fails (safe to retry); it never falls back to REST, which cannot set those attributes. A failed form submit is an error and is never retried, because the worklog may already exist. Start times are interpreted in the Jira server timezone (configurable via `JIRA_TIMEZONE`).
- `get_ticket` with `include_worklogs=true` appends the ticket's worklogs, each line starting with its ID (`#20001`), which `update_worklog` and `delete_worklog` take. This costs one extra request (`GET /issue/{key}/worklog`), capped at the 20 most recent like comments. `log_work` returns no ID when it goes through the WorklogPRO form, so this is where to find it. `update_worklog` edits time, start and comment over REST only; to change Type of Work or Type of Activity, delete the worklog and log it again with `log_work`.
- `generate_release_notes` groups tickets by type into Features / Improvements / Bug Fixes / Other.
- Register the server as `g-jira-mcp` and use that key in every project. The key becomes the tool prefix (`mcp__g-jira-mcp__get_ticket`), so a project that registers it under a different name exposes different tool names — an agent carrying the habit of one name into a project configured with the other gets `No such tool available`.
- Transient Jira failures (429, 500, 502, 503, 504) are retried up to twice with a 250ms/500ms backoff. Only GET, PUT and DELETE are replayed — a POST that returned 500 may already have created the comment, worklog or transition, so it fails fast instead of risking a duplicate.
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
pnpm build             # bundle to dist/index.js via rsbuild
pnpm lint              # biome check + tsc + prettier (markdown)
pnpm release           # release-it: bumps version, commits, tags, pushes (runs lint + build first, no pre-commit needed)
```

## Support

Questions or issues? Email [NamCP](mailto:namcp@gem-corp.global).

If this project helps you, consider buying me a coffee:

<img src="https://raw.githubusercontent.com/namcpgem/gem-jira-mcp/main/docs/buy-me-a-coffee.jpg" alt="Buy Me A Coffee" width="300">
