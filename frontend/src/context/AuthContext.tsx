'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USERS } from '../lib/nhost';

export interface UserContextType {
  currentUser: typeof DEMO_USERS[0];
  currentOrg: { id: string; name: string; usageCalls: number; usageLimit: number; role: string };
  switchUser: (userId: string) => void;
  updateUsage: (calls: number, limit: number) => void;
}

const AuthContext = createContext<UserContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  const [currentOrg, setCurrentOrg] = useState({
    id: DEMO_USERS[0].orgId,
    name: DEMO_USERS[0].orgName,
    usageCalls: 12,
    usageLimit: 100,
    role: DEMO_USERS[0].role,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user_id');
    if (savedUser) {
      const found = DEMO_USERS.find((u) => u.id === savedUser);
      if (found) {
        setCurrentUser(found);
        setCurrentOrg({
          id: found.orgId,
          name: found.orgName,
          usageCalls: found.orgId === '11111111-1111-1111-1111-111111111111' ? 12 : 5,
          usageLimit: found.orgId === '11111111-1111-1111-1111-111111111111' ? 100 : 50,
          role: found.role,
        });
      }
    }
  }, []);

  const switchUser = (userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('demo_user_id', found.id);
      setCurrentOrg({
        id: found.orgId,
        name: found.orgName,
        usageCalls: found.orgId === '11111111-1111-1111-1111-111111111111' ? 12 : 5,
        usageLimit: found.orgId === '11111111-1111-1111-1111-111111111111' ? 100 : 50,
        role: found.role,
      });
    }
  };

  const updateUsage = (calls: number, limit: number) => {
    setCurrentOrg((prev) => ({ ...prev, usageCalls: calls, usageLimit: limit }));
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentOrg, switchUser, updateUsage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
