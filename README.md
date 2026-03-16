<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Flow-12-FF0072?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

# Team of Agents

A visual canvas platform for designing, orchestrating, deploying, and version-tracking AI Agent workflows. Build teams of AI agents that collaborate on complex tasks — with human-in-the-loop checkpoints, real-time execution monitoring, and Git-style version control.

Think **n8n meets multi-agent AI** — a node-based editor where you wire together LLM agents, tools, gates, and logic into executable pipelines.

---

## Key Features

### Canvas Workspace
- Drag-and-drop node editor powered by **React Flow**
- 10 node types: Agent, Team, Trigger, Gate, Condition, Tool, Memory, Output, Subflow, Note
- Custom edges with data flow visualization
- Real-time collaborative editing via **Yjs CRDTs**
- Undo/redo, minimap, zoom controls, and keyboard shortcuts

### AI Agent Orchestration
- **Agent Nodes** — Configure LLM-powered agents with system prompts, model selection, tool access, and memory
- **Team Nodes** — Multi-agent collaboration with patterns: Sequential, Parallel, Supervisor, Debate, Round Robin
- **MCP Integration** — Connect any Model Context Protocol server for standardized tool access
- Powered by **Claude Agent SDK** and **LangGraph.js**

### Human-in-the-Loop Gates
- **Approval Gates** — Require human sign-off before proceeding (single or multi-approver)
- **Review Gates** — Inspect and edit agent output before passing downstream
- **Input Gates** — Pause execution to collect human input via configurable forms
- **Escalation** — Auto-escalate after timeout with multi-tier escalation chains
- Configurable timeout actions: auto-approve, reject, escalate, or route to fallback

### Durable Execution Engine
- Workflows compile from visual graphs into execution plans via **topological sort**
- Fault-tolerant execution with **Inngest** (step-level retries, event-driven)
- Live execution overlay on canvas — watch nodes light up as they run
- Real-time logs and OpenTelemetry tracing
- WebSocket execution feed for instant status updates

### Version Control
- Git-style versioning modeled in PostgreSQL — versions, branches, diffs, rollback
- Visual diff viewer highlighting node/edge changes between versions
- Publish workflow versions for API/webhook/schedule triggers
- Export/import as JSON or YAML for external Git integration
- Auto-save with manual save points

### Modern Platform
- Multi-tenant with Organizations, Projects, and RBAC (Owner/Admin/Member/Viewer)
- Reusable Agent, Team, and Workflow templates
- Approval inbox for pending HITL gates across all workflows
- Full REST + WebSocket API via tRPC with end-to-end type safety

---

## Architecture

```
teams-of-agents/
├── packages/
│   ├── shared/     @toa/shared   — Types, validators, utilities (discriminated union node system)
│   ├── db/         @toa/db       — Drizzle ORM schema + PostgreSQL migrations
│   ├── engine/     @toa/engine   — Execution engine (Inngest, compiler, agent/tool runners)
│   └── ui/         @toa/ui       — React components (shadcn/ui + React Flow canvas nodes)
├── apps/
│   ├── web/        @toa/web      — Next.js 15 frontend (canvas editor, dashboard, auth)
│   └── api/        @toa/api      — Fastify 5 backend (tRPC, WebSocket, Inngest handler)
├── tooling/                      — Shared TypeScript, ESLint, Tailwind configs
└── docker/                       — Docker Compose (Postgres, Redis, Inngest dev server)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| Canvas Editor | React Flow v12, Zustand, dnd-kit, Framer Motion |
| UI Components | shadcn/ui, Radix Primitives, Lucide Icons |
| API | Fastify 5, tRPC v11, SuperJSON |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | Better-Auth (email/password, OAuth, passkeys, 2FA, RBAC) |
| Execution | Inngest (durable workflows, step retries, waitForEvent) |
| AI Runtime | Claude Agent SDK, Anthropic TypeScript SDK |
| Multi-Agent | LangGraph.js (team orchestration patterns) |
| Tool Integration | Model Context Protocol (MCP) |
| Real-Time | WebSocket (execution feed), Yjs + Hocuspocus (collaboration) |
| Jobs | BullMQ + Redis (notifications) |
| Observability | OpenTelemetry |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest + Playwright |

---

## Node Types

| Node | Icon | Description |
|------|------|-------------|
| **Agent** | Brain | LLM-powered agent with system prompt, model, tools, and memory |
| **Team** | Users | Multi-agent group (sequential, parallel, supervisor, debate) |
| **Trigger** | Zap | Workflow entry point (manual, webhook, cron schedule, event) |
| **Gate** | ShieldCheck | Human-in-the-loop checkpoint (approval, review, input, escalation) |
| **Condition** | GitBranch | Router node (if/else, switch, LLM-powered routing) |
| **Tool** | Wrench | External integration (HTTP, code execution, MCP, database) |
| **Memory** | Database | Persistent storage (conversation buffer, vector store, key-value) |
| **Output** | ArrowRight | Workflow output (return, webhook, email, stream) |
| **Subflow** | Workflow | Nested workflow reference (composability) |
| **Note** | StickyNote | Visual annotation (not executed) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 9
- **Docker** (for Postgres, Redis, Inngest dev server)

### Setup

```bash
# Clone the repository
git clone https://github.com/allaspectsdev/TOA-AgentPlanning.git
cd TOA-AgentPlanning

