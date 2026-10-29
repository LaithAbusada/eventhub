// npm run dev: MongoDB and Elasticsearch in Docker, the API and the web app locally,
// both reloading on save. Ctrl+C stops the API and the web app; the databases keep running.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import readline from 'node:readline';

function runAndWait(command, folder) {
  console.log(`> ${command}`);
  const result = spawnSync(command, { cwd: folder, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`"${command}" failed, so nothing else was started.`);
    process.exit(1);
  }
}

function startAndLabel(name, command, folder) {
  const child = spawn(command, { cwd: folder, shell: true });

  for (const output of [child.stdout, child.stderr]) {
    const lines = readline.createInterface({ input: output });
    lines.on('line', (line) => {
      if (line.trim() !== '') {
        console.log(`[${name}] ${line}`);
      }
    });
  }

  child.on('exit', (code) => {
    console.log(`[${name}] stopped (exit code ${code})`);
  });
}

if (!existsSync('.env')) {
  console.error('There is no .env file. Copy .env.example to .env first.');
  process.exit(1);
}

// The api container uses port 4000 too, so stop it if it's running
runAndWait('docker compose stop api', '.');
runAndWait('docker compose up -d --wait mongo elasticsearch', '.');

if (!existsSync('api/node_modules')) {
  runAndWait('npm install', 'api');
}
if (!existsSync('web/node_modules')) {
  runAndWait('npm install', 'web');
}

startAndLabel('api', 'npm run dev', 'api');
startAndLabel('web', 'npm run dev', 'web');
