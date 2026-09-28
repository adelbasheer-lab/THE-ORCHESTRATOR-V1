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
