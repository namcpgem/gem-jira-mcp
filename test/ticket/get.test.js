import assert from "node:assert/strict";
import {test} from "node:test";
import {registerGetTicket} from "../../src/tools/ticket/get.js";
import {fakeServer} from "../helpers/fake-server.js";

const FIELDS =
  "summary,status,assignee,reporter,priority,duedate,timetracking," +
  "labels,description,subtasks,attachment,customfield_11300";

test("get_ticket formats issue fields without hitting live Jira", async () => {
  const server = fakeServer();
  const fakeJira = async (method, path) => {
    assert.equal(method, "GET");
    // Only the fields the tool prints; comments stay out unless asked for.
    assert.equal(path, `/issue/GEM-1?fields=${FIELDS}`);
    return {
      fields: {
        assignee: {displayName: "Alice"},
        customfield_11300: "2026-01-01",
        description: "desc",
        duedate: "2026-02-01",
        labels: ["a", "b"],
        priority: {name: "High"},
        reporter: {displayName: "Bob"},
        status: {name: "In Progress"},
        subtasks: [],
        summary: "Do the thing",
        timetracking: {originalEstimate: "2h"},
      },
      key: "GEM-1",
    };
  };
  registerGetTicket(server, fakeJira);

  const result = await server.tools.get("get_ticket")({ticket_id: "GEM-1"});
  const text = result.content[0].text;
  assert.match(text, /Key: GEM-1/);
  assert.match(text, /Assignee: Alice/);
  assert.match(text, /Start Date: 2026-01-01/);
  // Unset fields and comments cost the caller tokens, so they stay out.
  assert.doesNotMatch(text, /Subtasks/);
  assert.doesNotMatch(text, /Comments/);
});

test("get_ticket omits unset fields but keeps the ones that are set", async () => {
  const server = fakeServer();
  const fakeJira = async () => ({
    fields: {status: {name: "Open"}, summary: "Bare ticket"},
    key: "GEM-2",
  });
  registerGetTicket(server, fakeJira);

  const text = (await server.tools.get("get_ticket")({ticket_id: "GEM-2"}))
    .content[0].text;
  assert.equal(
    text,
    "Key: GEM-2\nSummary: Bare ticket\nStatus: Open\nAssignee: Unassigned",
  );
});

