'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { executeGraphQL, GET_ORG_WORKFLOWS } from '../../lib/graphql';
import { Workflow, Plus, ArrowRight, ShieldAlert } from 'lucide-react';

export default function WorkflowsListPage() {
  const { currentOrg, currentUser } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchWorkflows() {
      setLoading(true);
      try {
        const data = await executeGraphQL(GET_ORG_WORKFLOWS, { orgId: currentOrg.id }, currentUser.id);
        if (isMounted) {
          setWorkflows(data.workflows || []);
        }
      } catch (err) {
        console.error('[Fetch Workflows Error]:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchWorkflows();
    return () => { isMounted = false; };
  }, [currentOrg.id, currentUser.id]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-cyan-400" /> Workflows
          </h1>
          <p className="text-sm text-slate-400">All workflow pipelines configured for {currentOrg.name}</p>
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

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
          <p className="text-slate-400 text-sm">No workflows found in {currentOrg.name}.</p>
          {currentUser.role !== 'viewer' && (
            <Link
              href="/workflows/new"
              className="inline-flex items-center gap-2 text-cyan-400 font-semibold text-sm hover:underline"
            >
              Create New Workflow <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex items-center justify-between transition-all"
            >
              <div className="space-y-1">
                <Link href={`/workflows/${wf.id}`} className="text-base font-bold text-slate-100 hover:text-cyan-400 transition-colors">
                  {wf.name}
                </Link>
                <p className="text-xs text-slate-400 line-clamp-1">{wf.description || 'No description'}</p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                  <span>ID: {wf.id.slice(0, 8)}...</span>
                  <span>•</span>
                  <span>{wf.workflow_steps?.length || 0} Steps</span>
                  <span>•</span>
                  <span>Triggers: {wf.workflow_triggers?.map((t: any) => t.trigger_type).join(', ') || 'manual'}</span>
                </div>
              </div>

              <Link
                href={`/workflows/${wf.id}`}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1"
              >
                Configure <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
