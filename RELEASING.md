# 版本、打包与发布

## 约定

- 分发渠道：GitHub Releases 的 npm 格式 `.tgz`，暂不发布 npm。
- 包名固定为 `@local/dsh-project-decisions`。改名会涉及已安装插件迁移，不能当作普通升版本处理。
- `package.json` 是版本号来源；`package-lock.json`、CHANGELOG 版本标题、Git 标签必须一致。
- Git 标签格式：`vX.Y.Z`，使用注解标签。不移动已发布标签、不覆盖旧 Release 包。
- 补丁修复／文档／发布流程用 patch，新兼容功能用 minor，不兼容变更用 major。0.x 阶段的破坏性调整至少升 minor，并明确说明。
- 每次功能或修复提交都更新 [CHANGELOG.md](<CHANGELOG.md>) 的 `Unreleased`，写用户能感知的变化、兼容性及迁移要求；不要复制原始 commit 列表。

## 首次接入 GitHub（维护者执行）

本地仓库准备不等于已公开发布。先在 GitHub 创建空仓库，再把它设置为 `origin`；不要猜测或使用别人的地址。

```sh
# 将 <你的仓库地址> 替换为刚创建的 GitHub 仓库 URL
 git remote add origin <你的仓库地址>
 git push -u origin main
```

建议开启 main 分支保护并要求 CI 通过。GitHub Actions 需要启用；Release 工作流通过仓库自带的 `GITHUB_TOKEN` 写 Release，无须提交个人 token。若仓库／组织策略禁止写权限，应由维护者在 GitHub 设置中调整。

仓库地址确定后，可补充 package.json 的 repository/homepage/bugs 元数据；在此之前不写虚假的链接。

## 日常开发

```sh
npm ci --ignore-scripts
# 修改代码、测试及 CHANGELOG.md 的 Unreleased
npm run verify
git add <本次修改的文件>
git commit -m "fix: describe the change"
```

提交格式建议 `feat:`、`fix:`、`docs:`、`chore:`。项目不安装 Git hooks、不引入额外版本管理服务或第三方发布依赖。

## 准备下一个版本

先提交代码和 Unreleased 内容，保证工作区干净，再执行：

```sh
npm run release:prepare -- patch
# 或 minor / major
```

命令同步更新：

1. package.json 的 version。
2. package-lock.json 的顶层及根包 version。
3. 将 Unreleased 内容移入带日期的新版本分区，保留空 Unreleased 供后续使用。

不会自动提交、打标签、推送或发布。没有实质 Unreleased 条目、工作区未提交或目标标签已存在时会停止，避免误发空版本或混入未审阅修改。

## 生成与检查安装包

```sh
npm run release:pack
```

输出到忽略的 `dist/vX.Y.Z/`，每个版本独立保存，避免新旧包与校验值混用：

- `local-dsh-project-decisions-X.Y.Z.tgz`
- `SHA256SUMS`
- `release-notes.md`（从对应 CHANGELOG 分区生成）

打包命令运行语法检查和所有测试，核对版本与日志，执行 `npm pack`，逐项检查 tarball 白名单，解压检查 Host／Client 语法和存储往返，并在独立临时消费目录实际安装 tarball、解析 Host／Client／图标／locale exports。临时目录自动清理。

**这不是完整 DSH GUI 验收。** 公开发版前还应在独立 DSH profile 或测试环境安装该包，核对：

- 在项目会话内显示入口，无全局项目选择器。
- 两个同项目会话共享数据，不同项目隔离。
- 新增、编辑、确认、重新讨论、重启后持久化正常。
- 从上一版升级能读取原有文档；有格式迁移时验证回退路径。
- 桌面客户端实际加载了新版本，而不是只在 HTTP 浏览器看到新版。

不要在真实用户项目中生成测试决议。打包工具不会修改本机 DSH profile。

## 提交版本并发布

```sh
git diff -- package.json package-lock.json CHANGELOG.md
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "Project decisions vX.Y.Z"

# 以下才会修改远程／触发公开发布，确认后执行：
git push origin main
git push origin vX.Y.Z
```

如果本地已准备好版本提交与标签，不要再运行一次 `release:prepare`；直接核对该标签、跑 `release:pack` 并决定是否推送。

标签触发 [.github/workflows/release.yml](<.github/workflows/release.yml>)：校验标签与版本 → 测试 → 打包验证 → 创建 GitHub Release 并上传包和校验值。发布说明只来自该版本更新日志。不要上传 GitHub 自动生成的 Source code zip 作为 DSH 安装包。

CI 的 Actions artifact 用于验证；公开分发以 **Release 附件及该附件的校验值** 为准。脚本检查包内容与可安装性，不承诺不同 npm 版本产物的压缩字节完全一致。

## 失败、重试与撤回

- 测试或打包失败：不发布，修复后重新准备正确版本。
- 标签已推送但 Release 创建前失败：检查错误，修复环境问题后重跑 workflow。不要静默移动标签到不同代码。
- Release 已存在时，工作流不会覆盖它；如附件上传中断，维护者核对同一标签后手工补全缺失附件。
- 已公开版本发现代码问题：保留历史，发布新的 patch；必要时在旧 Release 标明问题和建议回退版本。
- 回退插件：安装上一版 `.tgz` 并按 DSH 提示重启。恢复备份前先比较项目文档，不覆盖后来新增的真实决议。
