import assert from "node:assert/strict";
import {test} from "node:test";
import {defineTool} from "../src/define-tool.js";
import {fakeServer} from "./helpers/fake-server.js";

test("defineTool wraps a resolved string as success content", async () => {
  const server = fakeServer();
  defineTool(
    server,
    "ok_tool",
    {},
    async () => "done",
    async () => {},
  );

  const result = await server.tools.get("ok_tool")({});
  assert.deepEqual(result, {content: [{text: "done", type: "text"}]});
});

test("defineTool wraps a thrown Error as isError", async () => {
  const server = fakeServer();
  defineTool(
    server,
    "bad_tool",
    {},
    async () => {
      throw new Error("boom");
    },
    async () => {},
  );

  const result = await server.tools.get("bad_tool")({});
  assert.deepEqual(result, {
    content: [{text: "boom", type: "text"}],
    isError: true,
  });
});
