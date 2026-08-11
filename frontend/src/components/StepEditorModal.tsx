'use client';

import React, { useState, useEffect } from 'react';
import { X, Bot, Globe, GitFork, ShieldCheck, Database, Bell, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface StepConfigData {
  id?: string;
  name: string;
  type: string;
  step_order: number;
  config: Record<string, any>;
}

interface StepEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stepData: StepConfigData) => void;
  initialData?: StepConfigData | null;
  nextOrder: number;
}

export function StepEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  nextOrder,
}: StepEditorModalProps) {
  const { currentUser } = useAuth();
  const isOwner = currentUser.role === 'owner';

  const [name, setName] = useState('');
  const [type, setType] = useState('llm_call');
  const [stepOrder, setStepOrder] = useState(nextOrder);
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setStepOrder(initialData.step_order);
      setConfig(initialData.config || {});
    } else {
      setName('');
      setType('llm_call');
      setStepOrder(nextOrder);
      setConfig({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        prompt: 'Classify the following request as HIGH or LOW priority. Return exactly one word: HIGH or LOW. Request: {{input}}',
      });
    }
  }, [initialData, nextOrder, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === 'llm_call') {
      setConfig({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        prompt: 'Classify the following request as HIGH or LOW priority. Return exactly one word: HIGH or LOW. Request: {{input}}',
      });
    } else if (newType === 'http_request') {
      setConfig({
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        headers: {},
        body: {},
      });
    } else if (newType === 'conditional_branch') {
      setConfig({ condition: 'contains', value: 'HIGH' });
    } else if (newType === 'approval_gate') {
      setConfig({ message: 'Approval required before saving to database.' });
    } else if (newType === 'db_write') {
      setConfig({ target: 'workflow_results', data: { status: 'processed', flag: 'priority_recorded' } });
    } else if (newType === 'notify') {
      setConfig({ message: 'Workflow execution alert notification.' });
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initialData?.id,
      name,
      type,
      step_order: stepOrder,
      config,
    });
    onClose();
  };

  const isRestrictedForEditor = !isOwner && (type === 'db_write' || type === 'notify');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            {initialData ? 'Edit Step Configuration' : 'Add New Step'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Step Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Step Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Classify Customer Request"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Step Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Step Type
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'llm_call', label: 'LLM Call', icon: Bot, restricted: false },
                { id: 'http_request', label: 'HTTP Request', icon: Globe, restricted: false },
                { id: 'conditional_branch', label: 'Conditional Branch', icon: GitFork, restricted: false },
                { id: 'approval_gate', label: 'Approval Gate', icon: ShieldCheck, restricted: false },
                { id: 'db_write', label: 'DB Write', icon: Database, restricted: true },
                { id: 'notify', label: 'Notify', icon: Bell, restricted: true },
              ].map((item) => {
                const IconComponent = item.icon;
                const disabled = item.restricted && !isOwner;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTypeChange(item.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      type === item.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : disabled
                        ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.restricted && (
                      <span title="Owner Only">
                        <Lock className="w-3 h-3 text-amber-400 ml-auto shrink-0" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!isOwner && (
              <p className="text-[11px] text-amber-400/90 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Note: DB Write & Notify steps require OWNER role permissions.
              </p>
            )}
          </div>

          {/* Dynamic Configuration Fields */}
          <div className="pt-2 border-t border-slate-800">
            
            {/* LLM Call Fields */}
            {type === 'llm_call' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Provider</label>
                    <input
                      type="text"
                      value={config.provider || 'groq'}
                      onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Model</label>
                    <input
                      type="text"
                      value={config.model || 'llama-3.3-70b-versatile'}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Prompt Template</label>
                  <textarea
                    rows={3}
                    value={config.prompt || ''}
                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* HTTP Request Fields */}
            {type === 'http_request' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Method</label>
                    <select
                      value={config.method || 'GET'}
                      onChange={(e) => setConfig({ ...config, method: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1">URL Endpoint</label>
                    <input
                      type="text"
                      value={config.url || ''}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Branch Fields */}
            {type === 'conditional_branch' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Condition</label>
                    <select
                      value={config.condition || 'contains'}
                      onChange={(e) => setConfig({ ...config, condition: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                    >
                      <option value="contains">Contains String</option>
                      <option value="equals">Equals Exact Match</option>
                      <option value="not_equals">Does Not Equal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Target Value</label>
                    <input
                      type="text"
                      value={config.value || 'HIGH'}
                      onChange={(e) => setConfig({ ...config, value: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Approval Gate Fields */}
            {type === 'approval_gate' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Approval Prompt Message</label>
                <textarea
                  rows={2}
                  value={config.message || ''}
                  onChange={(e) => setConfig({ ...config, message: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                />
              </div>
            )}

            {/* DB Write Fields */}
            {type === 'db_write' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Table</label>
                  <input
                    type="text"
                    value={config.target || 'workflow_results'}
                    onChange={(e) => setConfig({ ...config, target: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {/* Notify Fields */}
            {type === 'notify' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notification Message</label>
                <input
                  type="text"
                  value={config.message || ''}
                  onChange={(e) => setConfig({ ...config, message: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                />
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isRestrictedForEditor}
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              isRestrictedForEditor
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
            }`}
          >
            Save Step
          </button>
        </div>

      </div>
    </div>
  );
}
