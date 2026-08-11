import { NhostClient } from '@nhost/react';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
const region = process.env.NEXT_PUBLIC_NHOST_REGION || 'local';
const graphqlUrl = process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';

export const nhost = new NhostClient(
  subdomain && subdomain !== 'local'
    ? { subdomain, region }
    : {
        authUrl: 'http://localhost:8080/v1/auth',
        graphqlUrl: graphqlUrl,
        storageUrl: 'http://localhost:8080/v1/storage',
        functionsUrl: 'http://localhost:8080/v1/functions',
      }
);

// Demo User Accounts for Evaluation Quick Switcher
export const DEMO_USERS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'Alice (Org A Owner)',
    email: 'alice@orga.com',
    role: 'owner',
    orgId: '11111111-1111-1111-1111-111111111111',
    orgName: 'Acme AI Corp (Org A)',
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    name: 'Bob (Org A Editor)',
    email: 'bob@orga.com',
    role: 'editor',
    orgId: '11111111-1111-1111-1111-111111111111',
    orgName: 'Acme AI Corp (Org A)',
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    name: 'Charlie (Org A Viewer)',
    email: 'charlie@orga.com',
    role: 'viewer',
    orgId: '11111111-1111-1111-1111-111111111111',
    orgName: 'Acme AI Corp (Org A)',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'David (Org B Owner)',
    email: 'david@orgb.com',
    role: 'owner',
    orgId: '22222222-2222-2222-2222-222222222222',
    orgName: 'Stark Industries (Org B)',
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Eve (Org B Editor)',
    email: 'eve@orgb.com',
    role: 'editor',
    orgId: '22222222-2222-2222-2222-222222222222',
    orgName: 'Stark Industries (Org B)',
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'Frank (Org B Viewer)',
    email: 'frank@orgb.com',
    role: 'viewer',
    orgId: '22222222-2222-2222-2222-222222222222',
    orgName: 'Stark Industries (Org B)',
  },
];
