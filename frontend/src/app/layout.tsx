import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Mini n8n-style workflow builder for chaining AI agent steps built with Nhost, Hasura, Next.js, PostgreSQL and Groq LLM API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
