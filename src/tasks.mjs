import { httpsUrl } from "./auth.mjs";
import { getProfile } from "./profiles.mjs";
export class TaskError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const COMPLETE = new Set(["complete", "completed", "succeeded", "success"]);
const FAILED = new Set(["failed", "error", "cancelled", "canceled"]);
const PROCESSING = new Set([
  "processing",
  "running",
  "generating",
  "in_progress",
]);
const PENDING = new Set(["pending", "queued", "submitted", "waiting"]);
function itemsFrom(response) {
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === "object")
    return [response.data];
  return [];
}
function number(value, max) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max
    ? value
    : undefined;
}
export function taskView(taskId, task, profile = getProfile()) {
  const response =
    task.response && typeof task.response === "object" ? task.response : {};
  const raw = String(task.state ?? task.status ?? "").toLowerCase();
  const items = itemsFrom(response)
    .filter((x) => x && typeof x === "object")
    .slice(0, 20);
  const itemFailed =
    profile.id === "happyhorse" &&
    items.some((x) =>
      FAILED.has(String(x.state ?? x.status ?? "").toLowerCase()),
    );
  const failed =
    FAILED.has(raw) ||
    response.success === false ||
    task.success === false ||
    Boolean(response.error) ||
    itemFailed;
  let complete = false;
  // Never upgrade running/queued states just because preview media or success flags exist.
  if (!failed && !PROCESSING.has(raw) && !PENDING.has(raw)) {
    if (profile.id === "gpt-image")
      complete = Number.isFinite(task.finished_at) && task.finished_at > 0;
    else if (profile.id === "suno")
      complete = response.success === true && (!raw || COMPLETE.has(raw));
    else
      complete =
        COMPLETE.has(raw) ||
        response.success === true ||
        task.success === true ||
        (profile.id === "happyhorse" &&
          items.length > 0 &&
          items.every((x) =>
            COMPLETE.has(String(x.state ?? x.status ?? "").toLowerCase()),
          ));
  }
  const state = failed
    ? "failed"
    : complete
      ? "complete"
      : PROCESSING.has(raw)
        ? "processing"
        : PENDING.has(raw)
          ? "pending"
          : "unknown";
  const assets = complete
    ? items.map((x, index) => {
        const asset = {
          kind: profile.kind,
          title: String(
            x.title ?? x.name ?? `${profile.brand} result ${index + 1}`,
          ).slice(0, 200),
        };
        const duration = number(x.duration_seconds ?? x.duration, 86400);
        const width = number(x.width, 32768);
        const height = number(x.height, 32768);
        if (profile.kind !== "image" && duration !== undefined)
          asset.duration_seconds = duration;
        if (profile.kind !== "music") {
          if (width !== undefined) asset.width = width;
          if (height !== undefined) asset.height = height;
        }
        return asset;
      })
    : [];
  return {
    task_id: taskId,
    service: profile.id,
    brand: profile.brand,
    tool_name: profile.tool,
    state,
    terminal: failed || complete,
    assets,
    tracks:
      profile.kind === "music" ? assets.map((x) => ({ title: x.title })) : [],
    media_available: false,
    billing_verified: false,
  };
}
export async function getOwnedTask(
  reader,
  principal,
  taskId,
  profile = getProfile(),
) {
  if (!principal?.subject || !principal?.tenant)
    throw new TaskError(401, "authentication_required");
  const task = await reader.getOwned(taskId, principal);
  if (
    !task ||
    typeof task !== "object" ||
    task.owner_subject !== principal.subject ||
    task.tenant_id !== principal.tenant ||
    task.deleted
  )
    throw new TaskError(404, "task_not_found");
  // A profile cannot read a task from a different product even if the same user owns it.
  if (task.service !== profile.id) throw new TaskError(404, "task_not_found");
  // The OpenAI task store is shared by multiple image models; service alone is insufficient.
  if (
    profile.modelPrefix &&
    (typeof task.model !== "string" ||
      !task.model.startsWith(profile.modelPrefix))
  )
    throw new TaskError(404, "task_not_found");
  return taskView(taskId, task, profile);
}
export class HttpOwnedTaskReader {
  constructor({ url, token, fetchImpl = fetch, profile = getProfile() }) {
    this.url = httpsUrl(url, "owned-task readback URL");
    if (!token) throw new Error("readback service credential required");
    this.token = token;
    this.fetch = fetchImpl;
    this.profile = profile;
  }
  async getOwned(taskId, principal) {
    // Proposed trusted internal adapter, not an existing public task endpoint.
    const response = await this.fetch(this.url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        task_id: taskId,
        subject: principal.subject,
        tenant_id: principal.tenant,
        token_jti: principal.jti,
        service: this.profile.id,
        task_api: this.profile.taskApi,
        action: "retrieve",
      }),
    });
    if (response.status === 404) return null;
    if (!response.ok)
      throw new TaskError(
        [401, 403, 429].includes(response.status) ? response.status : 502,
        "readback_unavailable",
      );
    const body = await response.text();
    if (body.length > 1048576) throw new TaskError(502, "readback_unavailable");
    try {
      return JSON.parse(body);
    } catch {
      throw new TaskError(502, "readback_unavailable");
    }
  }
}
