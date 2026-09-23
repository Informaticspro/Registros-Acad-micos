import { spawnSync } from 'node:child_process';
for (const args of [['node_modules/vitest/vitest.mjs', 'run'], ['--test', 'tests/security.test.mjs', 'tests/admin-function.test.mjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
