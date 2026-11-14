import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const outputDirectory = await mkdtemp(join(tmpdir(), 'ha-statistics-tests-'));
const compiler = resolve(projectRoot, 'node_modules/typescript/bin/tsc');

try {
  const compile = spawnSync(process.execPath, [
    compiler,
    'src/lib/homeassistant/statistics-sync.test.ts',
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--types', 'node',
    '--esModuleInterop',
    '--strict',
    '--skipLibCheck',
    '--outDir', outputDirectory,
  ], { cwd: projectRoot, stdio: 'inherit' });

  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', join(outputDirectory, 'homeassistant', 'statistics-sync.test.js')], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    process.exitCode = tests.status ?? 1;
  }
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}