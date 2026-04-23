const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = fs.openSync(path.join(__dirname, '..', 'dev.log'), 'w');
const child = spawn('node_modules/.bin/next', ['start', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: path.join(__dirname, '..'),
  detached: true,
  stdio: ['ignore', logFile, logFile],
  env: { ...process.env, NODE_ENV: 'production' }
});

child.unref();
fs.writeFileSync(path.join(__dirname, 'prod.pid'), child.pid.toString());
console.log('Production server started with PID:', child.pid);
