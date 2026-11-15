# Changelog

使用 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的分区方式，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。日期表示版本准备日期；是否已公开发布以 GitHub Releases 为准。

## [Unreleased]

### Added
- 独立 Git 仓库与 MIT 开源许可。
- 面向社区的中英文 README、贡献指南与安装/升级/回退说明。
- 版本准备命令：同步版本号、锁文件和更新日志。
- GitHub Release 安装包、SHA-256 校验值及由更新日志生成的发布说明。
- CI 自动测试和标签触发的 GitHub Release 工作流。

### Changed
- 明确保留现有包名，采用 GitHub Release 分发，不发布 npm。
- 安装包采用文件白名单，排除本地决议、测试目录、开发脚本与环境配置。

## [0.1.0] - 2026-11-13

初始本地开发版本，未进行社区公开发布。

### Added
- 项目会话内的「项目决议」视图，分为待定事项和已确认共识。
- 人工新增条目；用户与 agent 修改已有条目并双向移动状态。
- 每个工作区一份 Markdown，同项目会话共享、不同项目隔离。
- `prd_read` 与 `prd_update` 工具及项目决议上下文快照。
- 内容版本冲突检查、原子保存和页面内草稿保留。

### Notes
- 「已确认」表示形成共识，不代表已经执行完成。
- 仅支持本机工作区；具备任意 shell 权限的 agent 不受操作系统级新增限制。
