const HASURA_URL = process.env.HASURA_URL || 'http://localhost:8080/v1/metadata';
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

const metadataPayload = {
  type: 'replace_metadata',
  version: 2,
  args: {
    allow_list: [],
    metadata: {
      version: 3,
      sources: [
        {
          name: 'default',
          kind: 'postgres',
          configuration: {
            connection_info: {
              database_url: {
                from_env: 'HASURA_GRAPHQL_DATABASE_URL'
              },
              isolation_level: 'read-committed',
              use_prepared_statements: true
            }
          },
          tables: [
            {
              table: { schema: 'public', name: 'organizations' },
              array_relationships: [
                {
                  name: 'org_members',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'org_id',
                      table: { schema: 'public', name: 'org_members' }
                    }
                  }
                },
                {
                  name: 'workflows',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'org_id',
                      table: { schema: 'public', name: 'workflows' }
                    }
                  }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'name', 'usage_calls', 'usage_limit', 'created_at'],
                    filter: {
                      org_members: {
                        user_id: { _eq: 'X-Hasura-User-Id' }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'org_members' },
              object_relationships: [
                {
                  name: 'organization',
                  using: { foreign_key_constraint_on: 'org_id' }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'org_id', 'user_id', 'role', 'created_at'],
                    filter: {
                      organization: {
                        org_members: {
                          user_id: { _eq: 'X-Hasura-User-Id' }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'workflows' },
              object_relationships: [
                {
                  name: 'organization',
                  using: { foreign_key_constraint_on: 'org_id' }
                }
              ],
              array_relationships: [
                {
                  name: 'workflow_steps',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'workflow_id',
                      table: { schema: 'public', name: 'workflow_steps' }
                    }
                  }
                },
                {
                  name: 'workflow_triggers',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'workflow_id',
                      table: { schema: 'public', name: 'workflow_triggers' }
                    }
                  }
                },
                {
                  name: 'workflow_runs',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'workflow_id',
                      table: { schema: 'public', name: 'workflow_runs' }
                    }
                  }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'org_id', 'name', 'description', 'created_by', 'created_at', 'updated_at'],
                    filter: {
                      organization: {
                        org_members: {
                          user_id: { _eq: 'X-Hasura-User-Id' }
                        }
                      }
                    }
                  }
                }
              ],
              insert_permissions: [
                {
                  role: 'user',
                  permission: {
                    check: {
                      organization: {
                        org_members: {
                          _and: [
                            { user_id: { _eq: 'X-Hasura-User-Id' } },
                            { role: { _in: ['owner', 'editor'] } }
                          ]
                        }
                      }
                    },
                    columns: ['id', 'org_id', 'name', 'description', 'created_by']
                  }
                }
              ],
              update_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['name', 'description', 'updated_at'],
                    filter: {
                      organization: {
                        org_members: {
                          _and: [
                            { user_id: { _eq: 'X-Hasura-User-Id' } },
                            { role: { _in: ['owner', 'editor'] } }
                          ]
                        }
                      }
                    }
                  }
                }
              ],
              delete_permissions: [
                {
                  role: 'user',
                  permission: {
                    filter: {
                      organization: {
                        org_members: {
                          _and: [
                            { user_id: { _eq: 'X-Hasura-User-Id' } },
                            { role: { _eq: 'owner' } }
                          ]
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'workflow_steps' },
              object_relationships: [
                {
                  name: 'workflow',
                  using: { foreign_key_constraint_on: 'workflow_id' }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'workflow_id', 'name', 'step_order', 'type', 'config', 'created_at', 'updated_at'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            user_id: { _eq: 'X-Hasura-User-Id' }
                          }
                        }
                      }
                    }
                  }
                }
              ],
              insert_permissions: [
                {
                  role: 'user',
                  permission: {
                    check: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    },
                    columns: ['id', 'workflow_id', 'name', 'step_order', 'type', 'config']
                  }
                }
              ],
              update_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['name', 'step_order', 'type', 'config', 'updated_at'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              ],
              delete_permissions: [
                {
                  role: 'user',
                  permission: {
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'workflow_triggers' },
              object_relationships: [
                {
                  name: 'workflow',
                  using: { foreign_key_constraint_on: 'workflow_id' }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'workflow_id', 'trigger_type', 'config', 'enabled', 'created_at'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            user_id: { _eq: 'X-Hasura-User-Id' }
                          }
                        }
                      }
                    }
                  }
                }
              ],
              insert_permissions: [
                {
                  role: 'user',
                  permission: {
                    check: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    },
                    columns: ['id', 'workflow_id', 'trigger_type', 'config', 'enabled']
                  }
                }
              ],
              update_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['trigger_type', 'config', 'enabled'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              ],
              delete_permissions: [
                {
                  role: 'user',
                  permission: {
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            _and: [
                              { user_id: { _eq: 'X-Hasura-User-Id' } },
                              { role: { _in: ['owner', 'editor'] } }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'workflow_runs' },
              object_relationships: [
                {
                  name: 'workflow',
                  using: { foreign_key_constraint_on: 'workflow_id' }
                }
              ],
              array_relationships: [
                {
                  name: 'step_runs',
                  using: {
                    foreign_key_constraint_on: {
                      column: 'workflow_run_id',
                      table: { schema: 'public', name: 'step_runs' }
                    }
                  }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'workflow_id', 'status', 'trigger_type', 'created_by', 'started_at', 'completed_at', 'error', 'created_at'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            user_id: { _eq: 'X-Hasura-User-Id' }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'step_runs' },
              object_relationships: [
                {
                  name: 'workflow_run',
                  using: { foreign_key_constraint_on: 'workflow_run_id' }
                },
                {
                  name: 'workflow_step',
                  using: { foreign_key_constraint_on: 'workflow_step_id' }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'workflow_run_id', 'workflow_step_id', 'status', 'input', 'output', 'error', 'attempt_count', 'approved_by', 'approved_at', 'started_at', 'completed_at', 'created_at'],
                    filter: {
                      workflow_run: {
                        workflow: {
                          organization: {
                            org_members: {
                              user_id: { _eq: 'X-Hasura-User-Id' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'workflow_results' },
              object_relationships: [
                {
                  name: 'workflow',
                  using: { foreign_key_constraint_on: 'workflow_id' }
                },
                {
                  name: 'workflow_run',
                  using: { foreign_key_constraint_on: 'workflow_run_id' }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['id', 'workflow_run_id', 'workflow_id', 'data', 'created_at'],
                    filter: {
                      workflow: {
                        organization: {
                          org_members: {
                            user_id: { _eq: 'X-Hasura-User-Id' }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              table: { schema: 'public', name: 'org_usage_monthly' },
              object_relationships: [
                {
                  name: 'organization',
                  using: {
                    manual_configuration: {
                      remote_table: { schema: 'public', name: 'organizations' },
                      column_mapping: { org_id: 'id' }
                    }
                  }
                }
              ],
              select_permissions: [
                {
                  role: 'user',
                  permission: {
                    columns: ['org_id', 'month', 'calls_used', 'calls_allowed', 'remaining'],
                    filter: {
                      organization: {
                        org_members: {
                          user_id: { _eq: 'X-Hasura-User-Id' }
                        }
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          name: 'triggerWorkflowRun',
          definition: {
            kind: 'synchronous',
            handler: 'http://localhost:4000/api/actions/trigger-workflow',
            forward_client_headers: true,
            output_type: 'WorkflowRunOutput'
          },
          permissions: [{ role: 'user' }]
        },
        {
          name: 'approveStep',
          definition: {
            kind: 'synchronous',
            handler: 'http://localhost:4000/api/actions/approve-step',
            forward_client_headers: true,
            output_type: 'ApproveStepOutput'
          },
          permissions: [{ role: 'user' }]
        }
      ],
      custom_types: {
        objects: [
          {
            name: 'WorkflowRunOutput',
            fields: [
              { name: 'workflow_run_id', type: 'String!' },
              { name: 'status', type: 'String!' }
            ]
          },
          {
            name: 'ApproveStepOutput',
            fields: [
              { name: 'step_run_id', type: 'String!' },
              { name: 'status', type: 'String!' }
            ]
          }
        ]
      }
    }
  }
};

async function apply() {
  console.log('Sending replace_metadata (v2) to Hasura at', HASURA_URL);
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify(metadataPayload),
  });

  const result = await response.json();
  console.log('Apply Hasura Metadata Result:', JSON.stringify(result, null, 2));
}

apply().catch(console.error);
