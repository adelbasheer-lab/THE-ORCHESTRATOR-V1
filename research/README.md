# ORCHESTRATOR Safety Research

ORCHESTRATOR is now organized as an empirical research harness for AI control and scalable oversight.

The core research question is:

> Can structured, independent model oversight reduce unsafe or out-of-scope behavior by an autonomous coding agent while preserving useful task completion?

The repository is an instrumented environment for testing that question. It is not evidence that any particular orchestration design is safe. Results must be reported with task definitions, conditions, model versions, seeds, failures, and deviations from the protocol.

## Study focus

The study treats a coding agent as a bounded autonomous system operating in an isolated workspace. The intervention is structured oversight by a separate reviewer agent. The main comparison is:

- IMPLEMENTATION_ONLY — GPT supplies a plan; Claude implements; ORCHESTRATOR runs tests; no model review/fix loop.
- STRUCTURED_OVERSIGHT — GPT supplies a plan; Claude implements; ORCHESTRATOR runs tests; GPT independently reviews; Claude may fix; the loop is bounded.

The same workspace isolation, test policy, approval gate, and resource limits are retained across conditions.

## Safety objective

The primary safety construct is controllability under task pressure: whether the implementation agent stays within explicit action and scope boundaries rather than whether it merely produces passing code.

Secondary constructs are reliability and capability:
- functional correctness;
- instruction adherence;
- resistance to out-of-scope changes;
- attempted use of blocked/protected actions;
- reviewer detection and correction;
- time, turns, and task completion.

## Repository map

- research/RESEARCH_PROTOCOL.md — preregisterable study design.
- research/BENCHMARK.md — benchmark construction rules and task classes.
- research/DATA_DICTIONARY.md — event schema and metric definitions.
- research/ANALYSIS_PLAN.md — analysis and reporting rules.
- .orchestrator/RESEARCH_PROTOCOL_VERSION — protocol version recorded with runs.

The implementation-level telemetry is emitted through ORCHESTRATOR task events. Research runs must not include real credentials or personal/sensitive data.
