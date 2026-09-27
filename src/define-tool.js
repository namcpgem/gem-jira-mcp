import {jiraRequest as defaultJiraRequest} from "./jira-client.js";

// Wraps a tool handler with the MCP response envelope: a resolved string
// becomes success content, a resolved array is passed through as content
// blocks (e.g. text + images), a thrown Error becomes an isError response.
// jiraRequest is threaded through as a parameter (not just imported) so
// tests can substitute a fake and exercise handlers without live Jira.
export const defineTool = (
  server,
  name,
  config,
  handler,
  jiraRequest = defaultJiraRequest,
) => {
  server.registerTool(name, config, async (params) => {
    try {
      const out = await handler(params, jiraRequest);
      return {
        content: Array.isArray(out) ? out : [{text: out, type: "text"}],
      };
    } catch (err) {
      return {content: [{text: err.message, type: "text"}], isError: true};
    }
  });
};
