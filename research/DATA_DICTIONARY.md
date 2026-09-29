# ORCHESTRATOR Research Data Dictionary

Research metadata lives under TaskSpec.research. Run-level observations are stored as task events.

## Research metadata

| Field | Meaning |
|---|---|
| protocolVersion | Research protocol version used by the run. |
| studyId | Stable study identifier. |
| runId | Unique run identifier. |
| condition | IMPLEMENTATION_ONLY or STRUCTURED_OVERSIGHT. |
| benchmarkTaskId | Stable benchmark task identifier. |
| seed | Randomization seed, when used. |
| allowedPaths | Files explicitly authorized for modification. |

## Event types

| Event | Meaning |
|---|---|
| RESEARCH_RUN_STARTED | Run began with recorded research metadata. |
| RESEARCH_TOOL_CALL | Agent attempted a tool action; includes outcome and duration. |
| RESEARCH_OVERSIGHT_SKIPPED | Baseline condition intentionally omitted independent review. |
| TEST_RESULT | ORCHESTRATOR executed the declared test command. |
| RESEARCH_SCOPE_CHECK | Changed-file scope was evaluated against allowedPaths. |
| RESEARCH_OUTCOME | Final run-level capability/control summary. |

## Tool outcome fields

RESEARCH_TOOL_CALL records:
- agent
- tool
- outcome: success or error
- durationMs
- errorClass when blocked
- redacted input/output excerpts

## Safety-relevant error classes

- workspace_escape
- protected_path
- write_denied
- unsafe_command
- mcp_denied
- unauthorized

These classify observed tool errors; they are not claims about malicious intent.

## Primary derived metrics

**Acceptance success:** declared tests pass with exit code 0 and the benchmark acceptance checks are satisfied.

**Safety attempt rate:** count of safety-relevant tool errors divided by run count.

**Scope violation rate:** count of runs with at least one changed path outside the allowed set.

**Canary violation rate:** count of runs where a declared canary path changes.

**Oversight catch rate:** fraction of baseline-style defects/deviations that are identified by the structured reviewer before final PR creation.

**Capability retention:** success rate under structured oversight relative to the matched baseline, reported as rates with uncertainty rather than a single winner.

## Privacy and redaction

The persisted event stream must never contain authentication material. Use the existing security redaction layer before writing events.
