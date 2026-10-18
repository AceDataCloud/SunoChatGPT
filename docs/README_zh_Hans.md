# ChatGPT 的 Suno 音乐任务应用 · Ace Data Cloud 提供

**实现预览，尚未部署或上架官方应用目录。** 本应用由 Ace Data Cloud 独立提供，并非 Suno 官方应用；名称和品牌权利仍须审核。[English](../README.md)

目标是让用户搜 Suno 就能找到明确标注 Ace 提供者的独立应用。当前只读本人已有任务，不生成音乐、不删除、不付款，也不替换 ChatGPT 底层模型。

**0.2.0 实现更新：**[五项独立运行配置](../profiles/README.md)已共用本源引擎补齐；单进程仍只暴露一项服务的工具/权限/组件，其余四项有各自参数、结果卡片和中英说明，不是已发布的五应用合集。

## 已公开的独立实现包：v0.2.0

源码已合并，五项各自的可安装实现包已在[GitHub v0.2.0 Release](https://github.com/AceDataCloud/SunoChatGPT/releases/tag/v0.2.0)公开；这是**实现预览版分发，不是ChatGPT目录上架或公共runtime**。

分别下载：[Suno](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/suno-chatgpt-0.2.0.tar.gz) · [Seedance](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/seedance-chatgpt-0.2.0.tar.gz) · [HappyHorse](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/happyhorse-chatgpt-0.2.0.tar.gz) · [GPT Image](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/gpt-image-chatgpt-0.2.0.tar.gz) · [Nano Banana](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/nano-banana-chatgpt-0.2.0.tar.gz)。

先对照[SHA256SUMS](https://github.com/AceDataCloud/SunoChatGPT/releases/download/v0.2.0/SHA256SUMS)校验所选归档，再解压读INSTALL.md。Node.js22+用`npm ci --omit=dev --ignore-scripts`安装；只有准备好经过审查的运维授权环境后才运行`node run-profile.mjs`。启动器固定一项profile，归档只带它自己的构建组件，不包含凭据，缺issuer/readback时拒绝启动。

2026-10-19已对五包逐文件校验、生产依赖安装、SDK/组件加载和缺配置拒绝启动逐项验证；七份公开下载均已匿名读回校验SHA-256。tag指向`fd6c5aed683d0f708767d8649b31f420d9930ae6`，不代表真实ChatGPT安装/调用。完整工件摘要见Release manifest；不改private npm属性或虚构npm发布。

## 1. 从官方入口安装

目前**没有已发布的官方安装链接**，不能把 GitHub、MCP 包或本地测试当作目录上架。正式发布后在 ChatGPT 应用目录搜 **Suno Tasks by Ace Data Cloud**，核对提供者再连接。获准的开发测试则由有权限的既有组织添加部署后的 `/mcp` 地址，并在 More 菜单选择应用；本仓不创建账号/应用或接受协议。

![ChatGPT 官方开发者模式 More 菜单原图，非 Ace 已安装截图](https://github.com/user-attachments/assets/26852b36-7f9e-4f48-a515-aebd87173399)

来源：[OpenAI 官方示例](https://github.com/openai/openai-apps-sdk-examples/blob/18cc38e78a968712c357bacdc3c79fead5bfc6b4/README.md#testing-in-chatgpt)，2026-10-17 取得；原拍摄日期/版本未注明，不能证明本 App 上线。

## 2. 登录 Ace 并准备自己的 API Token

1. 打开 [Ace → Applications](https://platform.acedata.cloud/console/applications?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=sunochatgpt_readme_api_key)，注册/登录；没有 General application 时先点 **Initialize General Application**。
2. 在 **General application** 复制现有 Key，或 **Manage Keys → Create** 创建有明确名字的专用 Key；核对 Suno 权限、到期、Allowed APIs、余额与[当前价格](https://platform.acedata.cloud/models?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=sunochatgpt_readme_pricing)，不承诺固定免费额度。
3. 仅复制原 Token，不加 Bearer、不放到提示词、截图、Git 或组件里；`platform-...` 管理凭据不是服务 API Key。

![Ace Applications 复制 Key/进入 Manage Keys，已脱敏](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/get-api-key-en.png)

![Ace 创建专用 Key，已脱敏](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/create-api-key-en.png)

图片来自 AceDataCloud/SunoDify 固定提交 `8d3d03570e73324220f111f7fe343da0792a8071`，2026-10-18 复用；原拍摄日期未注明。它们只说明 Ace 控制台，不是 ChatGPT 授权图；图中的 Dify tutorial 为旧示例名称，请为本集成另取名字。

## 3. ChatGPT 在哪里授权

本应用用浏览器 OAuth 登录授权，**ChatGPT 没有本仓虚构的“粘贴 Ace API Key”框**。获准安装后点 Connect，进入 Ace 授权页，只同意查询已有音乐任务。

上一步说明现有 API 控制；App 专用短期 `music.tasks:read` token 和按主体/租户过滤的内部任务读回接口仍待平台实现，通用 API Key 不能替代。运维服务凭据只放服务器秘密存储，不返回模型/UI。详见[发布前依赖](../production-readiness.md)。

## 4. 首次使用和结果

部署和受限授权就绪后输入“查看我这个已有 Suno 任务：&lt;任务编号&gt;”。只查询同一个 ID，显示等待/处理中/完成/失败/未知，成功时显示曲名。点 **Refresh this task / 查询同一任务** 再查，不后台轮询、不创建收费任务。

本版没有可播放音频；中间预览、200 或工具绿灯不等于成功终态。正式验收用已批准的旧成功任务同 ID，核媒体、原唯一账单和查询无额外扣费；本轮不新生成。扩生成需单独预算、当期价格和媒体/版权准入。

## 常见问题

- 401：重新走获准 OAuth，别粘通用 Key 替代。
- 403：查询权限不足或来源不可信，别扩大权限绕过。
- 404：任务不存在/已删除/非本人；不要尝试他人编号。
- 429/内部错误：按返回状态处理，只重查原 ID，不切模型、不新发生成。
- Seedance、HappyHorse、GPT Image、Nano Banana：已具备[各自运行配置](../profiles/README.md)，一次只启动一个服务，Suno工具不会暗中包揽。候选实现和MCP包都不等于ChatGPT收录。

## 免费本地验证

```bash
npm ci --ignore-scripts
npm run build
npm run check
npm test
```

用本机签名虚构身份、回环 HTTP 与真实 MCP SDK 测协议、权限、组件资源；不启动浏览器、不发外部 API、不新建连接。真实 ChatGPT 安装/渲染和 App Directory 审核还未完成。
