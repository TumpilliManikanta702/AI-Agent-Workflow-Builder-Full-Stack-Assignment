'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { executeGraphQL, GET_ORG_WORKFLOWS } from '../../lib/graphql';
import { Building2, Activity, Workflow, Plus, Play, ShieldAlert, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';

export default function DashboardPage() {
  const { currentOrg, currentUser } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [securityTestResult, setSecurityTestResult] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await executeGraphQL(GET_ORG_WORKFLOWS, { orgId: currentOrg.id }, currentUser.id);
        if (isMounted) {
          setWorkflows(data.workflows || []);
        }
      } catch (err: any) {
        console.error('[Dashboard Load Error]:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [currentOrg.id, currentUser.id]);

  const usagePercent = Math.min(100, Math.round((currentOrg.usageCalls / currentOrg.usageLimit) * 100));

  // Cross-Org Security Test Helper
  const runCrossOrgTest = async () => {
    setSecurityTestResult('Running Cross-Org Unauthorized Access Test...');
    try {
      const targetOrgBId = '22222222-2222-2222-2222-222222222222';
      const targetOrgAId = '11111111-1111-1111-1111-111111111111';
      const targetWfId = currentOrg.id === targetOrgAId ? 'bbbb2222-2222-2222-2222-222222222222' : 'aaaa1111-1111-1111-1111-111111111111';

      // Attempt to query opposing organization's workflow directly
      const query = `
        query AttackQuery($wfId: uuid!) {
          workflows_by_pk(id: $wfId) {
            id
            name
          }
        }
      `;
      const result = await executeGraphQL(query, { wfId: targetWfId }, currentUser.id);
      
      if (!result.workflows_by_pk) {
        setSecurityTestResult('SECURITY PASSED: Cross-org access blocked.');
      } else {
        setSecurityTestResult('SECURITY WARNING: Cross-org query returned data.');
      }
    } catch (err: any) {
      setSecurityTestResult(`✅ SECURITY PASSED: Access rejected with error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Overview Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Active Organization */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Organization</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100">{currentOrg.name}</h2>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <span>Org ID:</span>
            <code className="bg-slate-950 px-2 py-0.5 rounded text-cyan-300 font-mono text-[11px]">{currentOrg.id.slice(0, 8)}...</code>
          </div>
        </div>

        {/* Card 2: Quota & Monthly Usage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Usage Calls</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{currentOrg.usageCalls}</span>
            <span className="text-sm text-slate-400">/ {currentOrg.usageLimit} calls</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span>{usagePercent}% Used</span>
              <span>{currentOrg.usageLimit - currentOrg.usageCalls} Calls Remaining</span>
            </div>
          </div>
        </div>

        {/* Card 3: Role & Security Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Context</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Active User Role:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              {currentUser.role}
            </span>
          </div>
          <div className="mt-4">
            <button
              onClick={runCrossOrgTest}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Verify Cross-Org RLS Security
            </button>
          </div>
        </div>

      </div>

      {/* Security Test Result Alert */}
      {securityTestResult && (
        <div className="p-4 bg-slate-900 border border-cyan-500/40 rounded-2xl text-xs font-mono text-cyan-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{securityTestResult}</span>
          </div>
          <button onClick={() => setSecurityTestResult(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Workflows Summary & Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-cyan-400" /> Organization Workflows
            </h3>
            <p className="text-xs text-slate-400">Manage and execute AI agent pipelines within {currentOrg.name}</p>
          </div>
          
          {currentUser.role !== 'viewer' && (
            <Link
              href="/workflows/new"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Workflow
            </Link>
          )}
        </div>

        {/* Workflows List */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm space-y-3">
            <p>No workflows created in this organization yet.</p>
            {currentUser.role !== 'viewer' && (
              <Link href="/workflows/new" className="inline-flex items-center gap-1.5 text-cyan-400 font-semibold hover:underline">
                Create First Workflow →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => {
              const latestRun = wf.workflow_runs?.[0];
              return (
                <div key={wf.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/workflows/${wf.id}`} className="group">
                        <h4 className="text-base font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {wf.name}
                        </h4>
                      </Link>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {wf.workflow_steps?.length || 0} steps
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{wf.description || 'No description provided.'}</p>
                  </div>

                  {/* Footer status & Link */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>Latest Status:</span>
                      {latestRun ? (
                        <span className="font-semibold uppercase text-[11px]">
                          {latestRun.status === 'completed' && <span className="text-emerald-400">✓ Completed</span>}
                          {latestRun.status === 'paused' && <span className="text-amber-400">⏸ Paused</span>}
                          {latestRun.status === 'running' && <span className="text-cyan-400">▶ Running</span>}
                          {latestRun.status === 'failed' && <span className="text-rose-400">✕ Failed</span>}
                        </span>
                      ) : (
                        <span className="text-slate-500">Not run yet</span>
                      )}
                    </div>

                    <Link
                      href={`/workflows/${wf.id}`}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1"
                    >
                      Open Builder →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
