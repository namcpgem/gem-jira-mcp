import assert from "node:assert/strict";
import {test} from "node:test";
import {registerUpdateTicket} from "../src/tools/update-ticket.js";
import {fakeServer} from "./helpers/fake-server.js";

test("update_ticket rejects an empty update", async () => {
  const server = fakeServer();
  registerUpdateTicket(server, async () => {
    throw new Error("jiraRequest should not be called");
  });

  const result = await server.tools.get("update_ticket")({
    ticket_id: "GEM-1",
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /No fields provided to update/);
});

test("update_ticket succeeds when Jira applies the requested parent", async () => {
  const server = fakeServer();
  const calls = [];
  const fakeJira = async (method, path) => {
    calls.push(`${method} ${path}`);
    if (method === "PUT") return null;
    return {fields: {parent: {key: "GEM-9"}}};
  };
  registerUpdateTicket(server, fakeJira);

  const result = await server.tools.get("update_ticket")({
    parent_key: "GEM-9",
    ticket_id: "GEM-1",
  });
  assert.equal(result.content[0].text, "GEM-1 updated successfully");
  assert.deepEqual(calls, [
    "PUT /issue/GEM-1",
    "GET /issue/GEM-1?fields=parent",
  ]);
});

test("update_ticket reports Jira's silent rejection of a Sub-task parent change", async () => {
  const server = fakeServer();
  const fakeJira = async (method) => {
    if (method === "PUT") return null;
    return {fields: {parent: undefined}};
  };
  registerUpdateTicket(server, fakeJira);

  const result = await server.tools.get("update_ticket")({
    parent_key: "GEM-9",
    ticket_id: "GEM-1",
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /still "no parent"/);
  assert.match(result.content[0].text, /Move" action/);
});
