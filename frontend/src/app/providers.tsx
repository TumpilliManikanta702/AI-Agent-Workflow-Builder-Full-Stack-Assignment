'use client';

import React from 'react';
import { NhostProvider } from '@nhost/react';
import { nhost } from '../lib/nhost';
import { AuthProvider } from '../context/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NhostProvider nhost={nhost}>
      <AuthProvider>{children}</AuthProvider>
    </NhostProvider>
  );
}
