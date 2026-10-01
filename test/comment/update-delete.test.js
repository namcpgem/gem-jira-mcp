import {registerDeleteComment} from "../../src/tools/comment/delete.js";
import {registerUpdateComment} from "../../src/tools/comment/update.js";
import {testRequests} from "../helpers/fake-server.js";

testRequests([
  [
    registerUpdateComment,
    "update_comment",
    {body: "fixed typo", comment_id: "10001", ticket_id: "GEM-1"},
    ["PUT", "/issue/GEM-1/comment/10001", {body: "fixed typo"}],
  ],
  [
    registerDeleteComment,
    "delete_comment",
    {comment_id: "10001", ticket_id: "GEM-1"},
    ["DELETE", "/issue/GEM-1/comment/10001"],
  ],
]);
