import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Writes a prefixed message to stderr. stdout is the LSP channel, so never log there. */
export const log = (message: string) =>
  process.stderr.write(`agent-typescript-lsp: ${message}\n`);

/** The project's TypeScript installation. */
export interface TypeScript {
  /** Major version, e.g. `7` for 7.0.2. */
  major: number;
  /** Absolute path to the package's `tsc` bin script. */
  tsc: string;
}

/** How to spawn a language server over stdio. */
export interface Server {
  args: string[];
  command: string;
  /** Run through a shell; needed on Windows to start `.cmd` shims. */
  shell: boolean;
}

/**
 * Resolves the `typescript` package the way Node would from `dir`, walking up through `node_modules`
 * (so hoisted monorepo installs are found).
 * @returns the installation, or `null` if no `typescript` package can be resolved.
 */
export const findTypeScript = (dir: string): TypeScript | null => {
  try {
    const packageJson = createRequire(join(dir, "package.json")).resolve(
      "typescript/package.json"
    );
    const { version, bin } = JSON.parse(readFileSync(packageJson, "utf8"));
    return {
      major: Number.parseInt(version, 10),
      tsc: join(dirname(packageJson), bin.tsc),
    };
  } catch {
    return null;
  }
};

/**
 * Picks the language server for a TypeScript installation: TypeScript 7+ ships its own (`tsc --lsp`),
 * which is run with the current Node; older versions use `typescript-language-server` from `PATH`.
 */
export const resolveLanguageServer = (
  typescript: TypeScript,
  platform: string = process.platform
): Server =>
  typescript.major >= 7
    ? {
        command: process.execPath,
        args: [typescript.tsc, "--lsp", "--stdio"],
        shell: false,
      }
    : {
        command: "typescript-language-server",
        args: ["--stdio"],
        shell: platform === "win32",
      };
