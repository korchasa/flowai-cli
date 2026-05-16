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

## Usage

Run inside a project directory:

```sh
flowai              # interactive setup on first run; subsequent runs sync
flowai --dry-run    # show plan, no writes
flowai --global     # install into user-level IDE config dirs
flowai migrate <from> <to>   # one-way IDE-to-IDE migration
```

See [upstream docs](https://github.com/korchasa/flowai) for the full skill
catalog, command reference, and design rationale.

## Relationship to upstream flowai

- **Framework** (skills, commands, agents, packs) lives in
  <https://github.com/korchasa/flowai>.
- **This repo** is the CLI implementation. It bundles a pinned framework
  release tarball at publish time and ships it as part of the JSR package —
  the installed CLI has zero network dependency at runtime.

## Development

```sh
deno task check            # fmt + lint + type-check + tests
deno task bundle           # pin framework release into src/bundled.json
deno task bump-framework 0.13.0   # bump framework.lock to a newer release
```

`framework.lock` (committed) pins the framework revision by version, commit
SHA, and SHA-256 of the tarball asset. See `AGENTS.md` for the full pinning
contract.

## License

MIT — see [LICENSE](./LICENSE).
