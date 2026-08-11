# Architecture Documentation — AI Agent Workflow Builder

## 1. Relational Database Schema Reasoning
The PostgreSQL schema is designed for multi-tenant isolation, step order reproducibility, and complete execution auditing:
- **`organizations` & `org_members`**: Establishes strict multi-tenancy. Organization membership maps user IDs to roles (`owner`, `editor`, `viewer`). A compound `UNIQUE(org_id, user_id)` index guarantees single-role assignment per org.
- **`workflows`, `workflow_steps`, & `workflow_triggers`**: Declarative workflow definitions. `workflow_steps` uses an indexed integer `step_order` to enforce sequential execution. Step configs are stored as type-checked JSONB objects.
- **`workflow_runs` & `step_runs`**: Immutable audit logs of execution attempts. `step_runs` tracks granular input, output, execution state, retry count (`attempt_count`), and approval metadata (`approved_by`, `approved_at`).
- **`org_usage_monthly` View**: Aggregates usage calls vs allowed limits dynamically without requiring background cron syncs.

---

## 2. Hasura Metadata & Relationships
Hasura tracks all core tables and connects them through foreign key constraints:
```text
organizations (1) ───< org_members (N)
organizations (1) ───< workflows (N) ───< workflow_steps (N)
                                     ───< workflow_triggers (N)
                                     ───< workflow_runs (N) ───< step_runs (N)
```
These relationships allow single nested GraphQL queries while enabling Hasura's permission engine to traverse relationships during authorization checks.

---

## 3. Layer 1 Authorization (Hasura RLS)
Row-Level Security (RLS) is applied across all database tables for the default `user` role using Hasura permission filters:
- **Rule**: A user can query or mutate a workflow/run ONLY if their authenticated `X-Hasura-User-Id` exists in `org_members` for the workflow's `org_id`:
```yaml
filter:
  organization:
    org_members:
      user_id:
        _eq: X-Hasura-User-Id
```
- **Direct ID Guessing Protection**: If an attacker authenticated under Org B queries an Org A workflow UUID directly via GraphQL, Hasura evaluates the permission relationship and returns `null` or empty results, preventing unauthorized data leakage or existence probing.

---

## 4. Layer 2 Authorization (Restricted Actions & High-Privilege Steps)
Restricted operations (`db_write`, `notify` steps, and `webhook` triggers) require the `owner` role:
- **Server-Side Enforcement**: In the Node.js backend (`/api/actions/trigger-workflow` and `/api/actions/approve-step`), incoming requests are validated against the user's role in `org_members`.
- If an editor or viewer attempts to create a `db_write` step or execute an owner-restricted action directly via GraphQL or REST, the backend rejects the request with an explicit `FORBIDDEN_ROLE` exception.

---

## 5. Workflow Execution Engine & Pause/Resume Architecture
The Node.js workflow executor processes steps sequentially:
1. **Validation**: Authenticates caller identity, org membership, role permissions, and monthly quota (`usage_calls < usage_limit`).
2. **Run Initialization**: Creates a `workflow_run` record with status `running`.
3. **Sequential Step Loop**: Iterates through ordered steps.
   - For `llm_call`: Interpolates `{{input}}` into the prompt template, calls Groq LLM API (`llama-3.3-70b-versatile`), and stores the JSON result in `step_runs.output`.
   - For `http_request`: Executes HTTP fetch and records full response payload.
   - For `conditional_branch`: Evaluates text condition against previous step outputs and outputs branch state (`TRUE` / `FALSE`).
   - For `approval_gate`: Sets `step_run.status = 'paused'` and `workflow_run.status = 'paused'`, then **halts the engine loop**.
4. **Resumption**: Upon receiving an authorized `approveStep(step_run_id)` Action call:
   - Verifies the user's `owner`/`editor` status in the target org.
   - Updates `step_run.status = 'completed'`, records `approved_by` and `approved_at`.
   - Updates `workflow_run.status = 'running'` and resumes execution **from the step immediately following the approval gate**.

---

## 6. Retry Strategy
- Execution of `llm_call` and `http_request` steps includes an automatic single-retry loop (`attempt_count = 1` -> fail -> `attempt_count = 2`).
- If both attempts fail, `step_run.status` is set to `failed` and `workflow_run.status` is set to `failed`. Execution terminates cleanly without unhandled crashes.

---

## 7. Quota Tracking
- Before initiating a workflow run, the engine checks `usage_calls < usage_limit`.
- If quota is exceeded, execution is immediately rejected with a `QUOTA_EXCEEDED` error.
- Upon successful workflow completion, `organizations.usage_calls` is incremented atomically in PostgreSQL.

---

## 8. Real-time GraphQL Subscriptions
- The frontend subscribes to `step_runs` filtered by `workflow_run_id`:
```graphql
subscription StepRuns($workflowRunId: uuid!) {
  step_runs(where: { workflow_run_id: { _eq: $workflowRunId } }, order_by: { created_at: asc }) {
    id
    status
    input
    output
    approved_by
  }
}
```
- Hasura enforces Layer 1 RLS over subscriptions, ensuring Org B users cannot subscribe to Org A run updates even if they possess the run UUID.

---

## 9. Inbound Webhook Execution
- External systems trigger workflows via `POST /api/webhook/trigger` using a `workflow_id` and secret `token`.
- The endpoint queries `workflow_triggers` to validate token match and enabled status.
- Once validated, execution starts asynchronously under a dedicated `system-webhook` context while obeying quota limits.
