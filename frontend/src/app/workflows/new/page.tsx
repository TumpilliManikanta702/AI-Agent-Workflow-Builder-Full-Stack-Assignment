'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { executeGraphQL } from '../../../lib/graphql';
import { Workflow, ArrowLeft, Plus } from 'lucide-react';

export default function NewWorkflowPage() {
  const router = useRouter();
  const { currentOrg, currentUser } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (currentUser.role === 'viewer') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <h3 className="text-lg font-bold text-rose-400">Unauthorized Role</h3>
        <p className="text-xs text-slate-400">Viewers do not have permission to create workflows.</p>
        <button onClick={() => router.push('/workflows')} className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold text-cyan-300">
          Back to Workflows
        </button>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const mutation = `
        mutation CreateWorkflow($org_id: uuid!, $name: String!, $description: String, $created_by: uuid!) {
          insert_workflows_one(object: {
            org_id: $org_id,
            name: $name,
            description: $description,
            created_by: $created_by
          }) {
            id
          }
        }
      `;

      const res = await executeGraphQL(
        mutation,
        {
          org_id: currentOrg.id,
          name,
          description,
          created_by: currentUser.id,
        },
        currentUser.id
      );

      const newId = res.insert_workflows_one.id;

      // Add default manual trigger
      await executeGraphQL(
        `
          mutation AddDefaultTrigger($workflow_id: uuid!) {
            insert_workflow_triggers_one(object: {
              workflow_id: $workflow_id,
              trigger_type: "manual",
              config: {}
            }) { id }
          }
        `,
        { workflow_id: newId },
        currentUser.id
      );

      router.push(`/workflows/${newId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/workflows')} className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Create New Workflow</h1>
          <p className="text-xs text-slate-400">Target Organization: {currentOrg.name}</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Workflow Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lead Qualification Agent Pipeline"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workflow automates..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/workflows')}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create & Configure Steps
          </button>
        </div>
      </form>

    </div>
  );
}
