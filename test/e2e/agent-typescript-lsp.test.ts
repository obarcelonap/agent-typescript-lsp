import { rmSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { createProject, LspSession } from "./lsp.ts";

const TYPESCRIPT_5 = /^5\./u;

const projects: string[] = [];
const project = (typescriptPackage?: string) => {
  const dir = createProject(typescriptPackage);
  projects.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of projects.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("agent-typescript-lsp", () => {
  test("answers initialize with tsc --lsp in a TypeScript 7 project", async () => {
    const dir = project("typescript");
    const session = new LspSession(dir);

    const response = await session.initialize(dir);

    expect(response.result).toMatchObject({
      capabilities: expect.any(Object),
      serverInfo: { name: "typescript-go" },
    });
    await session.shutdown();
  });

  test("answers initialize with typescript-language-server in a TypeScript 5 project", async () => {
    const dir = project("typescript5");
    const session = new LspSession(dir);

    const response = await session.initialize(dir);

    expect(response.result).toMatchObject({ capabilities: expect.any(Object) });
    session.notify("initialized", {});
    await session.shutdown();
    expect(session.messages()).toContainEqual(
      expect.objectContaining({
        method: "$/typescriptVersion",
        params: expect.objectContaining({
          source: "workspace",
          version: expect.stringMatching(TYPESCRIPT_5),
        }),
      })
    );
  });

  test("exits 0 after LSP shutdown and exit", async () => {
    const dir = project("typescript");
    const session = new LspSession(dir);
    await session.initialize(dir);

    expect(await session.shutdown()).toBe(0);
  });

  test("writes only well-formed LSP frames to stdout", async () => {
    const dir = project("typescript");
    const session = new LspSession(dir);
    await session.initialize(dir);
    session.notify("initialized", {});
    await session.shutdown();

    const messages = session.messages();
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(message.jsonrpc).toBe("2.0");
    }
  });

  test("fails when the project has no typescript package", async () => {
    const session = new LspSession(project());

    expect(await session.exited).toBe(1);
    expect(session.stderr).toContain("no typescript package found");
    expect(session.stdout.length).toBe(0);
  });

  test("fails when typescript-language-server is not installed", async () => {
    const session = new LspSession(project("typescript5"), "");

    expect(await session.exited).toBe(1);
    // On Windows cmd.exe reports the missing command instead of a spawn error.
    if (process.platform !== "win32") {
      expect(session.stderr).toContain(
        "failed to run typescript-language-server"
      );
    }
    expect(session.stdout.length).toBe(0);
  });
});
