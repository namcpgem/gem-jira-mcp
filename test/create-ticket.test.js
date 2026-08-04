import assert from "node:assert/strict";
import {test} from "node:test";
import {registerCreateTicket} from "../src/tools/create-ticket.js";
import {fakeServer} from "./helpers/fake-server.js";

const create = async (params, {failEstimate = false} = {}) => {
  const server = fakeServer();
  const calls = [];
  registerCreateTicket(server, async (method, path, body) => {
    calls.push({body, method, path});
    if (method === "POST") return {key: "GEM-7"};
    if (failEstimate) throw new Error("Jira API 500: boom");
    return null;
  });
  const result = await server.tools.get("create_ticket")({
    issue_type: "Sub-task",
    project: "GEM",
    summary: "s",
    ...params,
  });
  return {calls, result};
};

test("create_ticket keeps timetracking out of the create payload", async () => {
  const {calls} = await create({original_estimate: "8h"});
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].body.fields.timetracking, undefined);
  assert.deepEqual(calls[1], {
    body: {update: {timetracking: [{edit: {originalEstimate: "8h"}}]}},
    method: "PUT",
    path: "/issue/GEM-7",
  });
});

test("create_ticket makes no second call without an estimate", async () => {
  const {calls, result} = await create({});
  assert.equal(calls.length, 1);
  assert.match(result.content[0].text, /^Created GEM-7: /);
});

test("create_ticket still reports the key when the estimate fails", async () => {
  const {result} = await create(
    {original_estimate: "8h"},
    {
      failEstimate: true,
    },
  );
  assert.notEqual(result.isError, true);
  assert.match(result.content[0].text, /Created GEM-7/);
  assert.match(result.content[0].text, /was not applied/);
  assert.match(result.content[0].text, /update_ticket/);
});
