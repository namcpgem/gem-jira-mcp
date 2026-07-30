import assert from "node:assert/strict";
import {test} from "node:test";
import {registerSearchTickets} from "../src/tools/search-tickets.js";
import {fakeServer} from "./helpers/fake-server.js";

const issue = (key, fields) => ({
  fields: {status: {name: "Open"}, summary: `S-${key}`, ...fields},
  key,
});

const search = (issues) => {
  const server = fakeServer();
  registerSearchTickets(server, async () => ({
    issues,
    total: issues.length,
  }));
  return server.tools.get("search_tickets");
};

test("search_tickets drops columns that are empty for every row", async () => {
  const call = search([issue("GEM-1"), issue("GEM-2")]);
  const text = (await call({jql: "project = GEM"})).content[0].text;

  assert.match(text, /^KEY \| Summary \| Status \| Assignee$/m);
  assert.match(text, /^GEM-1 \| S-GEM-1 \| Open \| Unassigned$/m);
  // Named once so the caller can tell "nobody set one" from "not available".
  assert.match(
    text,
    /Unset for every row: Priority, Parent, Start Date, Due Date, Original Estimate/,
  );
});

test("search_tickets keeps a column when any single row fills it", async () => {
  const call = search([
    issue("GEM-1"),
    issue("GEM-2", {duedate: "2026-02-01"}),
  ]);
  const text = (await call({jql: "project = GEM"})).content[0].text;

  assert.match(text, /^KEY \| Summary \| Status \| Assignee \| Due Date$/m);
  assert.match(text, /^GEM-1 \| S-GEM-1 \| Open \| Unassigned \| -$/m);
  assert.match(text, /^GEM-2 \| S-GEM-2 \| Open \| Unassigned \| 2026-02-01$/m);
});

test("search_tickets states a column shared by every row once, not per row", async () => {
  const call = search([
    issue("GEM-1", {priority: {name: "High"}}),
    issue("GEM-2", {priority: {name: "High"}}),
    issue("GEM-3", {priority: {name: "High"}}),
  ]);
  const text = (await call({jql: "project = GEM"})).content[0].text;

  assert.match(text, /All: Status=Open, Assignee=Unassigned, Priority=High/);
  assert.match(text, /^KEY \| Summary$/m);
  assert.match(text, /^GEM-1 \| S-GEM-1$/m);
});

test("search_tickets keeps a partly-filled column out of the shared line", async () => {
  const call = search([
    issue("GEM-1", {parent: {key: "GEM-9"}}),
    issue("GEM-2", {parent: {key: "GEM-9"}}),
    issue("GEM-3"),
  ]);
  const text = (await call({jql: "project = GEM"})).content[0].text;

  assert.doesNotMatch(text, /All:.*Parent/);
  assert.match(text, /^KEY \| Summary \| Parent$/m);
  assert.match(text, /^GEM-3 \| S-GEM-3 \| -$/m);
});

test("search_tickets reports an empty result set", async () => {
  const text = (await search([])({jql: "project = NOPE"})).content[0].text;
  assert.equal(text, "No issues found");
});
