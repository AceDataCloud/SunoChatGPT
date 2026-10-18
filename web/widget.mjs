import { App } from "@modelcontextprotocol/ext-apps";
const app = new App(
  { name: "Suno task viewer by Ace Data Cloud", version: "0.1.0" },
  {},
);
let taskId;
let canRefresh = false;
const status = document.getElementById("status");
const list = document.getElementById("tracks");
const refresh = document.getElementById("refresh");
const render = (result) => {
  list.replaceChildren();
  const data = result.structuredContent;
  if (result.isError || !data || typeof data.task_id !== "string") {
    status.textContent = "Task could not be read / 无法读取任务";
    canRefresh = false;
    refresh.disabled = true;
    return;
  }
  taskId = data.task_id;
  status.textContent = String(data.state ?? "unknown");
  for (const track of Array.isArray(data.tracks) ? data.tracks : []) {
    const li = document.createElement("li");
    li.textContent = String(track.title ?? "Untitled");
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
      name: "suno_get_existing_task",
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
