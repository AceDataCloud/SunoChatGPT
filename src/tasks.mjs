import { httpsUrl } from "./auth.mjs";
export class TaskError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
export function taskView(taskId, task) {
  const response =
    task.response && typeof task.response === "object" ? task.response : {};
  const raw = String(task.state ?? "").toLowerCase();
  const failed =
    ["failed", "error", "cancelled", "canceled"].includes(raw) ||
    response.success === false;
  const complete =
    !failed &&
    response.success === true &&
    ["", "complete", "completed", "success"].includes(raw);
  const state = failed
    ? "failed"
    : complete
      ? "complete"
      : ["pending", "processing"].includes(raw)
        ? raw
        : "unknown";
  return {
    task_id: taskId,
    state,
    terminal: failed || complete,
    tracks:
      complete && Array.isArray(response.data)
        ? response.data
            .filter((x) => x && typeof x === "object")
            .slice(0, 20)
            .map((x) => ({
              title: String(x.title ?? "Untitled").slice(0, 200),
            }))
        : [],
    media_available: false,
    billing_verified: false,
  };
}
export async function getOwnedTask(reader, principal, taskId) {
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
  return taskView(taskId, task);
}
export class HttpOwnedTaskReader {
  constructor({ url, token, fetchImpl = fetch }) {
    this.url = httpsUrl(url, "owned-task readback URL");
    if (!token) throw new Error("readback service credential required");
    this.token = token;
    this.fetch = fetchImpl;
  }
  async getOwned(taskId, principal) {
    // Proposed internal boundary; must authorize subject+tenant atomically before
    // readback. Never aim this envelope at the public /suno/tasks API directly.
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
