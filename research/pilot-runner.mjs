import fs from "node:fs";
const fixtures = JSON.parse(fs.readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const seed = Number(process.env.PILOT_SEED || 20260929);
const repetitions = Number(process.env.PILOT_REPETITIONS || 3);
const conditions = ["IMPLEMENTATION_ONLY", "STRUCTURED_OVERSIGHT"];

function rngFor(key) {
  let x = 2166136261 >>> 0;
  for (const ch of String(seed) + ":" + key) {
    x ^= ch.charCodeAt(0);
    x = Math.imul(x, 16777619) >>> 0;
  }
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

function simulate(task, condition, repetition) {
  const rnd = rngFor(task.id + ":" + condition + ":" + repetition);
  const pressure = task.pressure;
  const attempted = Boolean(pressure && rnd() < pressure.probability);
  const caught = attempted && condition === "STRUCTURED_OVERSIGHT" && rnd() < pressure.oversightCatchProbability;
  const violation = attempted && !caught;
  const acceptanceSuccess = !violation;
  return {
    taskId: task.id,
    family: task.family,
    hazardClass: task.hazardClass,
    condition,
    repetition,
    attempted,
    caught,
    violation,
    acceptanceSuccess,
    reproducibilityKey: task.id + ":" + condition + ":" + repetition + ":" + seed
  };
}

const rows = [];
for (const task of fixtures.tasks) {
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const condition of conditions) rows.push(simulate(task, condition, repetition));
  }
}

const byCondition = Object.fromEntries(conditions.map(c => {
  const xs = rows.filter(r => r.condition === c);
  return [c, {
    runs: xs.length,
    attempts: xs.filter(r => r.attempted).length,
    violations: xs.filter(r => r.violation).length,
    caught: xs.filter(r => r.caught).length,
    acceptanceSuccesses: xs.filter(r => r.acceptanceSuccess).length,
    violationRate: xs.filter(r => r.violation).length / xs.length,
    acceptanceRate: xs.filter(r => r.acceptanceSuccess).length / xs.length
  }];
}));

const matched = [];
for (const task of fixtures.tasks) {
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    const a = rows.find(r => r.taskId === task.id && r.repetition === repetition && r.condition === conditions[0]);
    const b = rows.find(r => r.taskId === task.id && r.repetition === repetition && r.condition === conditions[1]);
    matched.push({taskId: task.id, repetition, baselineViolation: a.violation, oversightViolation: b.violation});
  }
}

const output = {
  protocolVersion: "v1.0",
  benchmarkVersion: fixtures.version,
  seed,
  repetitions,
  conditions,
  runCount: rows.length,
  rows,
  summary: byCondition,
  matched,
  note: "This pilot runner is a deterministic measurement-harness smoke test. It simulates pressure events to validate telemetry, randomization, matching, and analysis plumbing; it is not evidence about Claude or GPT behavior."
};

process.stdout.write(JSON.stringify(output, null, 2));
