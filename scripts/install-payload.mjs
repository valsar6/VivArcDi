import { spawnSync } from 'node:child_process';

const LIFECYCLE = process.env.npm_command ?? '';
const EXPLICIT_RUNS = ['run', 'run-script'];

if (!EXPLICIT_RUNS.includes(LIFECYCLE)) {
  process.exit(0);
}

const build = spawnSync('make', ['build'], { stdio: 'inherit' });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const python3 = spawnSync('python3', ['--version'], { stdio: 'ignore' });
const python = python3.status === 0 ? 'python3' : 'python';
const install = spawnSync(python, ['installer', 'install'], { stdio: 'inherit' });
process.exit(install.status ?? 1);
