# agent-typescript-lsp

[![npm](https://img.shields.io/npm/v/agent-typescript-lsp)](https://www.npmjs.com/package/agent-typescript-lsp)
[![CI](https://github.com/obarcelonap/agent-typescript-lsp/actions/workflows/ci.yml/badge.svg)](https://github.com/obarcelonap/agent-typescript-lsp/actions/workflows/ci.yml)

TypeScript/JavaScript language server launcher for coding agents. Works with any TypeScript version, including
TypeScript 7:

- TypeScript 7 or newer in the project: runs the compiler's built-in server (`tsc --lsp --stdio`).
- TypeScript 6 or older: runs `typescript-language-server --stdio`, which you must install yourself
  (`npm install -g typescript-language-server`).
- No `typescript` package in the project: exits with an error.

The project's `typescript` package is resolved from the current directory with Node's module resolution, so hoisted
`node_modules` in monorepos work.

## Install

Requires Node.js 22 or newer.

### With [APM](https://github.com/microsoft/apm)

```sh
apm install obarcelonap/agent-typescript-lsp
```

This writes the LSP configuration for Claude Code (`.claude/skills/apm-lsp/`) and Copilot CLI (`.github/lsp.json`).
Run `/reload-plugins` in Claude Code to activate it.

### With npm

```sh
npm install -g agent-typescript-lsp
```

Then point your agent's LSP configuration at the `agent-typescript-lsp --stdio` command, or without installing:
`npx -y agent-typescript-lsp@latest --stdio`.

To lock the version per project and avoid a registry check on every start, add it as a dev dependency and use
`npx --no agent-typescript-lsp --stdio` as the command:

```sh
npm install -D agent-typescript-lsp
```

## License

Apache-2.0. See [LICENSE](LICENSE).
