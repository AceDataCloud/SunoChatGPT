# ChatGPT 的 GPT Image 任务应用 · Ace Data Cloud 提供

**独立实现候选，未部署、未上架。** 由Ace独立提供，并非GPT Image官方应用。共用同一源引擎，但每个进程只开放一个服务的工具/组件，不能把它说成已发布合集或五个目录条目。[English](README.md)

## 官方安装

暂无官方listing URL。目标搜索词 `GPT Image` / `GPT Image Tasks by Ace Data Cloud`，发布者需显示Ace。未来获准端点就绪后用ChatGPT **Connect→Ace浏览器OAuth**，在对话More菜单选择；手动连接/本地测试不是市场安装。[官方菜单原图及日期边界](README.md#1-official-installation-status)。

## Ace登录与Token

在[Applications](https://platform.acedata.cloud/console/applications?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=gptimagechatgpt_readme_api_key)注册/登录，缺少General application先初始化。复制现有Key，或Manage Keys→Create命名专用Key，核对服务/Allowed APIs、到期、限额、余额和[当前价格](https://platform.acedata.cloud/models?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=gptimagechatgpt_readme_pricing)；不承诺固定试用额度。[真实脱敏Key图片](README.md#2-ace-registration-and-token-controls)来自固定Ace源，原拍摄日期/版本未知，Dify tutorial为旧标签。

**本项目不虚构ChatGPT粘Key输入框**。Key说明只解释现有账户控制；实际App需要专用 `gpt-image.tasks:read` OAuth权限。生产issuer、PKCE/consent/撤销与可信任务读回仍待平台实现，通用Key不能替代。

## 首次使用与同ID结果

正式依赖/获准测试就绪后输入“查看我这个已有GPT Image任务：&lt;编号&gt;”。唯一参数task_id；不接受service/model/owner/action。读取权威原记录的身份、租户、服务/模型归属。仅显示状态及安全image元数据：width/height，刷新只查同ID、不生成/删除/付款，不抓取或播放媒体URL。等待或中间预览不是成功；失败不自动重发。

401重新走OAuth；403核专用scope而非扩权；404包括不存在/删除/非本人/跨服务/模型；429等候后只查同ID。真实ChatGPT安装、组件渲染、旧成功任务终态/媒体/唯一账单与普通搜索安装仍未验，不能以测试绿灯冒充。

## 可独立构建的配置

`profile.json`为本地服务合同，`runtime.json`为进程配置样例，`listing.json`为内部投稿草案，**都不是官方manifest或已提交审核**。设`APP_PROFILE=gpt-image`后单实例只有`gpt_image_get_existing_task`。先运行仓根npm ci/build/check/test；全为虚构身份/本机SDK，不发付费生成、不接受协议、不部署生产。品牌/多App重复规则仍待正式条文，不捏造禁止或允许结论。
