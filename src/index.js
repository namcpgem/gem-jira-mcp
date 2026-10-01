import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import pkg from "../package.json" with {type: "json"};
import {registerAddComment} from "./tools/comment/add.js";
import {registerLinkIssues} from "./tools/link/link.js";
import {registerUnlinkIssues} from "./tools/link/unlink.js";
import {registerGenerateReleaseNotes} from "./tools/release/generate.js";
import {registerCreateTicket} from "./tools/ticket/create.js";
import {registerGetTicket} from "./tools/ticket/get.js";
import {registerSearchTickets} from "./tools/ticket/search.js";
import {registerTransitionTicket} from "./tools/ticket/transition.js";
import {registerUpdateTicket} from "./tools/ticket/update.js";
import {registerLogWork} from "./tools/worklog/log.js";

const server = new McpServer({name: "jira-mcp", version: pkg.version});

registerGetTicket(server);
registerTransitionTicket(server);
registerUpdateTicket(server);
registerAddComment(server);
registerSearchTickets(server);
registerCreateTicket(server);
registerGenerateReleaseNotes(server);
registerLinkIssues(server);
registerUnlinkIssues(server);
registerLogWork(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Jira MCP server running on stdio");
