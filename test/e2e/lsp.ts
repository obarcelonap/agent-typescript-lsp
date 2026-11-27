import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(import.meta.dirname, "..", "..");
const launcher = join(repo, "dist", "agent-typescript-lsp.js");
const HEADER_END = "\r\n\r\n";
const CONTENT_LENGTH = /^Content-Length: (?<length>\d+)$/imu;

export const binPath = join(repo, "node_modules", ".bin");

export interface Message {
  error?: unknown;
  id?: number | string;
  jsonrpc: string;
  method?: string;
  params?: unknown;
  result?: unknown;
}

export const createProject = (typescriptPackage?: string): string => {
  const project = realpathSync(mkdtempSync(join(tmpdir(), "alsp-e2e-")));
  if (typescriptPackage) {
    mkdirSync(join(project, "node_modules"));
    symlinkSync(
      join(repo, "node_modules", typescriptPackage),
      join(project, "node_modules", "typescript"),
      "junction"
    );
  }
  return project;
};

// Fails on any stdout bytes that are not a well-formed LSP frame.
export const parseFrames = (stdout: Buffer): Message[] => {
  const messages: Message[] = [];
  let rest = stdout;
  while (rest.length > 0) {
    const headerEnd = rest.indexOf(HEADER_END);
    if (headerEnd === -1) {
      throw new Error(`incomplete LSP frame: ${rest.toString()}`);
    }
    const header = rest.subarray(0, headerEnd).toString("ascii");
    const length = CONTENT_LENGTH.exec(header)?.groups?.length;
    if (!length) {
      throw new Error(`invalid LSP header: ${header}`);
    }
    const start = headerEnd + HEADER_END.length;
    const end = start + Number(length);
    if (end > rest.length) {
      throw new Error(`truncated LSP body: ${rest.toString()}`);
    }
    messages.push(JSON.parse(rest.subarray(start, end).toString("utf8")));
    rest = rest.subarray(end);
  }
  return messages;
};

export class LspSession {
  readonly child: ChildProcess;
  readonly exited: Promise<number | null>;
  stderr = "";
  stdout = Buffer.alloc(0);
  private nextId = 1;
  private readonly answered = new Set<number | string>();
  private readonly pending = new Map<
    number | string,
    (message: Message) => void
  >();

  constructor(cwd: string, path = [binPath, process.env.PATH].join(delimiter)) {
    this.child = spawn(process.execPath, [launcher, "--stdio"], {
      cwd,
      env: { ...process.env, PATH: path },
    });
    this.child.stdout?.on("data", (chunk: Buffer) => {
      this.stdout = Buffer.concat([this.stdout, chunk]);
      this.resolvePending();
    });
    this.child.stderr?.on("data", (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });
    this.exited = new Promise((done) => this.child.on("close", done));
  }

  messages(): Message[] {
    return parseFrames(this.stdout);
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  request(method: string, params?: unknown): Promise<Message> {
    const id = this.nextId;
    this.nextId += 1;
    const response = new Promise<Message>((done) => this.pending.set(id, done));
    this.write({ jsonrpc: "2.0", id, method, params });
    return response;
  }

  initialize(rootDir: string): Promise<Message> {
    return this.request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(rootDir).href,
      capabilities: {},
    });
  }

  async shutdown(): Promise<number | null> {
    await this.request("shutdown");
    this.notify("exit");
    this.child.stdin?.end();
    return this.exited;
  }

  // Resolves our requests and answers the server's requests (e.g. client/registerCapability) with null.
  private resolvePending(): void {
    let messages: Message[];
    try {
      messages = this.messages();
    } catch {
      return; // a frame is still being written
    }
    for (const { id, method } of messages) {
      if (id === undefined) {
        continue;
      }
      if (method) {
        if (!this.answered.has(id)) {
          this.answered.add(id);
          this.write({ jsonrpc: "2.0", id, result: null });
        }
        continue;
      }
      const done = this.pending.get(id);
      if (done) {
        this.pending.delete(id);
        done(
          messages.find(
            (message) => message.id === id && !message.method
          ) as Message
        );
      }
    }
  }

  private write(message: Message): void {
    const body = JSON.stringify(message);
    this.child.stdin?.write(
      `Content-Length: ${Buffer.byteLength(body)}${HEADER_END}${body}`
    );
  }
}
