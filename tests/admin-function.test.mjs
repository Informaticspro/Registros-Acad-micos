import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('supabase/functions/admin-restablecer-contrasena/index.ts', 'utf8')
  .replace("import { createClient } from 'npm:@supabase/supabase-js@2';", '');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

function setup({ callerRole = 'admin', targetRole = 'scanner', organization = 'org-A', failSave = false, failRollback = false } = {}) {
  let handler;
  const mutations = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'caller' } }, error: null }),
      admin: {
        getUserById: async () => ({ data: { user: { email: 'old@example.test', user_metadata: { full_name: 'Old' } } }, error: null }),
        updateUserById: async (id, payload) => {
          mutations.push({ id, payload });
          return { error: failRollback && mutations.length > 1 ? new Error('rollback') : null };
        },
      },
    },
    from() {
      const filters = {};
      let updating = false;
      const query = {
        select: () => query,
        eq: (key, value) => { filters[key] = value; return query; },
        neq: () => query,
        update: () => { updating = true; return query; },
        maybeSingle: async () => {
          if (updating) return { data: failSave ? null : { id: 'target' }, error: failSave ? new Error('save') : null };
          if (filters.id === 'caller') return { data: { role: callerRole, organization_id: 'org-A' }, error: null };
          return { data: filters.organization_id === organization ? { id: 'target', role: targetRole } : null, error: null };
        },
      };
      return query;
    },
  };
  new Function('Deno', 'createClient', code)({ serve: fn => { handler = fn; }, env: { get: () => 'test-only' } }, () => client);
  return {
    mutations,
    request: () => handler(new Request('https://example.test/function', {
      method: 'POST', headers: { Authorization: 'Bearer test-only', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-profile', userId: 'target', email: 'new@example.test', fullName: 'New', role: 'scanner' }),
    })),
  };
}

for (const [name, options, status] of [
  ['other organization', { organization: 'org-B' }, 404],
  ['owner target', { targetRole: 'propietario' }, 403],
  ['support caller', { callerRole: 'soporte' }, 403],
]) {
  test(`denies ${name} before touching Auth`, async () => {
    const scenario = setup(options);
    assert.equal((await scenario.request()).status, status);
    assert.equal(scenario.mutations.length, 0);
  });
}
test('profile edit also updates the Auth email', async () => {
  const scenario = setup();
  assert.equal((await scenario.request()).status, 200);
  assert.equal(scenario.mutations[0].payload.email, 'new@example.test');
});
test('failed profile save restores Auth and reports failure', async () => {
  const scenario = setup({ failSave: true });
  const result = await scenario.request();
  assert.equal(result.status, 500);
  assert.equal(scenario.mutations[1].payload.email, 'old@example.test');
  assert.match((await result.json()).error, /restauraron/);
});
test('failed compensation is explicitly reported', async () => {
  const scenario = setup({ failSave: true, failRollback: true });
  assert.match((await (await scenario.request()).json()).error, /incompleta/);
});
