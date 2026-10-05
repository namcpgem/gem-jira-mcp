import assert from "node:assert/strict";
import {test} from "node:test";
import {registerGetComment} from "../../src/tools/comment/get.js";
import {fakeServer} from "../helpers/fake-server.js";

test("get_comment returns one comment and only the images it embeds", async () => {
  const server = fakeServer();
  const paths = [];
  const fakeJira = async (_method, path) => {
    paths.push(path);
    if (path === "/issue/GEM-1/comment/10001") {
      return {
        author: {displayName: "Alice"},
        body: "see !a.png|width=520,height=278! and !b.png!",
        created: "2026-09-30T09:10:00.000+0700",
        id: "10001",
      };
    }
    const image = (n) => ({
      content: `u-${n}`,
      filename: n,
      mimeType: "image/png",
      size: 10,
    });
    return {
      fields: {attachment: [image("a.png"), image("b.png"), image("c.png")]},
    };
  };
  const downloads = [];
  registerGetComment(server, fakeJira, async (url) => {
    downloads.push(url);
    return "B64";
  });
  const call = server.tools.get("get_comment");

  const plain = await call({comment_id: "10001", ticket_id: "GEM-1"});
  assert.equal(
    plain.content[0].text,
    "#10001 [2026-09-30] Alice: see !a.png|width=520,height=278! and !b.png!",
  );
  assert.deepEqual(paths, ["/issue/GEM-1/comment/10001"]);

  const {content} = await call({
    comment_id: "10001",
    include_images: true,
    ticket_id: "GEM-1",
  });
  // c.png belongs to the ticket but not to this comment.
  assert.deepEqual(downloads, ["u-a.png", "u-b.png"]);
  assert.equal(content.length, 3);
  assert.equal(paths[2], "/issue/GEM-1?fields=attachment");
});
