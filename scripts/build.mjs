import { build } from "esbuild";
import fs from "node:fs";
const output = await build({
  entryPoints: ["web/widget.mjs"],
  bundle: true,
  format: "iife",
  write: false,
  minify: true,
});
const js = output.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(
  "dist/widget.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suno task viewer by Ace Data Cloud</title><main><h1>Suno task viewer</h1><p>Provided by Ace Data Cloud · Not an official Suno app</p><p id="status" role="status">Waiting for task result / 等待任务结果</p><ul id="tracks"></ul><button id="refresh" disabled>Refresh this task / 查询同一任务</button><p>No generation, payment or media playback in this version.</p></main><script>${js}</script></html>`,
);
