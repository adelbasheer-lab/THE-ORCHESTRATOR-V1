import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import type { AgentTools, ToolDefinition } from "./toolset.js";
import { gitDiff, gitStatus } from "./git.js";

export class WorkspaceToolset implements AgentTools {
  readonly definitions: ToolDefinition[];

  constructor(
    private workspacePath: string,
    private testCommand: string,
    private allowWrites = true,
  ) {
    this.definitions = [
      { name: "list_files", description: "List repository files.", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: [] } },
      { name: "read_file", description: "Read a text file.", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
      ...(allowWrites
        ? [{ name: "write_file", description: "Create or replace a text file.", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } }]
        : []),
      { name: "git_status", description: "Show git status.", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "git_diff", description: "Show git diff.", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "run_tests", description: "Run the fixed test command.", inputSchema: { type: "object", properties: {}, required: [] } },
    ];
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "list_files": return this.listFiles(String(input.path || ""));
      case "read_file": return this.readSafe(String(input.path));
      case "write_file":
        if (!this.allowWrites) throw new Error("Read-only workspace");
        return this.writeSafe(String(input.path), String(input.content));
      case "git_status": return gitStatus(this.workspacePath);
      case "git_diff": return (await gitDiff(this.workspacePath)).slice(0, 40000);
      case "run_tests": return this.runTests();
      default: throw new Error("Unknown tool: " + name);
    }
  }

  private safePath(p: string) {
    const root = resolve(this.workspacePath);
    const target = resolve(root, p || ".");
    if (target !== root && !target.startsWith(root + sep)) throw new Error("Path escapes workspace");
    return target;
  }

  private async readSafe(p: string) {
    const v = await readFile(this.safePath(p), "utf8");
    return v.length > 150000 ? v.slice(0, 150000) + "\n[truncated]" : v;
  }

  private async writeSafe(p: string, c: string) {
    if (!p || p.startsWith(".git/")) throw new Error("Protected path");
    if (c.length > 500000) throw new Error("File too large");
    const t = this.safePath(p);
    await mkdir(dirname(t), { recursive: true });
    await writeFile(t, c, "utf8");
    return "wrote " + p + " (" + c.length + " bytes)";
  }

  private async listFiles(p: string) {
    const root = this.safePath(p);
    const files: string[] = [];
    const walk = async (d: string): Promise<void> => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        if (e.name === ".git" || e.name === "node_modules") continue;
        const a = resolve(d, e.name);
        if (e.isDirectory()) await walk(a);
        else files.push(relative(this.workspacePath, a));
        if (files.length >= 500) return;
      }
    };
    await walk(root);
    return files.join("\n");
  }

  private async runTests() {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const parts = this.testCommand.split(/\s+/).filter(Boolean);
    if (!parts[0] || /[;&|$<>]/.test(this.testCommand)) throw new Error("Unsafe test command");
    try {
      const r = await promisify(execFile)(parts[0], parts.slice(1), {
        cwd: this.workspacePath,
        timeout: 1800000,
        maxBuffer: 20000000,
      });
      return ("EXIT_CODE:0\n" + r.stdout + "\n" + r.stderr).trim();
    } catch (e: any) {
      return ("EXIT_CODE:1\n" + (e.stdout || "") + "\n" + (e.stderr || e.message || e)).trim();
    }
  }
}
