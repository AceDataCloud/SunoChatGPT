# ChatGPT 的 ACE Music 任务查看器

[English](README.md)

使用 `APP_PROFILE=acemusic` 启动 Apps SDK 适配器，提供只读工具 `acemusic_get_existing_task`。该工具通过专用范围 `acemusic.tasks:read` 验证用户、租户和任务所属服务，仅查询已有任务。部署时需按 [runtime.json](runtime.json) 配置 OAuth 和可信任务查询服务。

组件展示任务状态以及已完成音轨的标题、时长。部分失败时只返回成功的音轨；正在处理或提交结果待确认时保留原任务 ID 供刷新。查询不会发起新的创作，结果不包含歌词正文、音频链接和 API Key。

在仓库根目录依次运行 `npm ci`、`npm run build`、`npm test` 可验证本地适配器。[目录发布草案](listing.json) · [任务 API](https://platform.acedata.cloud/documents/acemusic-tasks-integration)

导入任务完成后，原任务视图可显示素材名称、类型和可用状态。该工具继续使用现有只读范围。
