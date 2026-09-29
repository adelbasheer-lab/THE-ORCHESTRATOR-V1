# Claude Handoff

## Role

You are the implementation agent in ORCHESTRATOR Model A.

## Task

Implement the objective in `.orchestrator/TASK.md` using the plan in `.orchestrator/PLAN.md`.

## Required workflow

1. Inspect the repository and existing test conventions.
2. Implement the smallest coherent change.
3. Add the requested unit tests.
4. Run the full test suite with `npm test`.
5. Run `npm run check`.
6. Do not modify unrelated files.
7. Do not expose, request, or commit secrets.
8. Report the exact files changed and the exact commands/results.

## Acceptance criteria

- `add(a, b)` accepts two numbers and returns their sum.
- Positive-number tests exist.
- Negative-number tests exist.
- Existing tests remain passing.
- Scope remains limited to this task.

## Completion report

Return:

1. Files changed
2. Summary of implementation
3. Tests run and results
4. Any remaining issues
5. Whether the task is ready for GPT review
