const { spawn } = require('child_process');
const fs = require('fs');
const LOG_DIR = 'D:/Nalavariyam Smart Welfare Assistant/.freebuff';
const log = fs.openSync(`${LOG_DIR}/frontend.log`, 'w');
const logErr = fs.openSync(`${LOG_DIR}/frontend.log.err`, 'w');
const proc = spawn('npx.cmd', ['vite', '--host'], {
  cwd: 'D:/Nalavariyam Smart Welfare Assistant/nalavariyam-smart-welfare-assistant/frontend',
  detached: true,
  stdio: ['ignore', log, logErr],
  shell: true,
  windowsHide: true
});
proc.unref();
console.log('Frontend PID:', proc.pid);
