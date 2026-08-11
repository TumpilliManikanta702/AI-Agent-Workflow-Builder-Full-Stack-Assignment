'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../lib/nhost';
import { Building2, Shield, User } from 'lucide-react';

export function OrgSelector() {
  const { currentUser, currentOrg, switchUser } = useAuth();

  return (
    <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-sm">
      <Building2 className="w-4 h-4 text-cyan-400" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-200">{currentOrg.name}</span>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>User:</span>
          <select
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-slate-900 text-cyan-300 font-medium rounded border border-slate-700 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
          >
            {DEMO_USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
