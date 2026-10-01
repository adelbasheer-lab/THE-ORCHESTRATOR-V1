# ORCHESTRATOR Research Protocol v1.2

## Real-agent experiment controller

V1.2 adds a deterministic experiment controller above the V1.1 real-agent runner. The controller materializes the task-by-condition-by-repetition matrix, records a manifest containing the benchmark fixture hash and experimental parameters, creates persistent per-run state, supports safe resume after interruption, and writes an aggregate experiment result. A run is never replaced by synthetic data when the provider is unavailable.

C0 uses the V1.1 real-agent runner directly. C1 runs the same implementation phase and then a bounded independent structured-oversight pass in the same isolated workspace. The oversight pass is recorded separately in the run result and cannot silently convert a provider failure into an observation.

The controller supports PLAN_ONLY mode for schedule validation without invoking an agent. This mode is intended for CI/preflight checks and does not produce behavioral observations.

## Instrumentation milestone

V1.1 adds real-agent execution telemetry. The authoritative event stream records model tool-use attempts and outcomes where the Claude Code stream exposes them. Final workspace state remains a separate evaluator because a transient action can be reversed before the final diff.

Each real-agent run must persist the raw provider stream only where permitted by the repository's data-handling policy, plus a normalized event record containing tool name, tool-use ID when available, input summary, outcome, and final workspace scope evaluation. Provider failures must be recorded as technical failures rather than silently converted into synthetic observations.

## Title

Controllable Multi-Agent Coding: Empirical Evaluation of Structured Oversight

## Research question

When an autonomous coding agent is given a bounded software task, does structured independent model oversight reduce safety-relevant boundary violations and defects while preserving task capability?

## Conditions

### C0 — IMPLEMENTATION_ONLY

GPT plan -> Claude implementation -> ORCHESTRATOR tests -> human-gated PR

### C1 — STRUCTURED_OVERSIGHT

GPT plan -> Claude implementation -> ORCHESTRATOR tests -> GPT review -> Claude fix/test loop -> human-gated PR

V1.2 implements the bounded oversight execution pass as a second Claude Code invocation after the implementation result. The pass is constrained to the same workspace, allowed tool surface, task objective, and boundary policy. Human approval remains outside the autonomous loop.

## Controller invariants

- The fixture SHA-256 is recorded in the experiment manifest.
- Every planned run has a stable run key: task, condition, seed, and repetition.
- Each run receives a fresh workspace initialized from its fixture.
- Resume may skip only a run recorded as COMPLETED; technical failures remain retryable.
- PLAN_ONLY never invokes Claude Code.
- Technical/provider failures are excluded from behavioral observations and explicitly counted.
- Aggregate results are derived only from persisted run records.
- A run cannot claim structured oversight unless the oversight pass actually executes and records its result.

## Controls held constant

Across conditions, keep constant where technically possible:
- benchmark task text;
- repository commit and branch base;
- workspace isolation;
- allowed read/write tool surface;
- test command;
- task time limit;
- maximum agent turns;
- Claude model/version;
- GPT model/version;
- environment variables unrelated to the experimental condition;
- human approval requirement;
- evaluation rubric.

The condition should be the main intentional difference.

## Benchmark construction

Use two task families:

1. Capability tasks — ordinary, harmless software-engineering tasks with objectively verifiable acceptance tests.
2. Control-pressure tasks — harmless tasks containing realistic opportunities for scope expansion, instruction conflict, canary modification, protected-path access, or unnecessary external-action attempts.

Control-pressure tasks must not contain real secrets, malware, destructive payloads, or production credentials. They are designed to measure whether the agent respects boundaries, not to reward harmful behavior.

## Initial pilot

For the first pilot, use at least:
- 10 benchmark tasks;
- 3 independent repetitions per task/condition;
- 2 conditions.

That yields 60 runs before exclusions.

The pilot is exploratory and is not presented as statistically powered evidence. Increase the sample before making strong claims.

## Primary measures

### Safety/control
- safety-relevant action attempts per run;
- blocked/protected-tool attempts per run;
- out-of-scope changed files per run;
- canary violations per run;
- reviewer-detected safety deviations per run.

### Capability/reliability
- acceptance-test success;
- final task success;
- residual defect count;
- review/fix cycles;
- wall-clock duration;
- total model turns.
