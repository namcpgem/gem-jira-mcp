import assert from "node:assert/strict";
import {test} from "node:test";
import {registerMoveToSprint} from "../../src/tools/sprint/move.js";
import {fakeServer} from "../helpers/fake-server.js";

const AGILE = "/rest/agile/1.0";
// A kanban board rejects the sprint listing, so it must never be asked.
const ROUTES = {
  [`${AGILE}/board?projectKeyOrId=GEM`]: {
    values: [
      {id: 1, type: "kanban"},
      {id: 2, type: "scrum"},
    ],
  },
  [`${AGILE}/board/2/sprint?state=active,future`]: {
    values: [
      {id: 41, name: "GEM Sprint 12", state: "active"},
      {id: 42, name: "GEM Sprint 13", state: "future"},
    ],
  },
};

const move = async (args) => {
  const server = fakeServer();
  const requests = [];
  registerMoveToSprint(server, async (method, path, body) => {
    requests.push(body ? [method, path, body] : [method, path]);
    if (method === "GET" && !ROUTES[path])
      throw new Error(`Jira API 400: ${path}`);
    return ROUTES[path] ?? null;
  });
  const result = await server.tools.get("move_to_sprint")(args);
  return {isError: result.isError, requests, text: result.content[0].text};
};

test("move_to_sprint resolves a sprint name on the project's scrum boards", async () => {
  const {isError, requests, text} = await move({
    sprint: "gem sprint 13",
    ticket_ids: ["gem-1", "GEM-2"],
  });
  assert.equal(isError, undefined);
  assert.deepEqual(requests.at(-1), [
    "POST",
    `${AGILE}/sprint/42/issue`,
    {issues: ["GEM-1", "GEM-2"]},
  ]);
  assert.equal(text, "Moved GEM-1, GEM-2 to sprint GEM Sprint 13");
});

test("move_to_sprint posts a numeric sprint ID without looking it up", async () => {
  const {requests} = await move({sprint: "42", ticket_ids: ["GEM-1"]});
  assert.deepEqual(requests, [
    ["POST", `${AGILE}/sprint/42/issue`, {issues: ["GEM-1"]}],
  ]);
});

test("move_to_sprint moves nothing and lists open sprints for an unknown name", async () => {
  const {isError, requests, text} = await move({
    sprint: "Sprint 99",
    ticket_ids: ["GEM-1"],
  });
  assert.equal(isError, true);
  assert.ok(requests.every(([method]) => method === "GET"));
  assert.match(
    text,
    /Open sprints: GEM Sprint 12 \(41, active\); GEM Sprint 13 \(42, future\)/,
  );
});
