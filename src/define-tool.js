import {jiraRequest as defaultJiraRequest} from "./jira-client.js";

// Wraps a tool handler with the MCP response envelope: a resolved string
// becomes success content, a thrown Error becomes an isError response.
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
      const text = await handler(params, jiraRequest);
      return {content: [{text, type: "text"}]};
    } catch (err) {
      return {content: [{text: err.message, type: "text"}], isError: true};
    }
  });
};
