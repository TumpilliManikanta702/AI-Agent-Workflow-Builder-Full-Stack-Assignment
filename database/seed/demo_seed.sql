-- Seed Organizations
INSERT INTO organizations (id, name, usage_calls, usage_limit)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Acme AI Corp (Org A)', 12, 100),
    ('22222222-2222-2222-2222-222222222222', 'Stark Industries (Org B)', 5, 50)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, usage_calls = EXCLUDED.usage_calls, usage_limit = EXCLUDED.usage_limit;

-- Seed Org Members (Org A)
INSERT INTO org_members (id, org_id, user_id, role)
VALUES 
    ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'owner'),
    ('00000000-0000-0000-0000-0000000000a2', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'editor'),
    ('00000000-0000-0000-0000-0000000000a3', '11111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'viewer')
ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Seed Org Members (Org B)
INSERT INTO org_members (id, org_id, user_id, role)
VALUES 
    ('00000000-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'owner'),
    ('00000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'editor'),
    ('00000000-0000-0000-0000-0000000000b3', '22222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'viewer')
ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Seed Canonical Demo Workflow for Org A
INSERT INTO workflows (id, org_id, name, description, created_by)
VALUES 
    (
        'aaaa1111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'Customer Support Request Triage & Processing',
        'AI classification, conditional HTTP inspection, human approval gate, and DB recording.',
        'a1111111-1111-1111-1111-111111111111'
    ),
    (
        'bbbb2222-2222-2222-2222-222222222222',
        '22222222-2222-2222-2222-222222222222',
        'Org B Confidential Financial Workflow',
        'Private Stark Industries automated pipeline.',
        'b1111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Seed Workflow Steps for Canonical Org A Workflow
INSERT INTO workflow_steps (id, workflow_id, name, step_order, type, config)
VALUES 
    (
        '00000001-1111-1111-1111-111111111111',
        'aaaa1111-1111-1111-1111-111111111111',
        'Classify Priority (LLM Call)',
        1,
        'llm_call',
        '{"provider": "groq", "model": "llama-3.3-70b-versatile", "prompt": "Classify the following request as HIGH or LOW priority. Return exactly one word: HIGH or LOW. Request: {{input}}"}'::jsonb
    ),
    (
        '00000002-1111-1111-1111-111111111111',
        'aaaa1111-1111-1111-1111-111111111111',
        'Check Priority Condition',
        2,
        'conditional_branch',
        '{"condition": "contains", "value": "HIGH"}'::jsonb
    ),
    (
        '00000003-1111-1111-1111-111111111111',
        'aaaa1111-1111-1111-1111-111111111111',
        'Fetch Ticket Meta (HTTP Request)',
        3,
        'http_request',
        '{"method": "GET", "url": "https://jsonplaceholder.typicode.com/todos/1", "headers": {}, "body": {}}'::jsonb
    ),
    (
        '00000004-1111-1111-1111-111111111111',
        'aaaa1111-1111-1111-1111-111111111111',
        'Human Executive Approval Gate',
        4,
        'approval_gate',
        '{"message": "High priority ticket triage complete. Approve final database log insertion?"}'::jsonb
    ),
    (
        '00000005-1111-1111-1111-111111111111',
        'aaaa1111-1111-1111-1111-111111111111',
        'Save Result Record (DB Write)',
        5,
        'db_write',
        '{"target": "workflow_results", "data": {"processed": true, "category": "HIGH_PRIORITY_TRIAGED"}}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, config = EXCLUDED.config;

-- Seed Workflow Triggers
INSERT INTO workflow_triggers (id, workflow_id, trigger_type, config, enabled)
VALUES 
    (
        '00000001-2222-2222-2222-222222222222',
        'aaaa1111-1111-1111-1111-111111111111',
        'manual',
        '{}'::jsonb,
        true
    ),
    (
        '00000002-2222-2222-2222-222222222222',
        'aaaa1111-1111-1111-1111-111111111111',
        'webhook',
        '{"token": "demo-webhook-secret-token-123"}'::jsonb,
        true
    )
ON CONFLICT (id) DO UPDATE SET enabled = EXCLUDED.enabled;
