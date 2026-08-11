import dotenv from 'dotenv';
dotenv.config();

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || process.env.NHOST_GRAPHQL_URL || process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

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

  if (resJson.errors && resJson.errors.length > 0) {
    const msg = resJson.errors.map((e: any) => e.message).join('; ');
    throw new Error(`Hasura GraphQL Error: ${msg}`);
  }

  return resJson.data;
}
