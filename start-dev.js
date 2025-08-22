#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import net from 'net';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Cross-platform command detection
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Check if required files exist
function checkPrerequisites() {
  logInfo('Checking prerequisites...');
  
  const requiredFiles = [
    'client/package.json',
    'server/package.json',
    'server/.env'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      logError(`Required file missing: ${file}`);
      return false;
    }
  }
  
  logSuccess('All prerequisites met!');
  return true;
}

// Check if ports are available
function checkPorts() {
  logInfo('Checking port availability...');
  
  const ports = [3000, 3001];
  
  return Promise.all(ports.map(port => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => {
          logSuccess(`Port ${port} is available`);
          resolve(true);
        });
        server.close();
      });
      server.on('error', () => {
        logWarning(`Port ${port} is already in use`);
        resolve(false);
      });
    });
  }));
}

// Start development servers
async function startDevelopment() {
  logInfo('🚀 Starting StudyMaster Development Environment');
  logInfo(`Platform: ${process.platform}`);
  logInfo(`Node.js: ${process.version}`);
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  // Check ports
  const portResults = await checkPorts();
  if (portResults.some(result => !result)) {
    logWarning('Some ports are in use. The application may still work if the services are already running.');
  }
  
  logInfo('Starting client and server...');
  
  // Start client
  const clientProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'pipe',
    shell: true
  });
  
  // Start server
  const serverProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'pipe',
    shell: true
  });
  
  // Handle client output
  clientProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      log(`[CLIENT] ${message}`, colors.cyan);
    }
  });
  
  clientProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('Warning')) {
      log(`[CLIENT ERROR] ${message}`, colors.red);
    } else if (message) {
      log(`[CLIENT WARN] ${message}`, colors.yellow);
    }
  });
  
  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      log(`[SERVER] ${message}`, colors.magenta);
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('Warning')) {
      log(`[SERVER ERROR] ${message}`, colors.red);
    } else if (message) {
      log(`[SERVER WARN] ${message}`, colors.yellow);
    }
  });
  
  // Handle process exits
  clientProcess.on('exit', (code) => {
    if (code !== 0) {
      logError(`Client process exited with code ${code}`);
    }
    serverProcess.kill();
    process.exit(code);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      logError(`Server process exited with code ${code}`);
    }
    clientProcess.kill();
    process.exit(code);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    logInfo('Shutting down development servers...');
    clientProcess.kill();
    serverProcess.kill();
    process.exit(0);
  });
  
  // Display startup information
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    logSuccess('🎉 Development environment started successfully!');
    console.log('');
    logInfo('📱 Client (React/Vite): http://localhost:3000');
    logInfo('🔗 Server (Express): http://localhost:3001');
    logInfo('📚 API Documentation: http://localhost:3001/api/docs');
    logInfo('❤️  Health Check: http://localhost:3001/health');
    console.log('');
    logInfo('Press Ctrl+C to stop both servers');
    console.log('='.repeat(60) + '\n');
  }, 2000);
}

// Error handling
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the development environment
startDevelopment().catch((error) => {
  logError(`Failed to start development environment: ${error.message}`);
  process.exit(1);
});