'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { DEMO_USERS } from '../../lib/nhost';
import { Cpu, ShieldCheck, UserCheck, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { switchUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default fallback to Alice Org A Owner
    switchUser(DEMO_USERS[0].id);
    router.push('/dashboard');
  };

  const handleSelectDemoUser = (userId: string) => {
    switchUser(userId);
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-8">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/20 mb-2">
          <Cpu className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Sign in to AgentFlow</h1>
        <p className="text-sm text-slate-400">AI Agent Workflow Builder with Hasura & Nhost Auth</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleCustomLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@organization.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          Sign In <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Demo Evaluation Quick Switcher */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Evaluation Quick Switcher (Instant Demo Access)</span>
        </div>
        <p className="text-xs text-slate-400">Select any pre-configured seed identity to test cross-org permissions and roles:</p>
        
        <div className="grid grid-cols-1 gap-2 pt-1">
          {DEMO_USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectDemoUser(user.id)}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all group"
            >
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">{user.name}</div>
                <div className="text-[11px] text-slate-400">{user.orgName}</div>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                user.role === 'owner' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                user.role === 'editor' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-blue-500/20 text-blue-400 border-blue-500/40'
              }`}>
                {user.role}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
