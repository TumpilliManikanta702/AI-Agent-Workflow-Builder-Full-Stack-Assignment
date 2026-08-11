'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrgSelector } from './OrgSelector';
import { useAuth } from '../context/AuthContext';
import { Cpu, Activity, LayoutDashboard, Workflow, ShieldAlert } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentOrg, currentUser } = useAuth();

  const roleColors: Record<string, string> = {
    owner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    editor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    viewer: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AgentFlow
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/workflows"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/workflows')
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Workflow className="w-4 h-4" />
              Workflows
            </Link>
          </nav>
        </div>

        {/* Right Info: Org Selector, Role & Usage Pill */}
        <div className="flex items-center gap-4">
          
          {/* Monthly Usage Pill */}
          <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/80 rounded-full px-3.5 py-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">
              Usage: <strong className="text-white">{currentOrg.usageCalls}</strong> / {currentOrg.usageLimit}
            </span>
          </div>

          {/* Role Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              roleColors[currentUser.role] || 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {currentUser.role}
          </div>

          {/* Org Selector */}
          <OrgSelector />
        </div>
      </div>
    </header>
  );
}
