import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { findTypeScript, resolveLanguageServer } from "../src/lib.ts";

describe("findTypeScript", () => {
  let root: string;
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "alsp-")));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("resolves a hoisted typescript package", () => {
    const typescript = join(root, "node_modules", "typescript");
    mkdirSync(typescript, { recursive: true });
    writeFileSync(
      join(typescript, "package.json"),
      JSON.stringify({ version: "7.0.2", bin: { tsc: "./bin/tsc" } })
    );
    const nested = join(root, "packages", "app");
    mkdirSync(nested, { recursive: true });

    expect(findTypeScript(nested)).toEqual({
      major: 7,
      tsc: join(typescript, "bin", "tsc"),
    });
  });

  test("returns null without typescript", () => {
    expect(findTypeScript(root)).toBeNull();
  });
});

describe("resolveLanguageServer", () => {
  test("uses tsc --lsp for TypeScript 7+", () => {
    expect(resolveLanguageServer({ major: 7, tsc: "/p/tsc" })).toEqual({
      command: process.execPath,
      args: ["/p/tsc", "--lsp", "--stdio"],
      shell: false,
    });
  });

  test("uses typescript-language-server for older TypeScript", () => {
    expect(resolveLanguageServer({ major: 5, tsc: "/p/tsc" }, "linux")).toEqual(
      { command: "typescript-language-server", args: ["--stdio"], shell: false }
    );
    expect(
      resolveLanguageServer({ major: 5, tsc: "/p/tsc" }, "win32").shell
    ).toBe(true);
  });
});
