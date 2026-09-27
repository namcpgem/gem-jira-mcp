import assert from "node:assert/strict";
import {test} from "node:test";
import {registerLogWork} from "../src/tools/log-work.js";
import {fakeServer} from "./helpers/fake-server.js";

const FORM_HTML =
  '<form action="x?atl_token=TOK123"><input name="startDateJS" value="27/Sep/26 9:00 AM">' +
  '<input name="startDate" value="2026-09-27 09:00"></form>';

// Routes the three requests a worklog can make (form GET, form POST, REST
// POST) to scripted statuses and records which of them were sent.
const stubJira = ({form = 200, submit = 200} = {}) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    const kind = url.includes("!default.jspa")
      ? "form"
      : url.includes("WorkLogAction.jspa")
        ? "submit"
        : url.endsWith("/worklog")
          ? "rest"
          : "other";
    calls.push(kind);
    const status = {form, rest: 201, submit}[kind] ?? 404;
    return {
      headers: {getSetCookie: () => ["JSESSIONID=abc; Path=/"]},
      ok: status < 400,
      status,
      text: async () => ({form: FORM_HTML, rest: '{"id":"777"}'})[kind] ?? "ok",
    };
  };
  return calls;
};

const logWork = (args) => {
  const server = fakeServer();
  registerLogWork(server);
  return server.tools.get("log_work")({
    ticket_id: "GEM-1",
    time_spent: "2h",
    ...args,
  });
};

test("log_work sets attributes through the WorklogPRO form", async () => {
  const calls = stubJira();
  const {content, isError} = await logWork({
    activity: "review",
    work_type: "dev",
  });
  assert.equal(isError, undefined);
  assert.deepEqual(calls, ["form", "submit"]);
  assert.equal(content[0].text, "Logged 2h on GEM-1 [dev/review]");
});

test("log_work fails without logging when the form is unavailable", async () => {
  const calls = stubJira({form: 403});
  const {content, isError} = await logWork({
    activity: "review",
    work_type: "dev",
  });
  assert.equal(isError, true);
  assert.deepEqual(calls, ["form"]);
  assert.match(content[0].text, /HTTP 403.*nothing was logged/);
});

test("log_work does not replay a failed form submit over REST", async () => {
  const calls = stubJira({submit: 500});
  const {content, isError} = await logWork({
    activity: "review",
    work_type: "dev",
  });
  assert.equal(isError, true);
  assert.deepEqual(calls, ["form", "submit"]);
  assert.match(content[0].text, /do not retry.*Work Log tab of GEM-1/);
});

test("log_work rejects an unknown alias before any request", async () => {
  const calls = stubJira();
  const {content, isError} = await logWork({
    activity: "review",
    work_type: "napping",
  });
  assert.equal(isError, true);
  assert.deepEqual(calls, []);
  assert.match(content[0].text, /Unknown work_type "napping"/);
});

test("log_work without attributes logs over plain REST", async () => {
  const calls = stubJira();
  const {content} = await logWork({});
  assert.deepEqual(calls, ["rest"]);
  assert.equal(content[0].text, "Logged 2h on GEM-1 (worklog id: 777)");
});
