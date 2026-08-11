import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { extractHasuraAuthContext, AuthenticatedRequest } from './middleware/auth';
import { runWorkflowExecutionEngine, resumeWorkflowExecutionEngine } from './executor/index';
import { hasuraGraphQLRequest } from './services/hasura';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-agent-workflow-executor', timestamp: new Date().toISOString() });
});

// Secure GraphQL Proxy Endpoint for Frontend
app.post('/api/graphql', extractHasuraAuthContext, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, variables } = req.body;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ message: 'BAD_REQUEST: query is required.' });
    }

    const headers: Record<string, string> = {};
    if (userId) {
      headers['x-hasura-role'] = 'user';
      headers['x-hasura-user-id'] = userId;
    }

    const data = await hasuraGraphQLRequest(query, variables || {}, headers);
    return res.json({ data });
  } catch (err: any) {
    console.error('[GraphQL API Route Error]:', err.message);
    return res.status(400).json({ errors: [{ message: err.message }] });
  }
});

// Hasura Action: triggerWorkflowRun
app.post('/api/actions/trigger-workflow', extractHasuraAuthContext, async (req: AuthenticatedRequest, res) => {
  try {
    const { workflow_id, input } = req.body.input || req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'UNAUTHORIZED: Missing authenticated user context.' });
    }

    if (!workflow_id) {
      return res.status(400).json({ message: 'BAD_REQUEST: workflow_id is required.' });
    }

    const result = await runWorkflowExecutionEngine(workflow_id, userId, 'manual', input || {});
    return res.json(result);
  } catch (err: any) {
    console.error('[Action triggerWorkflowRun Error]:', err.message);
    return res.status(400).json({ message: err.message || 'Workflow execution failed.' });
  }
});

// Hasura Action: approveStep
app.post('/api/actions/approve-step', extractHasuraAuthContext, async (req: AuthenticatedRequest, res) => {
  try {
    const { step_run_id } = req.body.input || req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'UNAUTHORIZED: Missing authenticated user context.' });
    }

    if (!step_run_id) {
      return res.status(400).json({ message: 'BAD_REQUEST: step_run_id is required.' });
    }

    const result = await resumeWorkflowExecutionEngine(step_run_id, userId);
    return res.json(result);
  } catch (err: any) {
    console.error('[Action approveStep Error]:', err.message);
    return res.status(400).json({ message: err.message || 'Step approval failed.' });
  }
});

// Inbound Webhook Endpoint
app.post('/api/webhook/trigger', async (req, res) => {
  try {
    const { workflow_id, token, input } = req.body;

    if (!workflow_id || !token) {
      return res.status(400).json({ error: 'BAD_REQUEST: workflow_id and token are required.' });
    }

    // Verify trigger secret/token in workflow_triggers table
    const trigQuery = `
      query GetTriggerInfo($workflow_id: uuid!) {
        workflow_triggers(where: { workflow_id: { _eq: $workflow_id }, trigger_type: { _eq: "webhook" }, enabled: { _eq: true } }) {
          id
          config
        }
      }
    `;

    const trigData = await hasuraGraphQLRequest(trigQuery, { workflow_id });
    const triggers = trigData.workflow_triggers || [];

    const validTrigger = triggers.find((t: any) => t.config?.token === token);
    if (!validTrigger) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Invalid webhook secret token or trigger disabled.' });
    }

    // Execute workflow run asynchronously
    const result = await runWorkflowExecutionEngine(workflow_id, 'system-webhook', 'webhook', input || {});

    return res.json({
      message: 'Webhook trigger accepted, workflow running.',
      workflow_run_id: result.workflow_run_id,
      status: result.status,
    });
  } catch (err: any) {
    console.error('[Webhook Trigger Error]:', err.message);
    return res.status(400).json({ error: err.message || 'Webhook trigger failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Workflow Executor Backend running on port ${PORT}`);
});
