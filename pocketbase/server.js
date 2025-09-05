const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8090;

console.log('Starting PocketBase server...');

// Make sure pocketbase is executable
const pocketbasePath = path.join(__dirname, 'pocketbase');
if (fs.existsSync(pocketbasePath)) {
  fs.chmodSync(pocketbasePath, '755');
}

// Start PocketBase with the specified port
const pocketbase = spawn('./pocketbase', ['serve', '--http=0.0.0.0:' + PORT], {
  cwd: __dirname,
  stdio: 'inherit'
});

pocketbase.on('error', (error) => {
  console.error('Failed to start PocketBase:', error);
  process.exit(1);
});

pocketbase.on('close', (code) => {
  console.log(`PocketBase exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  pocketbase.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  pocketbase.kill('SIGINT');
});