const HASURA_URL = process.env.HASURA_URL || 'http://localhost:8080/v1/graphql';
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

async function testGraphQL(query, variables, headers = {}) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });
  return await response.json();
}

async function runTests() {
  console.log('=== TEST 1: Query Workflows for Alice (Org A Owner) ===');
  const aliceRes = await testGraphQL(
    `query { workflows { id name org_id } }`,
    {},
    { 'x-hasura-role': 'user', 'x-hasura-user-id': 'a1111111-1111-1111-1111-111111111111' }
  );
  console.log('Alice Workflows:', JSON.stringify(aliceRes, null, 2));

  console.log('\n=== TEST 2: Create Workflow for Alice (Org A Owner) ===');
  const createAliceRes = await testGraphQL(
    `mutation CreateWf($org_id: uuid!, $name: String!, $created_by: uuid!) {
      insert_workflows_one(object: { org_id: $org_id, name: $name, created_by: $created_by }) {
        id
        name
        org_id
      }
    }`,
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Alice Test Workflow',
      created_by: 'a1111111-1111-1111-1111-111111111111',
    },
    { 'x-hasura-role': 'user', 'x-hasura-user-id': 'a1111111-1111-1111-1111-111111111111' }
  );
  console.log('Alice Create Result:', JSON.stringify(createAliceRes, null, 2));

  console.log('\n=== TEST 3: Attempt Create Workflow for Charlie (Org A Viewer) ===');
  const charlieRes = await testGraphQL(
    `mutation CreateWf($org_id: uuid!, $name: String!, $created_by: uuid!) {
      insert_workflows_one(object: { org_id: $org_id, name: $name, created_by: $created_by }) {
        id
      }
    }`,
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Charlie Unauthorized Workflow',
      created_by: 'a3333333-3333-3333-3333-333333333333',
    },
    { 'x-hasura-role': 'user', 'x-hasura-user-id': 'a3333333-3333-3333-3333-333333333333' }
  );
  console.log('Charlie (Viewer) Create Result:', JSON.stringify(charlieRes, null, 2));

  console.log('\n=== TEST 4: Attempt Create Workflow for David (Org B Owner) in Org A ===');
  const davidRes = await testGraphQL(
    `mutation CreateWf($org_id: uuid!, $name: String!, $created_by: uuid!) {
      insert_workflows_one(object: { org_id: $org_id, name: $name, created_by: $created_by }) {
        id
      }
    }`,
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'David Attack Workflow in Org A',
      created_by: 'b1111111-1111-1111-1111-111111111111',
    },
    { 'x-hasura-role': 'user', 'x-hasura-user-id': 'b1111111-1111-1111-1111-111111111111' }
  );
  console.log('David (Org B Owner in Org A) Create Result:', JSON.stringify(davidRes, null, 2));
}

runTests().catch(console.error);
