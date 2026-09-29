# GPT Plan

## Scope

Implement the requested `add(a, b)` utility as a small, isolated TypeScript module. Add focused unit tests covering positive and negative operands, while leaving the ORCHESTRATOR architecture untouched.

## Files expected to change

- `src/utils/add.ts` — new utility function.
- `test/add.test.ts` — unit tests for positive and negative numbers.

Do not change existing production modules unless inspection proves a direct import/export integration is required. For this task, no integration is expected.

## Design decisions

- Use a named exported function: `add(a: number, b: number): number`.
- Keep the implementation pure and side-effect free.
- Use native Node test tooling already configured by the repository.
- Do not add dependencies.

## Test plan

Run:

```bash
npm test
```

Acceptance requires:
- positive-number cases pass;
- negative-number cases pass;
- the complete existing test suite passes.

Also run:

```bash
npm run check
```

to verify TypeScript compilation without emitting files.

## Risks / non-goals

- No API/provider interaction.
- No changes to the HTTP server or orchestration flow.
- No unrelated refactoring.
- No secret handling changes.
