# ACE Music tasks for ChatGPT

[简体中文](README_zh_Hans.md)

Run the Apps SDK adapter with `APP_PROFILE=acemusic` to expose one read-only tool, `acemusic_get_existing_task`. It retrieves an existing task on behalf of the signed-in owner and tenant using the dedicated `acemusic.tasks:read` scope. A caller cannot choose a different upstream service. Configure the reviewed OAuth issuer and owned-task reader described in [runtime.json](runtime.json) before serving it.

The component displays the original task state and the title and duration of completed tracks. For a partially failed group it displays only completed tracks. For pending or uncertain submission it retains the original task ID for refresh. It sends no generation requests and omits prompts, lyrics, media URLs and account credentials from results.

Run `npm ci`, `npm run build` and `npm test` from the repository root to validate the adapter locally. The [listing packet](listing.json) tracks remaining directory and deployment work. [ACE Music task API](https://platform.acedata.cloud/documents/acemusic-tasks-integration)

A completed reference import displays its name, type and availability in the original task view. The tool retains its existing read-only scope.
