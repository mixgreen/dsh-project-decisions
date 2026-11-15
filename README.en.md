# Project decisions for DSH

[中文](<README.md>) · [Changelog](<CHANGELOG.md>) · [Contributing](<CONTRIBUTING.md>) · [Releasing](<RELEASING.md>)

A native DeepSeek Harness plugin for turning **open questions** into **confirmed project agreements**, backed by one local Markdown file.

Decisions belong to the **project**, not to a chat or a global board. Sessions in the same workspace share the same file. Confirmed means agreed, not implemented.

## Features

- You create entries; you and the agent can edit existing entries and move them between columns.
- A Project decisions view sits beside Conversation and Trajectory inside project sessions.
- The page follows the session's project automatically, without a cross-project selector.
- One `PROJECT_DECISIONS.md` at the workspace root; no extra database.
- Both columns are supplied to agents as clearly labeled context. Injection does not start work.
- Version checks prevent silent overwrites between plugin operations.

## Requirements

Targets DSH **0.2.2-rc.2**. The declared range is `>=0.2.2-rc.2 <0.3.0`; not every version in that range has been tested. Local workspaces only. Developing and packaging require Node.js 22+, npm, Git and tar. CI runs on Linux with Node.js 22 and 24. There are no third-party runtime dependencies or build steps.

## Install

Download the `.tgz` package and `SHA256SUMS` from this repository's GitHub Releases page. If no release is available yet, install from source below. Verify the checksum with `shasum -a 256 -c SHA256SUMS` on macOS or `sha256sum -c SHA256SUMS` on Linux.

Use **Plugins → Add plugin** in DSH to install the absolute path to the tarball. If your DSH UI accepts only directories, extract it and install the resulting `package` directory. Enable Project decisions and reload the UI. Fully restart Desktop if it still uses the previous frontend boot information, after saving input and waiting for running tasks.

The package retains `@local/dsh-project-decisions` for existing installations. Distribution is through GitHub Release archives, not npm. `private: true` prevents accidental `npm publish` but does not prevent tarball installation.

From source:

```sh
npm ci --ignore-scripts
npm run verify
```

Install the checkout directory through DSH's plugin manager. Directory installations are linked: keep the checkout in place. Release packages are preferable for end users.

## Use

Open a session in your project, then select **Project decisions** beside Conversation/Trajectory, or inside the More views menu. Check the project name and document path. Add a question, refine its Markdown body, and confirm the agreement or reopen it for discussion.

The file is created only after your first entry. Reopen the view, refocus the window or click Refresh to see agent changes. Switching views retains in-memory drafts; a full page reload or restart does not.

## Storage and privacy

Each workspace owns a `PROJECT_DECISIONS.md` with Chinese section headings `待定事项` and `已确认共识`. Stable entry headings use `### [d-ID] Title`. Reserved headings inside the body must be fenced. External edits are supported when this format is preserved. Invalid documents and symlinks are not overwritten. Independent worktree workspaces do not synchronize automatically.

The plugin itself makes no external network calls. **Injected decisions are sent to your chosen model provider as session context and retained in DSH session logs.** Do not store credentials or material you cannot share with that provider.

Agent tools: `prd_read()` returns `{ path, version, exists, rows }`; rows are `[id, title, body, status]`. `prd_update()` edits an existing ID with an expected document version. No agent create/delete/upsert tool is provided. Agent writes respect plan mode and file permissions. An agent with unrestricted shell access could still edit the file directly: this is not OS-level author isolation.

## Upgrade and rollback

Read the [changelog](<CHANGELOG.md>), back up project documents, then install the newer package through DSH's plugin manager using the same package name. Restart when requested and verify existing entries. To roll back, install the previous release archive and restart. There is no data migration in the current release. Disabling or uninstalling the plugin does not delete project documents.

## Limits

Markdown source editing, not rich text. No deletion, archiving, drag-and-drop sorting or execution tracking. No live polling. Some third-party UI plugins may hide session navigation. Some error details remain in Chinese. Atomic file replacement does not provide cross-process transactions with external editors.

## Development and releases

```sh
npm run verify
npm run release:pack
npm run release:prepare -- patch
```

See [RELEASING.md](<RELEASING.md>) for the full process. Version preparation updates the manifest, lockfile and changelog but never commits, tags or pushes. A pushed `vX.Y.Z` tag triggers the GitHub Release workflow and uses that version's changelog as release notes.

[MIT license](<LICENSE>). Community-maintained; not an official DeepSeek product.
