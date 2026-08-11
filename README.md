# AI Agent Workflow Builder

A mini n8n-style workflow builder specifically designed for chaining AI agent steps with human-in-the-loop approval gates, built with **Nhost**, **Hasura GraphQL Engine**, **PostgreSQL**, **Node.js/Express**, **Groq LLM API**, **Next.js**, and **TypeScript**.

---

## Technical Stack & Architecture

```text
                    USER (Browser)
                          │
                          ▼
                  ┌──────────────┐
                  │   Next.js    │
                  │   Frontend   │
                  └──────┬───────┘
                         │ GraphQL / Subscription
                         ▼
                  ┌──────────────┐
                  │    NHOST     │
                  │              │
                  │  Hasura RLS  │
                  │  PostgreSQL  │
                  └──────┬───────┘
                         │ Hasura Actions
                         ▼
                  ┌──────────────┐
                  │   Backend    │
                  │   Executor   │
                  │ (Groq LLM /  │
                  │  HTTP Step)  │
                  └──────────────┘
```

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Nhost SDK, GraphQL Client
- **Backend Service**: Node.js Express server with TypeScript, Workflow Execution Engine, Retry Handler, Groq SDK integration
- **Database & Auth**: PostgreSQL, Hasura GraphQL Engine (v2/v3 metadata), Nhost Auth & Row-Level Security (RLS)
- **AI / LLM API**: Groq API (`llama-3.3-70b-versatile` / `llama3-8b-8192`) with safe deterministic fallback

---

## Features

1. **Multi-Step Agent Workflows**: Supports `llm_call`, `http_request`, `conditional_branch`, `approval_gate`, `db_write`, and `notify`.
2. **Approval Gate (Human-in-the-Loop)**: Execution pauses automatically at `approval_gate` step (`status: paused`) and resumes asynchronously upon authorized approval without re-running completed steps.
3. **Groq LLM Integration**: Real LLM execution with prompt template substitution (`{{input}}`) and response output parsing.
4. **2-Layer Security & Role Permissions**:
   - **Layer 1 (Hasura RLS)**: Access to workflows, steps, triggers, and runs is strictly restricted by organization membership (`org_members`) matching `X-Hasura-User-Id`.
   - **Layer 2 (Restricted Actions & Steps)**: `db_write`, `notify` steps and `webhook` triggers require `owner` role, enforced server-side.
5. **Real-time GraphQL Subscriptions**: Live step status timeline (`pending`, `running`, `completed`, `paused`, `failed`) updates automatically without page refreshes.
6. **Inbound Webhook Triggers**: Direct external API execution with secret token validation (`/api/webhook/trigger`).
7. **Monthly Quota Enforcement**: Organizations track `usage_calls` vs `usage_limit`. Requests exceeding quota are rejected.
8. **Automatic Retry Strategy**: Failed steps attempt 1 retry before marking the step and workflow run as `failed`.

---

## Database Schema Overview

- `organizations`: `id` (UUID PK), `name`, `usage_calls`, `usage_limit`, `created_at`
- `org_members`: `id` (UUID PK), `org_id`, `user_id`, `role` (`owner`, `editor`, `viewer`), UNIQUE(`org_id`, `user_id`)
- `workflows`: `id` (UUID PK), `org_id`, `name`, `description`, `created_by`, timestamps
- `workflow_steps`: `id` (UUID PK), `workflow_id`, `name`, `step_order`, `type`, `config` (JSONB)
- `workflow_triggers`: `id` (UUID PK), `workflow_id`, `trigger_type` (`manual`, `webhook`), `config` (JSONB), `enabled`
- `workflow_runs`: `id` (UUID PK), `workflow_id`, `status` (`pending`, `running`, `paused`, `completed`, `failed`), `trigger_type`, `started_at`, `completed_at`
- `step_runs`: `id` (UUID PK), `workflow_run_id`, `workflow_step_id`, `status`, `input`, `output`, `attempt_count`, `approved_by`, `approved_at`
- `workflow_results`: Target table for `db_write` step records (`workflow_run_id`, `workflow_id`, `data`)
- **View**: `org_usage_monthly` (`org_id`, `month`, `calls_used`, `calls_allowed`, `remaining`)

