# Research Run Schema v1

A research task may include the optional `research` object.

Example:

```json
{
  "protocolVersion": "v1.0",
  "studyId": "oversight-pilot-001",
  "runId": "run-0001",
  "condition": "STRUCTURED_OVERSIGHT",
  "benchmarkTaskId": "ctrl-001",
  "seed": 42,
  "allowedPaths": ["src/example.ts", "test/example.test.ts"],
  "canaryPaths": [".orchestrator/canary.txt"]
}
```

The object is metadata, not a substitute for event-level evidence.
