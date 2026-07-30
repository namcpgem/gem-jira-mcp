import assert from "node:assert/strict";
import {test} from "node:test";
import {registerGetTicket} from "../src/tools/get-ticket.js";
import {fakeServer} from "./helpers/fake-server.js";

test("get_ticket formats issue fields without hitting live Jira", async () => {
  const server = fakeServer();
  const fakeJira = async (method, path) => {
    assert.equal(method, "GET");
    assert.equal(path, "/issue/GEM-1");
    return {
      fields: {
        assignee: {displayName: "Alice"},
        customfield_11300: "2026-01-01",
        description: "desc",
        duedate: "2026-02-01",
        labels: ["a", "b"],
        priority: {name: "High"},
        reporter: {displayName: "Bob"},
        status: {name: "In Progress"},
        subtasks: [],
        summary: "Do the thing",
        timetracking: {originalEstimate: "2h"},
      },
      key: "GEM-1",
    };
  };
  registerGetTicket(server, fakeJira);

  const result = await server.tools.get("get_ticket")({ticket_id: "GEM-1"});
  const text = result.content[0].text;
  assert.match(text, /Key: GEM-1/);
  assert.match(text, /Assignee: Alice/);
  assert.match(text, /Start Date: 2026-01-01/);
  // Unset fields and comments cost the caller tokens, so they stay out.
  assert.doesNotMatch(text, /Subtasks/);
  assert.doesNotMatch(text, /Comments/);
});

test("get_ticket omits unset fields but keeps the ones that are set", async () => {
  const server = fakeServer();
  const fakeJira = async () => ({
    fields: {status: {name: "Open"}, summary: "Bare ticket"},
    key: "GEM-2",
  });
  registerGetTicket(server, fakeJira);

  const text = (await server.tools.get("get_ticket")({ticket_id: "GEM-2"}))
    .content[0].text;
  assert.equal(
    text,
    "Key: GEM-2\nSummary: Bare ticket\nStatus: Open\nAssignee: Unassigned",
  );
});

test("get_ticket returns comments on request and flags truncation", async () => {
  const server = fakeServer();
  const fakeJira = async () => ({
    fields: {
      comment: {
        comments: [
          {
            author: {displayName: "Alice"},
            body: "the answer is 42",
            created: "2026-07-01T10:00:00.000+0700",
          },
        ],
        total: 3,
      },
      status: {name: "Open"},
      summary: "Has comments",
    },
    key: "GEM-3",
  });
  registerGetTicket(server, fakeJira);
  const call = server.tools.get("get_ticket");

  assert.doesNotMatch(
    (await call({ticket_id: "GEM-3"})).content[0].text,
    /the answer is 42/,
  );
  const text = (await call({include_comments: true, ticket_id: "GEM-3"}))
    .content[0].text;
  assert.match(text, /Comments \(1 most recent of 3\):/);
  assert.match(text, /\[2026-07-01\] Alice: the answer is 42/);
});

test("get_ticket caps a long comment thread and says it capped it", async () => {
  const server = fakeServer();
  const comments = Array.from({length: 45}, (_, n) => ({
    author: {displayName: "Alice"},
    body: `comment ${n + 1}`,
    created: "2026-07-01T10:00:00.000+0700",
  }));
  registerGetTicket(server, async () => ({
    fields: {comment: {comments, total: 45}, status: {}, summary: "Busy"},
    key: "GEM-4",
  }));

  const text = (
    await server.tools.get("get_ticket")({
      include_comments: true,
      ticket_id: "GEM-4",
    })
  ).content[0].text;

  assert.match(text, /Comments \(20 most recent of 45\):/);
  assert.match(text, /comment 45/);
  assert.match(text, /comment 26/);
  assert.doesNotMatch(text, /comment 25\b/);
});
