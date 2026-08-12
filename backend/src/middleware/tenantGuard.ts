import { hasuraGraphQLRequest } from '../services/hasura';

// Cache user organization memberships briefly to maintain high performance
const userOrgCache = new Map<string, { orgIds: string[]; roles: Record<string, string>; expiresAt: number }>();
const CACHE_TTL_MS = 10000; // 10 seconds TTL

export async function getUserOrgContext(userId: string): Promise<{ orgIds: string[]; roles: Record<string, string> }> {
  const now = Date.now();
  const cached = userOrgCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { orgIds: cached.orgIds, roles: cached.roles };
  }

  const query = `
    query GetUserOrgs($user_id: uuid!) {
      org_members(where: { user_id: { _eq: $user_id } }) {
        org_id
        role
      }
    }
  `;

  try {
    const res = await hasuraGraphQLRequest(query, { user_id: userId });
    const members = res?.org_members || [];
    const orgIds: string[] = [];
    const roles: Record<string, string> = {};

    for (const m of members) {
      if (m.org_id) {
        orgIds.push(m.org_id);
        roles[m.org_id] = m.role;
      }
    }

    userOrgCache.set(userId, { orgIds, roles, expiresAt: now + CACHE_TTL_MS });
    return { orgIds, roles };
  } catch (err: any) {
    console.error(`[Tenant Guard] Failed to fetch org memberships for user ${userId}:`, err.message);
    return { orgIds: [], roles: {} };
  }
}

export async function enforceMultiTenantIsolation(data: any, userId?: string, variables: any = {}): Promise<any> {
  if (!data || typeof data !== 'object' || !userId || userId === 'system-webhook') {
    return data;
  }

  const { orgIds } = await getUserOrgContext(userId);

  // 1. Single workflow by primary key (workflows_by_pk)
  if (data.workflows_by_pk) {
    const wfOrgId = data.workflows_by_pk.org_id;
    if (wfOrgId && !orgIds.includes(wfOrgId)) {
      console.warn(`[Proxy Tenant Security] Blocked cross-org access to workflow ${data.workflows_by_pk.id} for user ${userId}`);
      data.workflows_by_pk = null;
    }
  }

  // 2. Workflows array (workflows)
  if (Array.isArray(data.workflows)) {
    data.workflows = data.workflows.filter((wf: any) => {
      if (wf.org_id && !orgIds.includes(wf.org_id)) {
        console.warn(`[Proxy Tenant Security] Filtered cross-org workflow ${wf.id} for user ${userId}`);
        return false;
      }
      return true;
    });
  }

  // 3. Single workflow run by primary key (workflow_runs_by_pk)
  if (data.workflow_runs_by_pk) {
    const runWfOrgId = data.workflow_runs_by_pk.workflow?.org_id;
    if (runWfOrgId && !orgIds.includes(runWfOrgId)) {
      console.warn(`[Proxy Tenant Security] Blocked cross-org access to workflow_run ${data.workflow_runs_by_pk.id} for user ${userId}`);
      data.workflow_runs_by_pk = null;
    }
  }

  // 4. Workflow runs array (workflow_runs)
  if (Array.isArray(data.workflow_runs)) {
    data.workflow_runs = data.workflow_runs.filter((run: any) => {
      const runWfOrgId = run.workflow?.org_id;
      if (runWfOrgId && !orgIds.includes(runWfOrgId)) {
        console.warn(`[Proxy Tenant Security] Filtered cross-org workflow_run ${run.id} for user ${userId}`);
        return false;
      }
      return true;
    });
  }

  // 5. Step runs array (step_runs)
  if (Array.isArray(data.step_runs)) {
    data.step_runs = data.step_runs.filter((sr: any) => {
      const srWfOrgId = sr.workflow_run?.workflow?.org_id;
      if (srWfOrgId && !orgIds.includes(srWfOrgId)) {
        console.warn(`[Proxy Tenant Security] Filtered cross-org step_run ${sr.id} for user ${userId}`);
        return false;
      }
      return true;
    });
  }

  // 6. Organization members array (org_members)
  if (Array.isArray(data.org_members)) {
    data.org_members = data.org_members.filter((m: any) => {
      if (m.org_id && !orgIds.includes(m.org_id)) {
        return false;
      }
      return true;
    });
  }

  return data;
}

export async function validateWorkflowMutationTenant(query: string, variables: any = {}, userId?: string): Promise<void> {
  if (!userId || userId === 'system-webhook') return;

  const { orgIds, roles } = await getUserOrgContext(userId);

  // Check workflow creation
  if (query.includes('insert_workflows_one') || query.includes('insert_workflows')) {
    const targetOrgId = variables.org_id || variables.object?.org_id;
    if (targetOrgId) {
      if (!orgIds.includes(targetOrgId)) {
        throw new Error(`UNAUTHORIZED: Cannot create workflow for organization ${targetOrgId}. User is not a member.`);
      }
      const userRole = roles[targetOrgId];
      if (userRole === 'viewer') {
        throw new Error(`FORBIDDEN: Viewers are not allowed to create workflows in organization ${targetOrgId}.`);
      }
    }
  }

  // Check step mutations (insert_workflow_steps_one, update_workflow_steps_by_pk, delete_workflow_steps_by_pk)
  if (query.includes('workflow_steps')) {
    const stepWfId = variables.workflow_id || variables.object?.workflow_id;
    if (stepWfId) {
      const wfRes = await hasuraGraphQLRequest(`query GetWfOrg($id: uuid!) { workflows_by_pk(id: $id) { org_id } }`, { id: stepWfId });
      const wfOrgId = wfRes?.workflows_by_pk?.org_id;
      if (wfOrgId && !orgIds.includes(wfOrgId)) {
        throw new Error(`UNAUTHORIZED: Step mutation targets workflow ${stepWfId} outside user organizations.`);
      }
    }
  }
}
