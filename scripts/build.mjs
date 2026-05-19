import { spawnSync } from 'node:child_process';
import path from 'node:path';

const bin = (packageName, binPath) => path.join('node_modules', packageName, binPath);

for (const [command, args] of [
  [process.execPath, [bin('typescript', path.join('bin', 'tsc')), '-b']],
  [process.execPath, [bin('vite', path.join('bin', 'vite.js')), 'build']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
