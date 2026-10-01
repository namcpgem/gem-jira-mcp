import assert from "node:assert/strict";
import {test} from "node:test";
import {registerDeleteWorklog} from "../../src/tools/worklog/delete.js";
import {registerUpdateWorklog} from "../../src/tools/worklog/update.js";
import {callTool, testRequests} from "../helpers/fake-server.js";

testRequests([
  [
    registerUpdateWorklog,
    "update_worklog",
    {comment: "", ticket_id: "GEM-1", time_spent: "1h", worklog_id: "20001"},
    ["PUT", "/issue/GEM-1/worklog/20001", {comment: "", timeSpent: "1h"}],
  ],
  [
    registerDeleteWorklog,
    "delete_worklog",
    {ticket_id: "GEM-1", worklog_id: "20001"},
    ["DELETE", "/issue/GEM-1/worklog/20001"],
  ],
]);

test("update_worklog sends nothing when there is nothing to change", async () => {
  const {isError, requests, text} = await callTool(
    registerUpdateWorklog,
    "update_worklog",
    {ticket_id: "GEM-1", worklog_id: "20001"},
  );
  assert.equal(isError, true);
  assert.deepEqual(requests, []);
  assert.match(text, /Nothing to update/);
});
