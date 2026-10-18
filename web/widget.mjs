import { App } from "@modelcontextprotocol/ext-apps";
const profile = __APP_PROFILE__;
const app = new App({ name: profile.title, version: profile.version }, {});
let taskId;
let canRefresh = false;
const status = document.getElementById("status");
const list = document.getElementById("tracks");
const refresh = document.getElementById("refresh");
const render = (result) => {
  list.replaceChildren();
  const data = result.structuredContent;
  if (
    result.isError ||
    !data ||
    typeof data.task_id !== "string" ||
    data.service !== profile.id ||
    data.tool_name !== profile.tool
  ) {
    status.textContent = "Task could not be read / 无法读取任务";
    canRefresh = false;
    refresh.disabled = true;
    return;
  }
  taskId = data.task_id;
  status.textContent = String(data.state ?? "unknown");
  for (const asset of Array.isArray(data.assets) ? data.assets : []) {
    const li = document.createElement("li");
    const details = [];
    if (Number.isFinite(asset.duration_seconds))
      details.push(`${asset.duration_seconds}s`);
    if (Number.isFinite(asset.width) && Number.isFinite(asset.height))
      details.push(`${asset.width} × ${asset.height}`);
    li.textContent = [String(asset.title ?? "Untitled"), ...details].join(
      " · ",
    );
    list.append(li);
  }
  canRefresh = data.terminal !== true;
  refresh.disabled = !canRefresh;
};
app.ontoolresult = render;
refresh.addEventListener("click", async () => {
  if (!taskId) return;
  refresh.disabled = true;
  try {
    const result = await app.callServerTool({
      name: profile.tool,
      arguments: { task_id: taskId },
    });
    render(result);
  } catch {
    status.textContent =
      "Query failed. Reconnect or retry the same task / 查询失败，请重新连接或查同一任务";
  } finally {
    refresh.disabled = !canRefresh;
  }
});
app.connect().catch(() => {
  status.textContent = "Host connection unavailable / 未连接应用宿主";
  refresh.disabled = true;
});
