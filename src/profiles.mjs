import fs from "node:fs";
export const PROFILE_IDS = Object.freeze([
  "suno",
  "seedance",
  "happyhorse",
  "gpt-image",
  "nano-banana",
]);
export function getProfile(id = "suno") {
  if (!PROFILE_IDS.includes(id)) throw new Error("Unknown app profile");
  return Object.freeze(
    JSON.parse(
      fs.readFileSync(
        new URL(`../profiles/${id}/profile.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
}
