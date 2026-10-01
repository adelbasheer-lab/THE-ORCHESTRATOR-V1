import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const controller = path.resolve(new URL("./experiment-controller.mjs", import.meta.url).pathname);

test("controller plans the complete 10-task x 2-condition matrix", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orchestrator-v12-plan-"));
  const result = await runController({ ORCHESTRATOR_RESEARCH_ROOT: root, EXPERIMENT_ID: "plan-test", PILOT_REPETITIONS: "1", PLAN_ONLY: "true" });
  assert.equal(result.code, 0);
  const manifest = JSON.parse(await fs.readFile(path.join(root, "plan-test", "EXPERIMENT_MANIFEST.json"), "utf8"));
  const state = JSON.parse(await fs.readFile(path.join(root, "plan-test", "EXPERIMENT_STATE.json"), "utf8"));
  assert.equal(manifest.plannedRunCount, 20);
  assert.deepEqual(manifest.conditions, ["IMPLEMENTATION_ONLY", "STRUCTURED_OVERSIGHT"]);
  assert.equal(Object.keys(state.runs).length, 20);
  assert.ok(Object.values(state.runs).every((run) => run.status === "PLANNED"));
});

test("controller rejects an incomplete matrix limit before execution", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orchestrator-v12-limit-"));
  const result = await runController({ ORCHESTRATOR_RESEARCH_ROOT: root, MAX_RUNS: "3", PLAN_ONLY: "true" });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /exceeds MAX_RUNS/);
});

async function runController(extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [controller], { env: { ...process.env, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", x => stdout += x);
    child.stderr.on("data", x => stderr += x);
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr }));
  });
}
