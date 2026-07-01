import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const BASE = process.env.JIRA_HOST + "/rest/api/2";
const AUTH = Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`).toString("base64");
const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const jiraRequest = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

