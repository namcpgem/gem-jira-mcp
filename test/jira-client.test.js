import assert from "node:assert/strict";
import {test} from "node:test";
import {jiraRequest} from "../src/jira-client.js";

// Replaces global fetch with a scripted sequence of statuses and records how
// many times it was actually called.
const stubFetch = (statuses, okBody = '{"ok":true}') => {
  const calls = [];
  globalThis.fetch = async () => {
    const status = statuses[calls.length] ?? 200;
    calls.push(status);
    return {
      ok: status < 400,
      status,
      text: async () => (status < 400 ? okBody : "server exploded"),
    };
  };
  return calls;
};

test("jiraRequest retries a replayable request through two 5xx", async () => {
  const calls = stubFetch([500, 503, 200]);
  assert.deepEqual(await jiraRequest("GET", "/issue/GEM-1"), {ok: true});
  assert.equal(calls.length, 3);
});

test("jiraRequest gives up after two retries", async () => {
  const calls = stubFetch([500, 500, 500]);
  await assert.rejects(
    () => jiraRequest("GET", "/issue/GEM-1"),
    /Jira API 500: server exploded/,
  );
  assert.equal(calls.length, 3);
});

test("jiraRequest does not retry a 4xx", async () => {
  const calls = stubFetch([400]);
  await assert.rejects(
    () => jiraRequest("GET", "/issue/GEM-1"),
    /Jira API 400/,
  );
  assert.equal(calls.length, 1);
});

test("jiraRequest does not replay a POST", async () => {
  const calls = stubFetch([500]);
  await assert.rejects(
    () => jiraRequest("POST", "/issue/GEM-1/comment", {body: "hi"}),
    /Jira API 500/,
  );
  assert.equal(calls.length, 1);
});

test("jiraRequest returns null for a 201 with an empty body", async () => {
  stubFetch([201], "");
  assert.equal(
    await jiraRequest("POST", "/issueLink", {type: {name: "Blocks"}}),
    null,
  );
});
