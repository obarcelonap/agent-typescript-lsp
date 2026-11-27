# AGENTS.md

Language server launcher for coding agents, published to npm and installable through APM.

## Requirements

- The launcher must never write to stdout: stdout is the LSP channel. Log to stderr with the `agent-typescript-lsp:` prefix.
- No runtime dependencies. Only Node built-ins; dev dependencies only for build, lint and test.
- Must work on Linux, macOS and Windows, and on the Node versions in `engines`.
- Server choice logic stays in pure, unit-tested helpers separate from the entry point.
- The published package contains only the built output; source is TypeScript compiled with `tsc`.
- `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` must pass. Format with `npm run format`.
  The pre-commit hook formats staged files and runs unit tests; don't bypass it.
- Keep comments minimal.
- PR titles must follow Conventional Commits; they become the squash commit message.
- Releases are automated by semantic-release on merge to `main` (only `feat`, `fix` and breaking changes release).
  Never bump the version in `package.json` or tag by hand.
- `apm.yml` must keep pointing at `agent-typescript-lsp@latest`.
- Changes to behavior or install steps update `README.md`.
