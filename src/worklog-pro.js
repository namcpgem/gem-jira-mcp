import {AUTH_HEADER, JIRA_HOST, jiraRequest} from "./jira-client.js";

// WorklogPRO (Deniz) work-type / activity ids, keyed by user-friendly aliases.
export const WORK_TYPES = {
  code: 3,
  coding: 3,
  deploy: 5,
  deployment: 5,
  design: 2,
  dev: 3,
  fix: 8,
  management: 11,
  meeting: 12,
  mgmt: 11,
  misc: 14,
  operation: 6,
  ops: 6,
  other: 14,
  others: 14,
  qa: 4,
  release: 5,
  req: 1,
  requirement: 1,
  research: 13,
  test: 4,
  testing: 4,
  translation: 10,
};

export const ACTIVITIES = {
  correct: 8,
  correction: 8,
  create: 7,
  fix: 8,
  new: 7,
  review: 9,
};

// WorklogPRO interprets the start time in the Jira server's timezone.
const WORKLOG_TZ = process.env.JIRA_TIMEZONE || "Asia/Ho_Chi_Minh";

// Convert an ISO instant into the two formats the WorklogPRO form expects:
// startDateJS in Jira display format (authoritative) and startDate as a hidden
// "YYYY-MM-DD HH:mm" mirror, both rendered in the Jira server timezone.
const worklogDates = (iso) => {
  const date = new Date(iso);
  const display = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      month: "short",
      timeZone: WORKLOG_TZ,
      year: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const iso24 = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: WORKLOG_TZ,
      year: "numeric",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    startDate: `${iso24.year}-${iso24.month}-${iso24.day} ${iso24.hour}:${iso24.minute}`,
    startDateJS: `${display.day}/${display.month}/${display.year} ${display.hour}:${display.minute} ${display.dayPeriod}`,
  };
};

const restLogWork = (ticketId, timeSpent, {comment, started}) => {
  const body = {timeSpent};
  if (started) body.started = started;
  if (comment) body.comment = comment;
  return jiraRequest("POST", `/issue/${ticketId}/worklog`, body);
};

// Log work through the WorklogPRO web form so Type of Work (wa_1) and Type of
// Activity (wa_2) get set — the REST worklog API cannot set them. Falls back to
// plain REST logging if the form is unavailable.
/**
 * @param {string} ticketId
 * @param {string} timeSpent
 * @param {{activity?: number|null, comment?: string, started?: string, workType?: number|null}} [opts]
 */
export const logWorkPro = async (ticketId, timeSpent, opts = {}) => {
  const {activity, comment, started, workType} = opts;
  // No attributes requested → plain REST worklog. The WorklogPRO form mandates
  // Type of Activity, so routing an attribute-less log through it would fail.
  if (workType == null && activity == null) {
    return restLogWork(ticketId, timeSpent, {comment, started});
  }
  const formRes = await fetch(
    `${JIRA_HOST}/secure/WPCreateWorklogOnIssueWithWorkLogAction!default.jspa?issueKey=${encodeURIComponent(ticketId)}&decorator=dialog&inline=true`,
    {headers: {Accept: "text/html,*/*", Authorization: AUTH_HEADER}},
  );
  if (!formRes.ok) {
    return restLogWork(ticketId, timeSpent, {comment, started});
  }
  // The atl_token must match the session's atlassian.xsrf.token cookie; Basic
  // Auth makes a fresh session per request, so the POST has to reuse the cookies
  // the GET set or Jira rejects it with "XSRF Security Token Missing".
  const cookie = formRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const formHtml = await formRes.text();
  const tokenMatch = formHtml.match(/atl_token=([A-Za-z0-9%_-]+)/);
  if (!tokenMatch) throw new Error("WorklogPRO: CSRF token not found");
  const atlToken = tokenMatch[1];

  // The form pre-fills the current time in the exact formats Jira expects; reuse
  // them as defaults so a worklog without an explicit start still posts.
  const fieldValue = (name) =>
    formHtml.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? "";
  const dates = started ? worklogDates(started) : null;

  const params = new URLSearchParams({
    adjustEstimate: "auto",
    issueKey: ticketId,
    remainingEstimateOptionsExpanded: "false",
    timeLogged: timeSpent,
  });
  // startDateJS is authoritative and must be Jira's display format (e.g.
  // "22/Jul/26 8:24 PM"); any other format is silently ignored.
  params.set("startDateJS", dates?.startDateJS ?? fieldValue("startDateJS"));
  params.set("startDate", dates?.startDate ?? fieldValue("startDate"));
  if (workType != null) params.set("wa_1", String(workType));
  if (activity != null) params.set("wa_2", String(activity));
  if (comment) params.set("comment", comment);

  const postRes = await fetch(
    `${JIRA_HOST}/secure/WPCreateWorklogOnIssueWithWorkLogAction.jspa?atl_token=${atlToken}`,
    {
      body: params.toString(),
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      method: "POST",
    },
  );
  if (!postRes.ok) {
    return restLogWork(ticketId, timeSpent, {comment, started});
  }
  const body = await postRes.text();
  if (body.includes("XSRF Security Token Missing")) {
    throw new Error("WorklogPRO: XSRF token rejected");
  }
  // A successful submit renders no form error; any class="error" element (e.g.
  // "Type of Activity is required") means the worklog was not created.
  const errMatch = body.match(/class="error"[^>]*>([^<]+)</);
  if (errMatch || body.includes("aui-message-error")) {
    throw new Error(
      errMatch
        ? `WorklogPRO: ${errMatch[1].trim()}`
        : "WorklogPRO: submission failed",
    );
  }
  return null;
};
