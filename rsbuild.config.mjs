import {defineConfig, rspack} from "@rsbuild/core";

// Bundles the MCP server into a single dist/index.js that runs with no
// node_modules, the file package.json's "bin" points at.
export default defineConfig({
  output: {
    distPath: {root: "dist"},
    minify: true,
    target: "node",
  },
  source: {
    entry: {index: "./src/index.js"},
  },
  tools: {
    rspack: {
      module: {
        // Keep import.meta.url live: jira-client.js resolves .env relative to
        // the running file, not the path it was built from.
        parser: {javascript: {importMeta: false}},
      },
      plugins: [
        new rspack.BannerPlugin({
          banner: "#!/usr/bin/env node",
          entryOnly: true,
          raw: true,
        }),
      ],
    },
  },
});
