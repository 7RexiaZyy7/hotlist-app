import { spawn } from 'child_process';

const p1 = spawn('node', ['scripts/dev-proxy.mjs'], { stdio: 'inherit' });
const p2 = spawn('node', ['./node_modules/vite/bin/vite.js'], { stdio: 'inherit' });

process.on('SIGINT', () => {
  p1.kill();
  p2.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  p1.kill();
  p2.kill();
  process.exit();
});
