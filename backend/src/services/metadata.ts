import dotenv from 'dotenv';
dotenv.config();

const GRAPHQL_URL = process.env.HASURA_GRAPHQL_URL || process.env.NHOST_GRAPHQL_URL || process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
const METADATA_URL = process.env.HASURA_METADATA_URL || GRAPHQL_URL.replace(/\/v1\/graphql$/, '/v1/metadata');
const ADMIN_SECRET = (process.env.HASURA_GRAPHQL_ADMIN_SECRET && process.env.HASURA_GRAPHQL_ADMIN_SECRET.trim().length > 0)
  ? process.env.HASURA_GRAPHQL_ADMIN_SECRET.trim()
  : 'myadminsecretkey';

const RELATIONSHIP_OPERATIONS = [
  // 1. workflows.organization (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflows' },
      name: 'organization',
      using: { foreign_key_constraint_on: 'org_id' }
    }
  },
  // 2. workflows.workflow_steps (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflows' },
      name: 'workflow_steps',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'workflow_steps' },
          column: 'workflow_id'
        }
      }
    }
  },
  // 3. workflows.workflow_triggers (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflows' },
      name: 'workflow_triggers',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'workflow_triggers' },
          column: 'workflow_id'
        }
      }
    }
  },
  // 4. workflows.workflow_runs (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflows' },
      name: 'workflow_runs',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'workflow_runs' },
          column: 'workflow_id'
        }
      }
    }
  },
  // 5. workflow_runs.step_runs (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflow_runs' },
      name: 'step_runs',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'step_runs' },
          column: 'workflow_run_id'
        }
      }
    }
  },
  // 6. workflow_steps.workflow (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflow_steps' },
      name: 'workflow',
      using: { foreign_key_constraint_on: 'workflow_id' }
    }
  },
  // 7. workflow_triggers.workflow (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflow_triggers' },
      name: 'workflow',
      using: { foreign_key_constraint_on: 'workflow_id' }
    }
  },
  // 8. workflow_runs.workflow (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'workflow_runs' },
      name: 'workflow',
      using: { foreign_key_constraint_on: 'workflow_id' }
    }
  },
  // 9. step_runs.workflow_run (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'step_runs' },
      name: 'workflow_run',
      using: { foreign_key_constraint_on: 'workflow_run_id' }
    }
  },
  // 10. step_runs.workflow_step (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'step_runs' },
      name: 'workflow_step',
      using: { foreign_key_constraint_on: 'workflow_step_id' }
    }
  },
  // 11. organizations.workflows (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'organizations' },
      name: 'workflows',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'workflows' },
          column: 'org_id'
        }
      }
    }
  },
  // 12. organizations.org_members (array)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'organizations' },
      name: 'org_members',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'org_members' },
          column: 'org_id'
        }
      }
    }
  },
  // 13. org_members.organization (object)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'public', name: 'org_members' },
      name: 'organization',
      using: { foreign_key_constraint_on: 'org_id' }
    }
  }
];

export async function applyHasuraMetadata(): Promise<boolean> {
  try {
    console.log(`[Hasura Relationship Sync] Ensuring relationship metadata on ${METADATA_URL}...`);
    let addedCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const op of RELATIONSHIP_OPERATIONS) {
      try {
        const response = await fetch(METADATA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': ADMIN_SECRET,
          },
          body: JSON.stringify(op),
        });

        const result = await response.json();

        if (response.ok && !result.code) {
          addedCount++;
        } else if (result.code === 'already-exists' || result.code === 'already-tracked') {
          existingCount++;
        } else {
          console.warn(`[Hasura Relationship Warning] ${op.args.table.name}.${op.args.name}:`, result.error || result.message);
          errorCount++;
        }
      } catch (opErr: any) {
        console.error(`[Hasura Relationship Op Failed] ${op.args.table.name}.${op.args.name}:`, opErr.message);
        errorCount++;
      }
    }

    console.log(`[Hasura Relationship Sync Complete] Added: ${addedCount}, Existing: ${existingCount}, Errors: ${errorCount}`);
    return true;
  } catch (err: any) {
    console.error('[Hasura Relationship Sync Exception]:', err.message);
    return false;
  }
}
