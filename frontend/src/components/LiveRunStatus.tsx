'use client';

import React, { useState, useEffect } from 'react';
import { executeGraphQL, actionApproveStep, STEP_RUNS_SUBSCRIPTION_QUERY } from '../lib/graphql';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Clock, PauseCircle, XCircle, PlayCircle, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

interface StepRunItem {
  id: string;
  workflow_step_id: string;
  status: string;
  input: any;
  output: any;
  error?: string;
  attempt_count: number;
  approved_by?: string;
  approved_at?: string;
  workflow_step?: {
    id: string;
    name: string;
    type: string;
    step_order: number;
  };
}

interface LiveRunStatusProps {
  workflowRunId: string | null;
  workflowSteps: any[];
  onExecutionCompleted?: () => void;
}

export function LiveRunStatus({
  workflowRunId,
  workflowSteps,
  onExecutionCompleted,
}: LiveRunStatusProps) {
  const { currentUser } = useAuth();
  const isAuthorizedToApprove = currentUser.role === 'owner' || currentUser.role === 'editor';

  const [stepRuns, setStepRuns] = useState<StepRunItem[]>([]);
  const [runStatus, setRunStatus] = useState<string>('running');
  const [approvingStepId, setApprovingStepId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Poll step runs for live updates
  useEffect(() => {
    if (!workflowRunId) return;

    let isMounted = true;
    const fetchLiveState = async () => {
      try {
        const query = `
          query GetLiveStepRuns($runId: uuid!) {
            workflow_runs_by_pk(id: $runId) {
              id
              status
              error
              step_runs(order_by: { created_at: asc }) {
                id
                workflow_step_id
                status
                input
                output
                error
                attempt_count
                approved_by
                approved_at
                started_at
                completed_at
              }
            }
          }
        `;
        const data = await executeGraphQL(query, { runId: workflowRunId }, currentUser.id);
        if (isMounted && data.workflow_runs_by_pk) {
          setRunStatus(data.workflow_runs_by_pk.status);
          setStepRuns(data.workflow_runs_by_pk.step_runs || []);

          if (data.workflow_runs_by_pk.status === 'completed' && onExecutionCompleted) {
            onExecutionCompleted();
          }
        }
      } catch (err) {
        console.error('[Subscription/Poll Error]:', err);
      }
    };

    fetchLiveState();
    const interval = setInterval(fetchLiveState, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [workflowRunId, currentUser.id]);

  if (!workflowRunId) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
        Click <strong className="text-cyan-400 font-semibold">Run Workflow</strong> to execute this workflow pipeline live.
      </div>
    );
  }

  const handleApprove = async (stepRunId: string) => {
    setApprovingStepId(stepRunId);
    setApprovalError(null);
    try {
      await actionApproveStep(stepRunId, currentUser.id);
    } catch (err: any) {
      setApprovalError(err.message || 'Approval failed.');
    } finally {
      setApprovingStepId(null);
    }
  };

  const getStepStatus = (stepId: string) => {
    const sr = stepRuns.find((r) => r.workflow_step_id === stepId);
    if (!sr) return { status: 'pending', sr: null };
    return { status: sr.status, sr };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header Run Status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Live Workflow Execution</span>
          <h4 className="text-base font-bold text-slate-100 font-mono mt-0.5">Run ID: {workflowRunId.slice(0, 8)}...</h4>
        </div>
        <div>
          {runStatus === 'running' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> RUNNING
            </span>
          )}
          {runStatus === 'paused' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <PauseCircle className="w-3.5 h-3.5" /> PAUSED — AWAITING APPROVAL
            </span>
          )}
          {runStatus === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
            </span>
          )}
          {runStatus === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <XCircle className="w-3.5 h-3.5" /> FAILED
            </span>
          )}
        </div>
      </div>

      {/* Approval Error Banner if any */}
      {approvalError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{approvalError}</span>
        </div>
      )}

      {/* Steps Live Status Timeline */}
      <div className="space-y-3">
        {workflowSteps.map((step, idx) => {
          const { status, sr } = getStepStatus(step.id);

          return (
            <div
              key={step.id}
              className={`p-4 rounded-xl border transition-all ${
                status === 'completed'
                  ? 'bg-slate-800/40 border-slate-700/60'
                  : status === 'running'
                  ? 'bg-cyan-950/20 border-cyan-700/60 shadow-lg shadow-cyan-500/5'
                  : status === 'paused'
                  ? 'bg-amber-950/30 border-amber-600/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : status === 'failed'
                  ? 'bg-rose-950/30 border-rose-800'
                  : 'bg-slate-950/30 border-slate-800/80 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Status Indicator Icon */}
                  {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {status === 'running' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />}
                  {status === 'paused' && <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />}
                  {status === 'failed' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  {status === 'pending' && <Clock className="w-5 h-5 text-slate-600 shrink-0" />}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400">Step {idx + 1}</span>
                      <h5 className="text-sm font-semibold text-slate-100">{step.name}</h5>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {step.type}
                      </span>
                    </div>

                    {/* Step Run Output Preview */}
                    {sr?.output && (
                      <pre className="mt-2 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-cyan-300 font-mono max-h-24 overflow-y-auto">
                        {JSON.stringify(sr.output, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Status Label & Action */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    {status === 'completed' && <span className="text-emerald-400">COMPLETED</span>}
                    {status === 'running' && <span className="text-cyan-400">RUNNING</span>}
                    {status === 'paused' && <span className="text-amber-400">AWAITING APPROVAL</span>}
                    {status === 'failed' && <span className="text-rose-400">FAILED</span>}
                    {status === 'pending' && <span className="text-slate-600">PENDING</span>}
                  </span>

                  {/* Interactive Approve Button when paused */}
                  {status === 'paused' && sr && (
                    <button
                      onClick={() => handleApprove(sr.id)}
                      disabled={approvingStepId === sr.id || !isAuthorizedToApprove}
                      title={!isAuthorizedToApprove ? 'Only Owner or Editor can approve' : 'Approve workflow continuation'}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                        !isAuthorizedToApprove
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      {approvingStepId === sr.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Approve Step
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
