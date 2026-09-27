# 1. Keep create_ticket and update_ticket field mapping separate

Date: 2026-09-27

Status: accepted

## Context

`create_ticket` and `update_ticket` both map tool params to Jira fields (parent, due date, start date, labels, assignee, original estimate), which looks like duplication that a shared mapper would remove.

The two mappings differ on purpose:

- `update_ticket` writes any param that is present (`!== undefined`), so an empty `assignee` unassigns the ticket.
- `create_ticket` skips empty values, because there is nothing to clear on a new ticket.
- The original estimate goes through `update.timetracking.edit` in both, but `create_ticket` must send it in a second request: Jira Data Center answers a bare 500 when `timetracking` is in the create payload.

## Decision

Keep the mapping inside each tool. Do not extract a shared field mapper.

## Consequences

- A shared mapper would need a create/update mode, so its interface would be nearly as large as its implementation (a shallow module), and deleting it would only move about ten lines back.
- A new field has to be added to both tools. Revisit this if that starts happening repeatedly.
