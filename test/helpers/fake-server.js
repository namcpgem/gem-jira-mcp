// Minimal stand-in for McpServer: captures the registered handler so tests
// can invoke a tool directly without an MCP transport.
export const fakeServer = () => {
  const tools = new Map();
  return {
    registerTool: (name, _config, handler) => tools.set(name, handler),
    tools,
  };
};
