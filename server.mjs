import { spawn } from 'child_process';

function startServer() {
  console.log('[manager] Starting Next.js server...');
  const child = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', (code) => {
    console.log(`[manager] Server exited code=${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  child.on('error', (err) => {
    console.error(`[manager] Error: ${err.message}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
}

startServer();