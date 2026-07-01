import {build} from "esbuild";

await build({
  banner: {
    js: [
      "#!/usr/bin/env node",
      "import { createRequire } from 'module';",
      "const require = createRequire(import.meta.url);",
    ].join("\n"),
  },
  bundle: true,
  entryPoints: ["src/index.js"],
  format: "esm",
  logLevel: "info",
  outfile: "dist/index.js",
  platform: "node",
  target: "node18",
});
