# flowai-cli

Standalone CLI for distributing the [flowai](https://github.com/korchasa/flowai)
framework into AI-IDE config directories (Cursor, Claude Code, OpenCode,
OpenAI Codex).

Published to JSR as **`@korchasa/flowai`**.

## Install

```sh
deno install --global -A -n flowai jsr:@korchasa/flowai
flowai --help
```

## Commands

```text
flowai                       # Default: sync (with IDE-context guard)
flowai sync                  # Explicit sync (no IDE guard)
flowai loop <prompt>         # Run Claude Code non-interactively
flowai migrate <from> <to>   # One-way primitive migration between IDEs
flowai update                # Self-update from JSR
flowai --version             # Print version, then check JSR for updates
flowai --help                # Top-level help; pass --help to any subcommand
```

### `flowai` (default) and `flowai sync`

Sync framework skills and agents into IDE config directories. The default
`flowai` command is `sync` with an extra **IDE-context guard**: when launched
from inside an IDE shell (`CLAUDECODE`, `CURSOR_AGENT`, `OPENCODE`,
`CODEX_THREAD_ID`, `CODEX_SANDBOX`) and the resolved scope is project, it
prints a hint and exits instead of writing — prevents background slash-command
runs from clobbering `<cwd>/.{ide}/`. `flowai sync` skips this guard.

**Scope selection** (mutually exclusive):

- `-g, --global` — force user-level install (`~/.claude/`, `~/.cursor/`,
  `~/.config/opencode/`, `~/.codex/`, `~/.agents/skills/`). Config at
  `~/.flowai.yaml`.
- `-l, --local` — force project-local install into `<cwd>/.{ide}/`. Config
  at `<cwd>/.flowai.yaml`.
- default (no flag) — auto-resolves: `<cwd>/.flowai.yaml` exists → project;
  else `~/.flowai.yaml` exists → global (`Using global config at ~/.flowai.yaml`
  printed); else prompt (or default to global in `-y`).

**Other options:**

- `-y, --yes` — non-interactive: overwrite all conflicts without asking.
- `-n, --dry-run` — preview the sync plan without writing any file. Exits 0
  regardless of plan size. Useful before `-g` to verify resolved target dirs.
- `--skip-update-check` — skip the pre-flight JSR version check.

**Examples:**

```sh
flowai                                 # auto-resolve scope, interactive
flowai -y                              # auto-resolve scope, non-interactive
flowai sync -g                         # explicit global sync
flowai sync -l -n                      # dry-run project sync
flowai sync -g -y --skip-update-check  # CI-friendly install
```

### `flowai loop <prompt>`

Run Claude Code non-interactively against a prompt. Useful for "babysit"
style automation — iterate on the same prompt with intervals, capture
output, optionally with a custom agent and model.

**Arguments:**

- `<prompt>` — the user prompt passed to `claude --print`.

**Options:**

- `--agent <name>` — agent name forwarded as `--agent <name>`.
- `--model <model>` — model override forwarded as `--model <model>`.
- `--cwd <path>` — working directory for the spawned `claude` process
  (default: `.`).
- `--yolo` — pass `--dangerously-skip-permissions` to `claude` (no per-tool
  prompts; use with care).
- `--timeout <seconds>` — per-iteration timeout in seconds (default: no limit).
- `--interval <duration>` — pause between iterations, e.g. `30s`, `5m`, `1h`
  (default: `0`, i.e. run once).
- `--max-iterations <n>` — cap the number of iterations (default: infinite).

**Examples:**

```sh
flowai loop "Review uncommitted changes and report issues"
flowai loop --interval 5m --max-iterations 10 "/babysit-pr 42"
flowai loop --agent flowai-deep-research-worker --model max "Research X"
```

### `flowai migrate <from> <to>`

One-way migration of all primitives (skills, agents, commands) from one IDE
to another in a single pass. Includes framework primitives (`flowai-*`) and
user-created resources. Agent frontmatter transformed per target IDE.
Rules and hooks are excluded (format incompatible).

Requires an explicit scope flag — never auto-resolves, because cross-IDE
migrations have different semantics in each scope.

**Arguments:**

- `<from>` — source IDE name: `cursor` | `claude` | `opencode` | `codex`.
- `<to>` — target IDE name (same set).

**Options:**

- `-g, --global` — migrate between IDE user-level dirs (e.g.
  `~/.claude/ → ~/.cursor/`). Mutually exclusive with `--local`.
- `-l, --local` — migrate between project-local IDE dirs
  (`<cwd>/.{ide}/`). Mutually exclusive with `--global`.
- `-y, --yes` — overwrite all conflicts without prompting.
- `--dry-run` — print what would be migrated without writing files.

**Examples:**

```sh
flowai migrate cursor claude -l            # project-local
flowai migrate claude opencode -g --dry-run
flowai migrate codex claude -g -y          # global, non-interactive
```

### `flowai update`

Self-update the installed `flowai` binary. Checks JSR for a newer version
and runs `deno install -g -A -f jsr:@korchasa/flowai@<version>`. Fail-open
on network errors (prints a warning, exits 0).

This is the **only** install entry point. `flowai` and `flowai sync` only
notify when a newer version is available (`Update available: X → Y. Run
\`flowai update\` to install.`) — they never install themselves.

### `flowai --version`

Print the installed version. Then queries JSR for the latest published
version (fail-open) and, if newer, prints an `Update available: …` hint
with the install command.

## Relationship to upstream flowai

- **Framework** (skills, commands, agents, packs) lives in
  <https://github.com/korchasa/flowai>.
- **This repo** is the CLI implementation. It bundles a pinned framework
  release tarball at publish time and ships it as part of the JSR package —
  the installed CLI has zero network dependency at runtime.

For the full skill catalog, design rationale, and contributor docs see the
upstream repo.

## Development

```sh
deno task check                  # fmt + lint + type-check + tests
deno task bundle                 # download pinned framework tarball, verify
                                 # SHA-256, untar, write src/bundled.json
deno task bump-framework 0.13.0  # bump framework.lock to a newer release
```

`framework.lock` (committed) pins the framework revision by version, commit
SHA, and SHA-256 of the tarball asset. See `AGENTS.md` for the full pinning
contract.

## License

MIT — see [LICENSE](./LICENSE).
