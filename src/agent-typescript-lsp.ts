#!/usr/bin/env node
/**
 * TypeScript/JavaScript language server for coding agents, for any TypeScript version.
 *
 * Usage: `agent-typescript-lsp [--stdio]`, started from the project directory. Speaks LSP over stdio.
 * Finds the project's `typescript` package, then runs the matching server in its place: stdio is
 * inherited, SIGINT/SIGTERM are forwarded, and the server's exit code or signal is passed on.
 * Exits 1 if no `typescript` package is found or the server can't be started.
 */
import { spawn } from "node:child_process";
import { findTypeScript, log, resolveLanguageServer } from "./lib.ts";

const typescript = findTypeScript(process.cwd());
if (!typescript) {
  log(
    `no typescript package found from ${process.cwd()}. Install it in the project: npm install -D typescript`
  );
  process.exit(1);
}

const { command, args, shell } = resolveLanguageServer(typescript);

const child = spawn(command, args, { stdio: "inherit", shell });

child.on("error", (error) => {
  log(`failed to run ${[command, ...args].join(" ")}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}
