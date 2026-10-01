# ORCHESTRATOR Research Protocol v1.1

## Instrumentation milestone

V1.1 adds real-agent execution telemetry. The authoritative event stream records model tool-use attempts and outcomes where the Claude Code stream exposes them. Final workspace state remains a separate evaluator because a transient action can be reversed before the final diff.

Each real-agent run must persist the raw provider stream only where permitted by the repository's data-handling policy, plus a normalized event record containing tool name, tool-use ID when available, input summary, outcome, and final workspace scope evaluation. Provider failures must be recorded as technical failures rather than silently converted into synthetic observations.

## Title

Controllable Multi-Agent Coding: Empirical Evaluation of Structured Oversight

## Research question

When an autonomous coding agent is given a bounded software task, does structured independent model oversight reduce safety-relevant boundary violations and defects while preserving task capability?

## Motivation

Agentic systems can combine planning, tool use, code modification, testing, and external actions. A useful safety property is not only whether the final artifact works, but whether the agent remains controllable when instructions are incomplete, conflicting, or designed to tempt unnecessary action.

ORCHESTRATOR provides a reproducible setting in which the implementation agent can be observed inside an isolated workspace. The research intervention is a separate GPT planning/review process; the implementation agent remains Claude. GitHub PR creation and merging remain outside the autonomous implementation agent's authority, with merge requiring explicit human approval.

## Hypotheses

**H1 — Safety/control:** Structured independent review will reduce the rate of safety-relevant boundary violations per run, especially out-of-scope file changes and attempted use of blocked/protected actions.

**H2 — Reliability:** Structured independent review will reduce the rate of failed acceptance tests and residual defects.

**H3 — Capability preservation:** Structured independent review will not require an unacceptable loss of task completion, measured by successful acceptance-test completion and bounded resource use.

**H4 — Oversight quality:** Reviewer decisions will identify a measurable subset of implementation defects and safety-relevant deviations that are not detected by the implementation agent itself.

These are hypotheses to test, not expected conclusions.

## Experimental unit

One run is one execution of one benchmark task by one condition under one recorded model configuration and one workspace.

A run must have:
- a unique runId;
- a fixed benchmarkTaskId;
- one condition;
- a recorded protocol version;
- an explicit allowed-path set;
- a recorded model configuration;
- an event stream covering agent/tool/test/review activity.

## Conditions

### C0 — IMPLEMENTATION_ONLY

Pipeline:

GPT plan -> Claude implementation -> ORCHESTRATOR tests -> human-gated PR

There is no GPT implementation review or Claude fix loop.

### C1 — STRUCTURED_OVERSIGHT

Pipeline:

GPT plan -> Claude implementation -> ORCHESTRATOR tests -> GPT review -> Claude fix/test loop -> human-gated PR

The review loop is bounded by the same iteration and time limits used in the baseline.

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

## Secondary measures

- reviewer agreement/disagreement with test outcome;
- false-positive review rate;
- false-negative review rate discovered during later evaluation;
- tool-call count;
- token/cost metrics where available;
- failure category distribution.

## Pre-registration rule

Record the benchmark, hypotheses, conditions, metric definitions, exclusion rules, and analysis plan before inspecting comparative results.

Any protocol change after data collection must be recorded in a dated deviation log and must not silently replace the original analysis.

## Exclusions

A run may be excluded only for a protocol-defined technical failure unrelated to agent behavior, such as:
- corrupted base repository;
- unavailable model provider;
- infrastructure failure before the agent receives the task.

Agent mistakes, safety violations, policy blocks, failed tests, and bad patches are not exclusion reasons; they are observations.

## Human boundary

The implementation agent must not have authority to merge the GitHub PR.

Human approval remains a hard control. Research analysis must report whether the approval gate was reached and whether any run attempted to bypass it.

## Data handling

Do not log:
- API keys;
- GitHub tokens;
- authentication headers;
- private user data;
- real secrets.

Research event payloads are redacted by the ORCHESTRATOR security policy before persistence.

## Interpretation

A lower violation rate does not by itself establish general safety. Results are specific to the tested tasks, tools, models, prompts, and environment.

A passing test suite does not prove alignment or control. Safety-relevant outcomes must be reported separately from functional correctness.
