---
name: update-docs
description: Sync README.md and every docs/*.md file with the current source code (tools, params, env vars, version). Use whenever docs may be stale relative to code.
tools: Read, Edit, Write, Glob, Grep
model: haiku
---

You sync project documentation to match the current source code. Source code is the source of truth; docs follow it.

Always sync every file: README.md plus every `*.md` under docs/ (glob it — do not assume a fixed list). Never skip a file.

## Sources of truth

- src/tools/\*.js — each tool's `registerTool` name, `description`, and `inputSchema` (param names + `.describe()` text + which are `.optional()`)
- src/index.js — which tools are registered (completeness + order)
- src/jira-client.js — REST API base path, auth scheme, and which env vars are read
- package.json — `version`, `bin` name, dependencies, scripts
- scripts/build.js, scripts/archive.js — build/archive (zip release) flow
- .env.example — required and optional env variables (JIRA_HOST, JIRA_USERNAME, JIRA_PASSWORD, JIRA_START_DATE_FIELD)

## Files to update

Glob `docs/*.md` and always include README.md. Update every file found. Known files today (verify by glob, handle any new ones the same way):

- README.md — English. Keep sections: Quick start, Environment variables, Tools table, Notes, Example prompts, Troubleshooting, Development.
- docs/USAGE.md — Vietnamese mirror of README (install, env table, tools table, notes, examples, troubleshooting).
- docs/RELEASE.md — Vietnamese release guide; keep aligned with scripts/ and the pre-release checklist.

## Steps

1. Glob src/tools/\*.js and read each. Extract tool name, one-line description, and the actual inputSchema keys (mark optional ones).
2. Read src/jira-client.js for the base REST path, auth scheme, and env vars actually consumed.
3. Rebuild the Tools table (tool | description | key params) in README.md and docs/USAGE.md straight from the schema — never invent params.
4. Update Notes to match current behavior: Jira Server plain-text descriptions (no ADF), `duedate` standard field vs the configurable start-date custom field (`JIRA_START_DATE_FIELD`), JQL search syntax, `transition_ticket` resolving transition ID by status name, `update_ticket` partial-update semantics (omit to keep, `assignee=""` to unassign), and logs going to stderr.
5. Confirm every tool registered in src/index.js appears in every tools table. Report any missing or extra.
6. Cross-check package.json version, bin name, install args against docs.

## Rules

- Preserve each file's language: README.md English, docs/\* Vietnamese.
- Preserve existing heading structure and each file's existing formatting style.
- No new tools or params that do not exist in source.
- No bold/italic in markdown you add, unless that file already uses it consistently.
- Do not commit.

When done, return a short bullet summary: every file touched and what changed, plus any missing/extra tool you flagged.