---

## Quick Start & Local Setup

### 1. Repository Setup
```bash
git clone <repository-url>
cd ai-agent-workflow-builder
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set environment variables:
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=local
NEXT_PUBLIC_NHOST_REGION=local
NEXT_PUBLIC_NHOST_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_NHOST_GRAPHQL_WS_URL=ws://localhost:8080/v1/graphql

NHOST_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey

GROQ_API_KEY=your_groq_api_key_here
PORT=4000
BACKEND_URL=http://localhost:4000
```

### 3. Database & Hasura Initialization
Start local PostgreSQL & Hasura using Docker Compose:
```bash
docker-compose up -d
```
Apply migrations and seed data:
```bash
# Apply schema
docker exec -i ai-agent-workflow-builder-postgres-1 psql -U postgres -d postgres < database/migrations/01_init_schema.sql

# Apply seed data
docker exec -i ai-agent-workflow-builder-postgres-1 psql -U postgres -d postgres < database/seed/demo_seed.sql
```

### 4. Install Dependencies & Start Services
```bash
# Install dependencies across monorepo
npm run install:all

# Start Backend Executor (Port 4000)
npm run dev:backend

# Start Frontend App (Port 3000)
npm run dev:frontend
```

Open `http://localhost:3000` in your browser.

---

## Canonical Demo Workflow Walkthrough

1. Open `http://localhost:3000/login`.
2. Select **Alice (Org A Owner)** from the **Evaluation Quick Switcher**.
3. Navigate to **Workflows** → **Customer Support Request Triage & Processing**.
4. Pipeline steps:
   - `Step 1`: **Classify Priority (LLM Call)** — Sends prompt to Groq API to return `"HIGH"` or `"LOW"`.
   - `Step 2`: **Check Priority Condition** — Evaluates if LLM output contains `"HIGH"`.
   - `Step 3`: **Fetch Ticket Meta (HTTP Request)** — Performs GET request to `https://jsonplaceholder.typicode.com/todos/1`.
   - `Step 4`: **Human Executive Approval Gate** — Execution pauses (`PAUSED — AWAITING APPROVAL`).
   - `Step 5`: **Save Result Record (DB Write)** — Inserts record into `workflow_results`.
5. Click **Run Workflow**:
   - Step 1 to Step 3 complete immediately.
   - Step 4 transitions status to `PAUSED — AWAITING APPROVAL`.
6. Click **Approve Step**:
   - Execution resumes, Step 5 completes, and workflow status becomes `COMPLETED`.

---

## Webhook Inbound Execution

Trigger the workflow externally via curl:

```bash
curl -X POST http://localhost:4000/api/webhook/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "aaaa1111-1111-1111-1111-111111111111",
    "token": "demo-webhook-secret-token-123",
    "input": { "request": "Customer requests urgent priority support ticket" }
  }'
```

---

## Cross-Org Isolation Security Test

To verify cross-org security:
1. Log in as **David (Org B Owner)** using the Quick Switcher.
2. Attempt to query or trigger Org A's workflow (`aaaa1111-1111-1111-1111-111111111111`).
3. Hasura Row-Level Security blocks the query (returns `null` or `UNAUTHORIZED_OR_NOT_FOUND`).
4. Invoking `triggerWorkflowRun` or `approveStep` for Org A items from Org B returns an explicit `400/401 Unauthorized` exception.

---

## Deployment Configuration

- **Frontend**: Deploy `frontend/` to **Vercel** with environment variables set to production Nhost and Render URLs.
- **Backend Service**: Deploy `backend/` to **Render** or **Railway**. Set `GROQ_API_KEY`, `HASURA_GRAPHQL_ADMIN_SECRET`, and `NHOST_GRAPHQL_URL`.
- **Database & Hasura**: Deploy using **Nhost Cloud** or self-hosted Hasura GraphQL Cloud instance. Apply Hasura metadata via CLI (`hasura metadata apply`).
