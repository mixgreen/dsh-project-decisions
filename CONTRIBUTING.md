# 贡献指南

感谢帮助改进项目决议插件。提交前请先描述实际使用场景；保持插件聚焦于项目决议，不扩展成任务调度或全局知识库。

## 本地开发

需要 Node.js 22+、npm、Git 和 tar，无第三方运行时依赖。

```sh
npm ci --ignore-scripts
npm run verify
npm run release:pack
```

- `host.js`：会话所属项目、工具、权限、上下文注入与 UI API。
- `store.js`：Markdown 解析、版本检查、保存。
- `client.js`：DSH `conversation.view` 中的两列视图。
- `tests/`：存储、Host 行为、视图注册和发布流程测试。
- `scripts/release.mjs`：版本准备与打包验证。

测试只能使用自己创建的临时目录；不要向真实项目写测试决议。不要手改 DSH 安装目录或用户 profile。界面修改应在真实 DSH 页面验证，并说明哪些桌面端／主题／升级场景没有验证。

## 修改边界

- 决议属于项目，同项目多会话共享；会话只是入口。
- 仅用户新增；agent 工具只能修改已有条目，不能 upsert。
- confirmed 表示共识，不表示执行完成。
- 一份 Markdown 是业务数据源；避免增加第二份持久化状态。
- 尽量小改动，不引入与问题无关的抽象或依赖。

## Pull request

请说明：解决什么问题、用户可见变化、测试命令及结果、尚未验证之处。功能或修复同时更新 CHANGELOG 的 Unreleased；涉及文档格式时必须写迁移及回退说明。版本号由维护者按 [发布流程](<RELEASING.md>)统一升级，不在多个 PR 中各自抢改。

提交 bug 时附 DSH 版本、插件版本、系统、重现步骤和脱敏错误。不要提交密钥、模型对话、真实决议文档或个人路径。安全敏感问题请使用 GitHub 仓库提供的私密安全报告渠道（若维护者已启用），不要在公开 Issue 中上传漏洞利用数据或凭据。

贡献按本项目 [MIT 许可证](<LICENSE>)分发。
