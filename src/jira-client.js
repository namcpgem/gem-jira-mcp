import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({path: resolve(__dirname, "../.env")});

const BASE = `${process.env.JIRA_HOST}/rest/api/2`;
const AUTH = Buffer.from(
  `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`,
).toString("base64");
export const JIRA_HOST = process.env.JIRA_HOST;
export const AUTH_HEADER = `Basic ${AUTH}`;
const HEADERS = {
  Accept: "application/json",
  Authorization: AUTH_HEADER,
  "Content-Type": "application/json",
};

// Jira Data Center throws transient 5xx/429 under load. Retry only methods
// that are safe to replay: a 500 on POST may already have created a comment,
// a worklog or a transition, so replaying it would duplicate the side effect.
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const REPLAYABLE = new Set(["GET", "PUT", "DELETE"]);
const MAX_RETRIES = 2;

export const jiraRequest = async (method, path, body, attempt = 0) => {
  const res = await fetch(`${BASE}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: HEADERS,
    method,
  });
  if (!res.ok) {
    if (
      attempt < MAX_RETRIES &&
      RETRY_STATUS.has(res.status) &&
      REPLAYABLE.has(method)
    ) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      return jiraRequest(method, path, body, attempt + 1);
    }
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  // Not just 204: POST /issueLink answers 201 with an empty body, and parsing
  // that would report a link that was created as a failure.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Attachment content is binary and lives at an absolute URL outside
// /rest/api/2, so it cannot go through jiraRequest. Returns base64.
export const jiraDownload = async (url) => {
  const res = await fetch(url, {headers: {Authorization: AUTH_HEADER}});
  if (!res.ok) throw new Error(`Jira attachment ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
};
