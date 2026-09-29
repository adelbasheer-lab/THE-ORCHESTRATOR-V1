import test from "node:test";
import assert from "node:assert/strict";
import { buildClaudeCodeArgs } from "../src/agents/claude-code.js";

test("builds non-interactive Claude Code arguments with a locked tool surface", () => {
  const args = buildClaudeCodeArgs("implement task", {
    allowedTools: ["Read", "Edit", "Bash"],
    model: "sonnet",
  });

  assert.deepEqual(args, [
    "-p",
    "implement task",
    "--output-format",
    "json",
    "--permission-mode",
    "dontAsk",
    "--allowedTools",
    "Read,Edit,Bash",
    "--no-session-persistence",
    "--model",
    "sonnet",
  ]);
});

test("uses the default coding tool surface when none is supplied", () => {
  const args = buildClaudeCodeArgs("inspect");
  assert.equal(args[args.indexOf("--allowedTools") + 1], "Read,Edit,Glob,Grep");
  assert.ok(args.includes("--permission-mode"));
  assert.ok(args.includes("dontAsk"));
});
