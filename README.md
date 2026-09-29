# ORCHESTRATOR V1

A server-side shared-task collaboration runtime where GPT and Claude operate as peer agents against the same isolated coding workspace.

## V1 flow

User -> ORCHESTRATOR -> GPT plan -> Claude implementation -> tests -> GPT review -> Claude fixes -> tests/review loop -> GitHub PR -> human approval -> merge.

## Components

- Fastify HTTP API
- PostgreSQL task/event persistence, with in-memory fallback
- OpenAI Responses API adapter
- Anthropic Messages API adapter
- MCP remote-tool plane
- Isolated Git workspaces and branches
- GitHub PR/merge adapter
- Explicit task state machine and bounded agent iterations
- Human approval gate
- GitHub Actions CI

## API

- GET /health
- POST /v1/tasks
- GET /v1/tasks/:id
- POST /v1/tasks/:id/approve

## Local setup

Requirements: Node.js 20+, Git, PostgreSQL.

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run dev
```

Keep API keys in environment variables. Do not commit .env.

## Repository layout

- src/core - state machine, store, orchestration engine
- src/agents - GPT and Claude adapters
- src/tools - Git, workspace and MCP tools
- src/infra - PostgreSQL and workspace management
- src/github - GitHub API client
- src/server.ts - HTTP entry point
- test - unit tests
- .github/workflows/ci.yml - CI

## Security boundaries

V1 exposes a bounded tool surface to agents. Test execution is fixed by the task and shell metacharacters are rejected. Workspace paths are confined to the task workspace. Secrets stay server-side.

The merge step requires an explicit human approval API call.

## V1 limitations

Task execution is currently in-process rather than a durable worker queue. A later version should add durable jobs, resumability, richer GitHub check integration, and stronger authorization around task creation and approval.


## Model A — Zero-API Edition

Model A lets you operate ORCHESTRATOR with the consumer ChatGPT and Claude interfaces, without OpenAI or Anthropic API keys. The models are connected by a structured handoff protocol and a GitHub-backed shared workspace; the human performs the baton pass between them.

This mode is intentionally different from the server-side V1 execution path above:

```text
Human
  ↓
ChatGPT — plan / inspect / review
  ↓
GitHub shared workspace
  ↓
Claude — implement / fix
  ↓
GitHub shared workspace
  ↓
ChatGPT — test interpretation / review
  ↓
Human approval
  ↓
GitHub PR
```

### Model A protocol

The protocol lives in `.orchestrator/`:

- `.orchestrator/TASK.md` — the single task brief.
- `.orchestrator/STATE.json` — current state, owners, iteration, and next action.
- `.orchestrator/PLAN.md` — ChatGPT's plan and implementation constraints.
- `.orchestrator/CLAUDE_HANDOFF.md` — the exact packet to paste into Claude.
- `.orchestrator/CLAUDE_RESULT.md` — Claude's completion report.
- `.orchestrator/GPT_REVIEW.md` — ChatGPT's review and next action.
- `.orchestrator/HISTORY/README.md` — rules for recording important handoffs.

The authoritative workflow is:

1. Human writes `TASK.md`.
2. ChatGPT reads the repository and writes `PLAN.md` and `CLAUDE_HANDOFF.md`.
3. Human gives the handoff packet to Claude.
4. Claude implements and records the result in `CLAUDE_RESULT.md`.
5. Human brings Claude's result back to ChatGPT.
6. ChatGPT reviews the implementation and updates `GPT_REVIEW.md` and `STATE.json`.
7. Repeat IMPLEMENT → TEST → REVIEW → FIX until ChatGPT records `APPROVE`.
8. Human opens/inspects the PR and performs the final merge decision.

### Important limitation

Model A does **not** provide automatic model-to-model API calls. The human is the communication bridge. It also does not imply that ChatGPT Free or Claude Free can execute arbitrary local processes on your computer through this repository. The repository is the shared source-of-truth, while each model works through the tools available in its own interface.

### Later migration

When API access becomes available, the Model A protocol remains useful. The human handoff can be replaced by API calls while retaining the same task, state, review, and audit concepts.
