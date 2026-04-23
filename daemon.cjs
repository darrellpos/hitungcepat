const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = fs.openSync(path.join(__dirname, 'dev.log'), 'w');
const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: __dirname,
  detached: true,
  stdio: ['ignore', logFile, logFile],
  env: { ...process.env }
});

child.unref();
fs.writeFileSync(path.join(__dirname, '.zscripts', 'dev.pid'), child.pid.toString());
console.log('Dev server started with PID:', child.pid);
