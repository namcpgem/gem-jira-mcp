import {createWriteStream, mkdirSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {ZipArchive} from "archiver";

const pkg = JSON.parse(await readFile("package.json", "utf8"));

mkdirSync("release", {recursive: true});

const outPath = `release/${pkg.name}-v${pkg.version}.zip`;
const output = createWriteStream(outPath);
const archive = new ZipArchive({zlib: {level: 9}});

output.on("close", () => {
  console.log(`Created ${outPath} (${archive.pointer()} bytes)`);
});

archive.on("warning", (err) => {
  throw err;
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.file("dist/index.js", {name: "index.js"});
archive.file("package.json", {name: "package.json"});
archive.file("README.md", {name: "README.md"});
archive.file(".env.example", {name: ".env.example"});
await archive.finalize();
