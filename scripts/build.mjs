import { build } from "esbuild";
import fs from "node:fs";
import { PROFILE_IDS, getProfile } from "../src/profiles.mjs";
function escape(s) {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
}
for (const id of PROFILE_IDS) {
  const profile = getProfile(id);
  const output = await build({
    entryPoints: ["web/widget.mjs"],
    bundle: true,
    format: "iife",
    write: false,
    minify: true,
    define: { __APP_PROFILE__: JSON.stringify(profile) },
  });
  const js = output.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  fs.mkdirSync(`dist/${id}`, { recursive: true });
  fs.writeFileSync(
    `dist/${id}/widget.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(profile.title)}</title><main><h1>${escape(profile.brand)} task viewer</h1><p>${escape(profile.attribution)}</p><p id="status" role="status">Waiting for task result / 等待任务结果</p><ul id="tracks"></ul><button id="refresh" disabled>Refresh this task / 查询同一任务</button><p>No generation, payment or media playback in this version.</p></main><script>${js}</script></html>`,
  );
}
