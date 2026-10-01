import assert from "node:assert/strict";
import {test} from "node:test";
import {registerUnlinkIssues} from "../../src/tools/link/unlink.js";
import {fakeServer} from "../helpers/fake-server.js";

const BUGS = {inward: "is bug of", name: "Bugs", outward: "has bug"};
const RELATES = {inward: "relates to", name: "Relates", outward: "relates to"};
const LINKS = [
  {id: "1", outwardIssue: {key: "GEM-2"}, type: BUGS},
  {id: "2", inwardIssue: {key: "GEM-2"}, type: RELATES},
  {id: "3", outwardIssue: {key: "GEM-9"}, type: RELATES},
];

const unlink = async (args) => {
  const server = fakeServer();
  const deleted = [];
  registerUnlinkIssues(server, async (method, path) => {
    if (method === "GET") return {fields: {issuelinks: LINKS}, key: "GEM-1"};
    deleted.push(path);
    return null;
  });
  const result = await server.tools.get("unlink_issues")({
    linked_ticket_id: "gem-2",
    ticket_id: "GEM-1",
    ...args,
  });
  return {deleted, isError: result.isError, text: result.content[0].text};
};

test("unlink_issues removes the one link matching the type name or verb", async () => {
  for (const link_type of ["Bugs", "has bug", "IS BUG OF"]) {
    const {deleted, text} = await unlink({link_type});
    assert.deepEqual(deleted, ["/issueLink/1"]);
    assert.equal(text, "Removed link: GEM-1 has bug GEM-2");
  }
});

test("unlink_issues removes nothing when several links match", async () => {
  const {deleted, isError, text} = await unlink({});
  assert.equal(isError, true);
  assert.deepEqual(deleted, []);
  assert.match(text, /2 links between GEM-1 and GEM-2 .*pass link_type/);
});

test("unlink_issues lists the existing links when none match", async () => {
  const {deleted, isError, text} = await unlink({link_type: "Blocks"});
  assert.equal(isError, true);
  assert.deepEqual(deleted, []);
  assert.match(text, /Existing: GEM-1 has bug GEM-2; GEM-1 relates to GEM-2/);
});
