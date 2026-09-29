import { spawn } from "node:child_process";
import type { AgentProvider } from "./provider.js";
import type { AgentResult, AgentTurn } from "../core/types.js";

export interface ClaudeCodeRunOptions {
  command?: string;
  allowedTools?: string[];
  timeoutMs?: number;
  model?: string;
}

export function buildClaudeCodeArgs(prompt: string, options: ClaudeCodeRunOptions = {}): string[] {
  const allowedTools = options.allowedTools?.length
    ? options.allowedTools
    : (process.env.CLAUDE_CODE_ALLOWED_TOOLS || "Read,Edit,Glob,Grep")
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean);

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--permission-mode",
    "dontAsk",
    "--allowedTools",
    allowedTools.join(","),
    "--no-session-persistence",
  ];

  if (options.model || process.env.CLAUDE_CODE_MODEL) {
    args.push("--model", options.model || process.env.CLAUDE_CODE_MODEL!);
  }

  return args;
}

export class ClaudeCodeAgent implements AgentProvider {
  constructor(private options: ClaudeCodeRunOptions = {}) {}

  async run(turn: AgentTurn): Promise<AgentResult> {
    const command = this.options.command || process.env.CLAUDE_CODE_COMMAND || "claude";
    const timeoutMs = this.options.timeoutMs || Number(process.env.CLAUDE_CODE_TIMEOUT_MS || 1_800_000);
    const prompt = [
      "You are the Claude implementation peer in ORCHESTRATOR.",
      "Work directly in the supplied workspace.",
      "Read the repository before making changes.",
      "Implement only the requested objective and the provided plan.",
      "Run the requested tests/checks before reporting completion.",
      "Do not commit, push, merge, or modify files outside the workspace.",
      "",
      "OBJECTIVE:",
      turn.instruction,
      "",
      "ORCHESTRATOR CONTEXT:",
      turn.context,
    ].join("\n");

    const result = await runClaudeCode(command, buildClaudeCodeArgs(prompt, this.options), turn.workspacePath, timeoutMs);

    let payload: unknown;
    try {
      payload = JSON.parse(result.stdout.trim());
    } catch {
      const lastLine = result.stdout.trim().split("\n").filter(Boolean).at(-1) || "";
      try {
        payload = JSON.parse(lastLine);
      } catch {
        throw new Error(
          `Claude Code returned non-JSON output (exit code ${result.exitCode}). stderr: ${result.stderr.slice(-4000)} stdout: ${result.stdout.slice(-4000)}`,
        );
      }
    }

    const text = typeof payload === "object" && payload !== null && "result" in payload && typeof payload.result === "string"
      ? payload.result
      : result.stdout.trim();

    if (result.exitCode !== 0) {
      throw new Error(`Claude Code failed with exit code ${result.exitCode}: ${result.stderr.slice(-4000)}`);
    }

    return { text, toolCalls: [] };
  }
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function runClaudeCode(command: string, args: string[], cwd: string, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new Error(`Claude Code timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(() => reject(new Error(`Unable to start Claude Code: ${error.message}`)));
    });

    child.on("close", (exitCode) => {
      finish(() => resolve({ stdout, stderr, exitCode }));
    });
  });
}
