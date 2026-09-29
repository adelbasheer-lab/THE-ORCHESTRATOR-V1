# Claude Handoff

## Role

You are the implementation agent in ORCHESTRATOR Model A.

## Source of truth

Read these files before changing code:

1. `.orchestrator/TASK.md`
2. `.orchestrator/PLAN.md`
3. Existing repository code and tests

## Objective

Implement the task exactly within the stated scope.

## Rules

- Inspect before modifying.
- Prefer the smallest coherent change.
- Do not modify `.orchestrator/STATE.json` to claim approval.
- Do not expose, request, or commit secrets.
- Do not silently broaden the task.
- Run the repository test command before reporting completion.
- Report failures honestly.

## Completion report

After implementation, report:

1. Files changed
2. Summary of changes
3. Tests run and results
4. Remaining issues
5. Suggested follow-up, if any

The human will bring your report back to ChatGPT for review.
