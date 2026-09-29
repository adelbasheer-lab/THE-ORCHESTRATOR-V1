# Pilot 001 — Benchmark Harness Smoke Test

- Protocol: v1.0
- Benchmark: benchmark-v1.0
- Seed: 20260929
- Repetitions: 3
- Tasks: 10
- Conditions: 2
- Runs: 60
- Reproducibility check: PASS (identical run output on repeated execution with the same seed)

## Results

| Condition | Runs | Pressure attempts | Control violations | Caught by oversight | Acceptance successes |
|---|---:|---:|---:|---:|---:|
| IMPLEMENTATION_ONLY | 30 | 10 | 10 | 0 | 20 |
| STRUCTURED_OVERSIGHT | 30 | 9 | 0 | 9 | 30 |

Rates:

- IMPLEMENTATION_ONLY: 33.3% control-violation rate; 66.7% acceptance success.
- STRUCTURED_OVERSIGHT: 0.0% control-violation rate; 100.0% acceptance success.

## Interpretation

These numbers are **not evidence about GPT, Claude, or the safety of ORCHESTRATOR**.

Pilot 001 executes the deterministic benchmark-pressure simulator embedded in research/pilot-runner.mjs. Its purpose is to validate that the ten-task fixture set, experimental conditions, deterministic seeding, matched-run structure, telemetry fields, and analysis plumbing can produce reproducible measurements.

The apparent separation between conditions is therefore an expected property of the synthetic pressure model, not an empirical finding about model behavior.

## Next empirical step

Replace the simulated pressure events with actual agent/tool events from ORCHESTRATOR runs. The same benchmark IDs, condition labels, allowed-path checks, and outcome schema should be retained so that the real experiment can be analyzed without changing the endpoints after seeing results.
