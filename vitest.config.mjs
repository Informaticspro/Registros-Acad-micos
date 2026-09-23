import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({ esbuild: { jsx: 'automatic' }, resolve: { alias: { '@': path.resolve('src') } }, test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], environment: 'node' } });
