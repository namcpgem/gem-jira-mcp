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
  assert.match(text, /Subtasks: None/);
});
