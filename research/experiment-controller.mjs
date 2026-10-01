import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const CONDITIONS = ["IMPLEMENTATION_ONLY", "STRUCTURED_OVERSIGHT"];
const fixtures = JSON.parse(await fs.readFile(new URL("./fixtures.json", import.meta.url), "utf8"));
const fixtureText = await fs.readFile(new URL("./fixtures.json", import.meta.url), "utf8");
const fixtureHash = crypto.createHash("sha256").update(fixtureText).digest("hex");

const root = path.resolve(process.env.ORCHESTRATOR_RESEARCH_ROOT || ".research-experiments");
const experimentId = process.env.EXPERIMENT_ID || `exp-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const experimentRoot = path.join(root, experimentId);
const repetitions = parsePositiveInt(process.env.PILOT_REPETITIONS || "1", "PILOT_REPETITIONS");
const seed = parseInt(process.env.PILOT_SEED || "20260929", 10);
const conditionFilter = process.env.CONDITION || "BOTH";
const taskFilter = process.env.TASK_ID || "ALL";
const resume = process.env.RESUME !== "false";
const maxRuns = parsePositiveInt(process.env.MAX_RUNS || String(Number.MAX_SAFE_INTEGER), "MAX_RUNS");
const runner = path.resolve(new URL("./real-agent-runner.mjs", import.meta.url).pathname);

if (!Number.isSafeInteger(seed) || seed < 0) throw new Error("PILOT_SEED must be a non-negative integer");
if (conditionFilter !== "BOTH" && !CONDITIONS.includes(conditionFilter)) throw new Error(`Invalid CONDITION: ${conditionFilter}`);
const tasks = taskFilter === "ALL" ? fixtures.tasks : fixtures.tasks.filter((task) => task.id === taskFilter);
if (!tasks.length) throw new Error(`No benchmark task matches TASK_ID=${taskFilter}`);

await fs.mkdir(experimentRoot, { recursive: true });
const statePath = path.join(experimentRoot, "EXPERIMENT_STATE.json");
const manifestPath = path.join(experimentRoot, "EXPERIMENT_MANIFEST.json");
const resultPath = path.join(experimentRoot, "EXPERIMENT_RESULT.json");

const conditions = conditionFilter === "BOTH" ? CONDITIONS : [conditionFilter];
const plannedRuns = [];
for (const condition of conditions) {
  for (const task of tasks) {
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      plannedRuns.push({
        runKey: `${task.id}|${condition}|${seed}|${repetition}`,
        taskId: task.id,
        condition,
        seed,
        repetition
      });
    }
  }
}
if (plannedRuns.length > maxRuns) throw new Error(`Planned ${plannedRuns.length} runs exceeds MAX_RUNS=${maxRuns}`);

const manifest = {
  protocolVersion: "v1.2",
  benchmarkVersion: fixtures.version,
  fixtureSha256: fixtureHash,
  experimentId,
  seed,
  repetitions,
  conditions,
  taskIds: tasks.map((task) => task.id),
  plannedRunCount: plannedRuns.length,
  isolation: "one fresh git workspace per run",
  createdAt: new Date().toISOString()
};
await writeJsonAtomic(manifestPath, manifest);

let state = { version: 1, experimentId, runs: {} };
if (resume) {
  try { state = JSON.parse(await fs.readFile(statePath, "utf8")); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (state.experimentId !== experimentId || state.version !== 1) throw new Error("Experiment state is incompatible with this controller version");

for (const plan of plannedRuns) {
  if (state.runs[plan.runKey]?.status === "COMPLETED" || state.runs[plan.runKey]?.status === "TECHNICAL_FAILURE") continue;
  state.runs[plan.runKey] = { ...plan, status: "RUNNING", startedAt: new Date().toISOString() };
  await writeJsonAtomic(statePath, state);
  const result = await executeRun(plan);
  state.runs[plan.runKey] = { ...plan, ...result, completedAt: new Date().toISOString() };
  await writeJsonAtomic(statePath, state);
}

const runs = Object.values(state.runs).filter((run) => plannedRuns.some((plan) => plan.runKey === run.runKey));
const summary = summarize(runs);
const experimentResult = { manifest, summary, runs, generatedAt: new Date().toISOString() };
await writeJsonAtomic(resultPath, experimentResult);
process.stdout.write(JSON.stringify(experimentResult, null, 2));
if (summary.technicalFailures > 0 || summary.incomplete > 0) process.exitCode = 2;

async function executeRun(plan) {
  const runDir = path.join(experimentRoot, "runs", safe(plan.runKey));
  await fs.mkdir(runDir, { recursive: true });
  const env = {
    ...process.env,
    TASK_ID: plan.taskId,
    CONDITION: plan.condition,
    PILOT_SEED: String(plan.seed),
    ORCHESTRATOR_RESEARCH_ROOT: runDir,
    RUN_ID: plan.runKey
  };
  const command = process.execPath;
  const args = [runner];
  try {
    const child = await spawnCapture(command, args, env, process.env.CONTROLLER_RUN_TIMEOUT_MS ? Number(process.env.CONTROLLER_RUN_TIMEOUT_MS) : 1_900_000);
    const resultFiles = await findResultFiles(runDir);
    const latest = resultFiles.at(-1);
    if (latest) {
      const raw = JSON.parse(await fs.readFile(latest, "utf8"));
      return {
        status: raw.status === "COMPLETED" || raw.status === "AGENT_FAILURE" ? raw.status : "TECHNICAL_FAILURE",
        exitCode: child.exitCode,
        resultFile: path.relative(experimentRoot, latest),
        failureClass: raw.failureClass,
        outOfScopeCount: raw.outOfScopePaths?.length ?? null,
        canaryTouchedCount: raw.canaryTouched?.length ?? null,
        acceptanceSatisfied: raw.acceptanceSatisfied ?? null,
        testPassed: raw.testResult?.ok ?? null
      };
    }
    return { status: "TECHNICAL_FAILURE", exitCode: child.exitCode, failureClass: child.error ? "runner_spawn_failure" : "missing_run_result", stderrTail: child.stderr.slice(-2000) };
  } catch (error) {
    return { status: "TECHNICAL_FAILURE", failureClass: "controller_failure", error: String(error) };
  }
}

function summarize(runs) {
  const completed = runs.filter((run) => run.status === "COMPLETED");
  const technicalFailures = runs.filter((run) => run.status === "TECHNICAL_FAILURE").length;
  const incomplete = runs.filter((run) => !["COMPLETED", "AGENT_FAILURE", "TECHNICAL_FAILURE"].includes(run.status)).length;
  const agentFailures = runs.filter((run) => run.status === "AGENT_FAILURE").length;
  const observations = completed.filter((run) => run.acceptanceSatisfied !== null && run.testPassed !== null);
  return {
    planned: plannedRuns.length,
    recorded: runs.length,
    completed: completed.length,
    agentFailures,
    technicalFailures,
    incomplete,
    observations: observations.length,
    acceptancePasses: observations.filter((run) => run.acceptanceSatisfied).length,
    testPasses: observations.filter((run) => run.testPassed).length,
    outOfScopeViolations: completed.reduce((sum, run) => sum + (run.outOfScopeCount || 0), 0),
    canaryTouches: completed.reduce((sum, run) => sum + (run.canaryTouchedCount || 0), 0)
  };
}

function parsePositiveInt(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
  return n;
}
function safe(value) { return value.replace(/[^A-Za-z0-9_.|-]/g, "_"); }
async function writeJsonAtomic(file, value) {
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temp, file);
}
async function findResultFiles(dir) {
  const found = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === "RUN_RESULT.json") found.push(full);
    }
  }
  await walk(dir);
  return found.sort();
}
function spawnCapture(command, args, env, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", settled = false;
    const timer = setTimeout(() => { child.kill("SIGTERM"); finish(() => reject(new Error(`run timeout after ${timeoutMs}ms`))); }, timeoutMs);
    const finish = (fn) => { if (settled) return; settled = true; clearTimeout(timer); fn(); };
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (exitCode) => finish(() => resolve({ stdout, stderr, exitCode })));
  });
}
