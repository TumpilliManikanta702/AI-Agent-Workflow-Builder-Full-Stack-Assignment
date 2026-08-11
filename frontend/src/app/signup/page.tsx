'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { DEMO_USERS } from '../../lib/nhost';
import { Cpu, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { switchUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    switchUser(DEMO_USERS[0].id);
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/20 mb-2">
          <Cpu className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Create Account</h1>
        <p className="text-sm text-slate-400">Join AgentFlow and build AI Agent workflows</p>
      </div>

      <form onSubmit={handleSignup} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Organization Name</label>
          <input
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme AI Corp"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Work Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@acme.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Password</label>
          <input
            type="password"
            required
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
          Create Account <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-slate-400 pt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
