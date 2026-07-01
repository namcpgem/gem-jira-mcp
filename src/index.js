import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {registerAddComment} from "./tools/add-comment.js";
import {registerCreateTicket} from "./tools/create-ticket.js";
import {registerGenerateReleaseNotes} from "./tools/generate-release-notes.js";
import {registerGetTicket} from "./tools/get-ticket.js";
import {registerLinkIssues} from "./tools/link-issues.js";
import {registerLogWork} from "./tools/log-work.js";
import {registerSearchTickets} from "./tools/search-tickets.js";
import {registerTransitionTicket} from "./tools/transition-ticket.js";
import {registerUpdateTicket} from "./tools/update-ticket.js";

const server = new McpServer({name: "jira-mcp", version: "1.0.0"});

registerGetTicket(server);
registerTransitionTicket(server);
registerUpdateTicket(server);
registerAddComment(server);
registerSearchTickets(server);
registerCreateTicket(server);
registerGenerateReleaseNotes(server);
registerLinkIssues(server);
registerLogWork(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Jira MCP server running on stdio");
