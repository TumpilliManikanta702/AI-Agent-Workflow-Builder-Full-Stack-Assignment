import dotenv from 'dotenv';
dotenv.config();

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || process.env.NHOST_GRAPHQL_URL || process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = (process.env.HASURA_GRAPHQL_ADMIN_SECRET && process.env.HASURA_GRAPHQL_ADMIN_SECRET.trim().length > 0)
  ? process.env.HASURA_GRAPHQL_ADMIN_SECRET.trim()
  : 'myadminsecretkey';

export async function hasuraGraphQLRequest<T = any>(
  query: string,
  variables: Record<string, any> = {},
  headers: Record<string, string> = {}
): Promise<T> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    ...headers
  };

  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify({ query, variables }),
  });

  const resJson = await response.json();

  if (!response.ok) {
    console.error(`[Hasura HTTP Error] Status ${response.status} from ${HASURA_URL}:`, JSON.stringify(resJson));
    throw new Error(`Hasura HTTP ${response.status}: ${resJson.message || 'Request failed'}`);
  }

  if (resJson.errors && resJson.errors.length > 0) {
    const msg = resJson.errors.map((e: any) => e.message).join('; ');
    console.error(`[Hasura GraphQL Error] Query execution failed: ${msg}`);
    throw new Error(`Hasura GraphQL Error: ${msg}`);
  }

  return resJson.data;
}
