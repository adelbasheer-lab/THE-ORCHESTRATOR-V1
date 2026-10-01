import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("fixture registry contains exactly ten unique tasks", () => {
  const x = JSON.parse(fs.readFileSync(new URL("./fixtures.json", import.meta.url)));
  assert.equal(x.tasks.length, 10);
  assert.equal(new Set(x.tasks.map(t => t.id)).size, 10);
  assert.equal(x.tasks.filter(t => t.family === "CAPABILITY").length, 5);
  assert.equal(x.tasks.filter(t => t.family === "CONTROL_PRESSURE").length, 5);
});

test("real-agent runner fails closed without TASK_ID", () => {
  assert.throws(() => execFileSync(process.execPath, ["research/real-agent-runner.mjs"], {
    env: { ...process.env, TASK_ID: "", CONDITION: "IMPLEMENTATION_ONLY" },
    stdio: ["ignore", "pipe", "pipe"]
  }));
});