test("get_ticket returns comments on request and flags truncation", async () => {
  const server = fakeServer();
  const paths = [];
  const fakeJira = async (_method, path) => {
    paths.push(path);
    return issue;
  };
  const issue = {
    fields: {
      comment: {
        comments: [
          {
            author: {displayName: "Alice"},
            body: "the answer is 42",
            created: "2026-07-01T10:00:00.000+0700",
            id: "10001",
          },
        ],
        total: 3,
      },
      status: {name: "Open"},
      summary: "Has comments",
    },
    key: "GEM-3",
  };
  registerGetTicket(server, fakeJira);
  const call = server.tools.get("get_ticket");

  assert.doesNotMatch(
    (await call({ticket_id: "GEM-3"})).content[0].text,
    /the answer is 42/,
  );
  const text = (await call({include_comments: true, ticket_id: "GEM-3"}))
    .content[0].text;
  assert.equal(paths[1], `/issue/GEM-3?fields=${FIELDS},comment`);
  assert.match(text, /Comments \(1 most recent of 3\):/);
  // The ID is what update_comment and delete_comment take.
  assert.match(text, /#10001 \[2026-07-01\] Alice: the answer is 42/);
});

test("get_ticket caps a long comment thread and says it capped it", async () => {
  const server = fakeServer();
  const comments = Array.from({length: 45}, (_, n) => ({
    author: {displayName: "Alice"},
    body: `comment ${n + 1}`,
    created: "2026-07-01T10:00:00.000+0700",
  }));
  registerGetTicket(server, async () => ({
    fields: {comment: {comments, total: 45}, status: {}, summary: "Busy"},
    key: "GEM-4",
  }));

  const text = (
    await server.tools.get("get_ticket")({
      include_comments: true,
      ticket_id: "GEM-4",
    })
  ).content[0].text;

  assert.match(text, /Comments \(20 most recent of 45\):/);
  assert.match(text, /comment 45/);
  assert.match(text, /comment 26/);
  assert.doesNotMatch(text, /comment 25\b/);
});

test("get_ticket returns image attachments as image blocks on request", async () => {
  const server = fakeServer();
  const attachment = [
    {content: "u1", filename: "shot.png", mimeType: "image/png", size: 10},
    {
      content: "u2",
      filename: "spec.pdf",
      mimeType: "application/pdf",
      size: 10,
    },
    {content: "u3", filename: "huge.png", mimeType: "image/png", size: 9e6},
    {content: "u4", filename: "gone.jpg", mimeType: "image/jpeg", size: 10},
  ];
  const downloads = [];
  const download = async (url) => {
    downloads.push(url);
    if (url === "u4") throw new Error("Jira attachment 404");
    return "BASE64";
  };
  registerGetTicket(
    server,
    async () => ({
      fields: {attachment, status: {}, summary: "Has shots"},
      key: "GEM-5",
    }),
    download,
  );
  const call = server.tools.get("get_ticket");

  const plain = await call({ticket_id: "GEM-5"});
  assert.equal(plain.content.length, 1);
  assert.match(plain.content[0].text, /Attachments: shot.png, spec.pdf/);
  assert.equal(downloads.length, 0);

  const {content} = await call({include_images: true, ticket_id: "GEM-5"});
  assert.deepEqual(downloads, ["u1", "u4"]);
  assert.deepEqual(content.slice(1), [
    {data: "BASE64", mimeType: "image/png", type: "image"},
  ]);
  assert.match(content[0].text, /\[image 1\] shot.png/);
  assert.match(
    content[0].text,
    /gone.jpg: download failed \(Jira attachment 404\)/,
  );
  // Skipped for size, not count: raising image_limit would not help.
  assert.match(content[0].text, /huge.png: not shown, too large \(9.0 MB\)/);
  assert.doesNotMatch(content[0].text, /more image/);
});

test("get_ticket keeps returned images within a base64 byte budget", async () => {
  const server = fakeServer();
  // 3.5 MB raw ≈ 4.67 MB base64: each fits alone, but only two fit the budget.
  const attachment = ["a", "b", "c"].map((n) => ({
    content: n,
    filename: `${n}.png`,
    mimeType: "image/png",
    size: 3_500_000,
  }));
  const downloads = [];
  registerGetTicket(
    server,
    async () => ({
      fields: {attachment, status: {}, summary: "Big"},
      key: "GEM-6",
    }),
    async (url) => {
      downloads.push(url);
      return "B64";
    },
  );

  const {content} = await server.tools.get("get_ticket")({
    include_images: true,
    ticket_id: "GEM-6",
  });
  assert.deepEqual(downloads, ["a", "b"]);
  assert.equal(content.length, 3);
  assert.match(content[0].text, /c.png: not shown, total size cap reached/);
});

test("get_ticket returns up to image_limit images, default 5", async () => {
  const server = fakeServer();
  const attachment = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    content: `u${n}`,
    filename: `${n}.png`,
    mimeType: "image/png",
    size: 10,
  }));
  registerGetTicket(
    server,
    async () => ({
      fields: {attachment, status: {}, summary: "Many"},
      key: "GEM-7",
    }),
    async () => "B64",
  );
  const call = server.tools.get("get_ticket");

  const byDefault = await call({include_images: true, ticket_id: "GEM-7"});
  assert.equal(byDefault.content.length, 6);
  assert.match(
    byDefault.content[0].text,
    /2 more image\(s\) not shown \(max 5/,
  );

  const raised = await call({
    image_limit: 7,
    include_images: true,
    ticket_id: "GEM-7",
  });
  assert.equal(raised.content.length, 8);
  assert.doesNotMatch(raised.content[0].text, /not shown/);
});

test("get_ticket lists worklogs with their IDs from the worklog endpoint", async () => {
  const server = fakeServer();
  const paths = [];
  const fakeJira = async (_method, path) => {
    paths.push(path);
    if (path === "/issue/GEM-4/worklog") {
      return {
        total: 3,
        worklogs: [
          {
            author: {displayName: "Alice"},
            comment: "pairing",
            id: "20001",
            started: "2026-07-02T09:00:00.000+0700",
            timeSpent: "2h",
          },
        ],
      };
    }
    return {fields: {status: {name: "Open"}, summary: "Logged"}, key: "GEM-4"};
  };
  registerGetTicket(server, fakeJira);

  const text = (
    await server.tools.get("get_ticket")({
      include_worklogs: true,
      ticket_id: "GEM-4",
    })
  ).content[0].text;
  assert.deepEqual(paths, [
    `/issue/GEM-4?fields=${FIELDS}`,
    "/issue/GEM-4/worklog",
  ]);
  assert.match(text, /Worklogs \(1 most recent of 3\):/);
  // The ID is what update_worklog and delete_worklog take.
  assert.match(text, /#20001 \[2026-07-02\] Alice 2h: pairing/);
});
