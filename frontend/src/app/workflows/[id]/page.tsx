'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { executeGraphQL, actionTriggerWorkflowRun, GET_WORKFLOW_DETAIL } from '../../../lib/graphql';
import { StepEditorModal, StepConfigData } from '../../../components/StepEditorModal';
import { LiveRunStatus } from '../../../components/LiveRunStatus';
import {
  Workflow as WorkflowIcon,
  ArrowLeft,
  Plus,
  Play,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Bot,
  Globe,
  GitFork,
  ShieldCheck,
  Database,
  Bell,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { currentOrg, currentUser } = useAuth();

  const isOwner = currentUser.role === 'owner';
  const isEditor = currentUser.role === 'editor';
  const canModify = isOwner || isEditor;

  const [workflow, setWorkflow] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Execution State
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepConfigData | null>(null);

  // Copy Webhook Curl state
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchWorkflowDetails = async () => {
    try {
      const data = await executeGraphQL(GET_WORKFLOW_DETAIL, { workflowId }, currentUser.id);
      const wf = data?.workflows_by_pk;
      if (wf) {
        // Application-level multi-tenant security check:
        // Ensure the workflow belongs to the user's current organization
        if (currentOrg?.id && wf.org_id && wf.org_id !== currentOrg.id) {
          console.warn(`[Tenant Boundary Warning]: Workflow ${workflowId} belongs to org ${wf.org_id}, active org is ${currentOrg.id}`);
          setWorkflow(null);
          return;
        }
        setWorkflow(wf);
        setSteps(wf.workflow_steps || []);
        setTriggers(wf.workflow_triggers || []);

        if (wf.workflow_runs && wf.workflow_runs.length > 0) {
          const latest = wf.workflow_runs[0];
          if (['running', 'paused'].includes(latest.status)) {
            setActiveRunId(latest.id);
          }
        }
      } else {
        setWorkflow(null);
      }
    } catch (err: any) {
      console.error('[Fetch Workflow Detail Error]:', err);
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      fetchWorkflowDetails();
    }
  }, [workflowId, currentUser.id, currentOrg.id]);

  const handleRunWorkflow = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await actionTriggerWorkflowRun(workflowId, currentUser.id, {
        request: 'Customer asks for urgent support ticket triage',
      });
      setActiveRunId(res.workflow_run_id);
    } catch (err: any) {
      setRunError(err.message || 'Workflow execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveStep = async (stepData: StepConfigData) => {
    try {
      if (stepData.id) {
        // Update existing step
        const mutation = `
          mutation UpdateStep($id: uuid!, $name: String!, $config: jsonb!) {
            update_workflow_steps_by_pk(pk_columns: { id: $id }, _set: { name: $name, config: $config }) {
              id
            }
          }
        `;
        await executeGraphQL(mutation, { id: stepData.id, name: stepData.name, config: stepData.config }, currentUser.id);
      } else {
        // Create new step
        const mutation = `
          mutation CreateStep($workflow_id: uuid!, $name: String!, $type: String!, $step_order: Int!, $config: jsonb!) {
            insert_workflow_steps_one(object: {
              workflow_id: $workflow_id,
              name: $name,
              type: $type,
              step_order: $step_order,
              config: $config
            }) { id }
          }
        `;
        await executeGraphQL(
          mutation,
          {
            workflow_id: workflowId,
            name: stepData.name,
            type: stepData.type,
            step_order: stepData.step_order,
            config: stepData.config,
          },
          currentUser.id
        );
      }
      fetchWorkflowDetails();
    } catch (err: any) {
      alert(`Error saving step: ${err.message}`);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;
    try {
      const mutation = `
        mutation DeleteStep($id: uuid!) {
          delete_workflow_steps_by_pk(id: $id) { id }
        }
      `;
      await executeGraphQL(mutation, { id: stepId }, currentUser.id);
      fetchWorkflowDetails();
    } catch (err: any) {
      alert(`Delete step failed: ${err.message}`);
    }
  };

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const currentStep = steps[index];
    const targetStep = steps[targetIndex];

    try {
      const mutation = `
        mutation SwapOrders($id1: uuid!, $order1: Int!, $id2: uuid!, $order2: Int!) {
          u1: update_workflow_steps_by_pk(pk_columns: { id: $id1 }, _set: { step_order: $order1 }) { id }
          u2: update_workflow_steps_by_pk(pk_columns: { id: $id2 }, _set: { step_order: $order2 }) { id }
        }
      `;
      await executeGraphQL(
        mutation,
        {
          id1: currentStep.id,
          order1: targetStep.step_order,
          id2: targetStep.id,
          order2: currentStep.step_order,
        },
        currentUser.id
      );
      fetchWorkflowDetails();
    } catch (err: any) {
      alert(`Reorder failed: ${err.message}`);
    }
  };

  const stepIcons: Record<string, any> = {
    llm_call: Bot,
    http_request: Globe,
    conditional_branch: GitFork,
    approval_gate: ShieldCheck,
    db_write: Database,
    notify: Bell,
  };

  const webhookTrigger = triggers.find((t) => t.trigger_type === 'webhook');
  const webhookToken = webhookTrigger?.config?.token || 'demo-webhook-secret-token-123';
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const curlCommand = `curl -X POST ${backendBase}/api/webhook/trigger \\
  -H "Content-Type: application/json" \\
  -d '{"workflow_id": "${workflowId}", "token": "${webhookToken}", "input": {"request": "Customer ticket triage"}}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading workflow builder...</div>;
  }

  if (!workflow) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <h3 className="text-lg font-bold text-rose-400">Workflow Not Found or Unauthorized</h3>
        <p className="text-xs text-slate-400">Hasura Row-Level Security prevented access to this workflow ID.</p>
        <button onClick={() => router.push('/workflows')} className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold text-cyan-300">
          Back to Workflows
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workflows')} className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{workflow.name}</h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                {steps.length} Steps
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{workflow.description || 'No description provided.'}</p>
          </div>
        </div>

        {/* Action Run Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunWorkflow}
            disabled={running || !canModify}
            title={!canModify ? 'Only Owner or Editor can run workflow' : 'Execute workflow pipeline'}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
              !canModify
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-95'
            }`}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Run Workflow
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {runError && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {/* Main Grid: Builder Pipeline on Left, Execution Status & Webhook on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Step Builder (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-cyan-400" /> Pipeline Steps
            </h3>
            {canModify && (
              <button
                onClick={() => {
                  setEditingStep(null);
                  setModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            )}
          </div>

          {/* Steps List */}
          {steps.length === 0 ? (
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs space-y-3">
              <p>No steps configured for this workflow yet.</p>
              {canModify && (
                <button
                  onClick={() => {
                    setEditingStep(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-cyan-400 font-semibold hover:underline"
                >
                  Add First Step →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const IconComponent = stepIcons[step.type] || WorkflowIcon;
                return (
                  <div
                    key={step.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 shadow-md flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500 w-5 text-center">#{idx + 1}</span>
                      <div className="p-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-cyan-400">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">{step.name}</h4>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {step.type}
                        </span>
                      </div>
                    </div>

                    {/* Step Actions: Reorder, Edit, Delete */}
                    {canModify && (
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === steps.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingStep(step);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inbound Webhook Configuration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Webhook Trigger API Endpoint
              </span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCurl ? 'Copied' : 'Copy Curl'}
              </button>
            </div>
            <p className="text-xs text-slate-400">Trigger this workflow externally via API webhook request:</p>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {curlCommand}
            </pre>
          </div>

        </div>

        {/* Right Column: Live Run Subscription View (5 Cols) */}
        <div className="lg:col-span-5">
          <LiveRunStatus
            workflowRunId={activeRunId}
            workflowSteps={steps}
            onExecutionCompleted={fetchWorkflowDetails}
          />
        </div>

      </div>

      {/* Step Editor Modal */}
      <StepEditorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveStep}
        initialData={editingStep}
        nextOrder={steps.length + 1}
      />

    </div>
  );
}