# Install dependencies
pnpm install

# Start infrastructure services
docker compose -f docker/docker-compose.yml up -d

# Configure environment
cp .env.example .env
# Edit .env with your Anthropic API key and other settings

# Run database migrations
pnpm db:generate
pnpm db:migrate

# (Optional) Seed with sample data
pnpm db:seed

# Start development servers
pnpm dev
```

This starts:
- **Next.js** frontend at `http://localhost:3000`
- **Fastify** API server at `http://localhost:3001`
- **Inngest** dev server at `http://localhost:8288`

### Project Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |

---

## Data Model

```
Organization
 └── Project
      └── Workflow
           ├── WorkflowVersion (immutable definition snapshots)
           │    └── definition (JSONB: nodes[], edges[], viewport, settings)
           └── Execution
                ├── ExecutionStep (per-node state: status, input, output, tokens)
                ├── ExecutionLog (structured log entries)
                └── GateApproval (HITL gate state: pending/approved/rejected)
```

Key design decisions:
- **Workflow definitions** stored as JSONB (atomic document, like a Git commit)
- **Execution steps** stored relationally (queried and updated independently during runs)
- **Templates** (agent, team, workflow) stored separately for reuse, embedded by snapshot into definitions

---

## Execution Flow

```
User clicks "Run"
       │
       ▼
  ┌─────────┐     ┌──────────────┐     ┌─────────────────┐
  │ Compiler │────▶│ Topo Sort +  │────▶│ Execution Plan   │
  │          │     │ Parallel     │     │ (ordered groups) │
  └─────────┘     │ Detection    │     └────────┬────────┘
                  └──────────────┘              │
                                                ▼
                                    ┌───────────────────┐
                                    │  Inngest Function  │
                                    │  (durable exec)    │
                                    └────────┬──────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
                 ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
                 │ Agent Runner │   │ Tool Runner  │   │   Gate Runner   │
                 │ (Claude SDK) │   │ (HTTP/Code)  │   │ (waitForEvent)  │
                 └─────────────┘   └─────────────┘   └────────┬────────┘
                                                               │
                                                    ┌──────────┴──────────┐
                                                    │  Human approves in  │
                                                    │  UI or times out    │
                                                    └─────────────────────┘
```

---

## RBAC Permission Matrix

| Resource | Owner | Admin | Member | Viewer |
|----------|:-----:|:-----:|:------:|:------:|
| Organization settings | Full | Update | - | - |
| Members | Full | Invite/Remove | - | - |
| Projects | Full | Full | Create/Edit own | - |
| Workflows | Full | Full | Create/Edit/Run | View |
| Executions | Full | Full | Start/View | View |
| Gate approvals | All | All | Assigned only | - |
| API keys | Full | Full | - | - |

---

## Implementation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Foundation — Monorepo, DB schema, types, auth, tRPC skeleton, dashboard shell | Done |
| **Phase 2** | Canvas Editor — React Flow, custom nodes, Zustand store, drag-and-drop, save/load | Next |
| **Phase 3** | Execution Engine — Compiler, Inngest functions, agent/tool runners, live overlay | Planned |
| **Phase 4** | HITL & Teams — Gate runner, approval UI, notifications, LangGraph team patterns | Planned |
| **Phase 5** | Collaboration — Yjs real-time editing, version diffing, templates, onboarding | Planned |
| **Phase 6** | Production — E2E tests, rate limiting, webhook/schedule triggers, optimization | Planned |

---

## Contributing

Contributions are welcome! Please open an issue to discuss what you'd like to change before submitting a PR.

---

## License

MIT

---

<p align="center">
  Built with TypeScript, powered by Claude
</p>
