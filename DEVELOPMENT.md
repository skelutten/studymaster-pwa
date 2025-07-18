# StudyMaster Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation & Launch
```bash
# Clone and navigate to the project
cd studymaster-pwa

# Install all dependencies
npm install

# Start development servers (both client and server)
npm run dev
```

## 📱 Development URLs

- **Client (React/Vite)**: http://localhost:3000
- **Server (Express API)**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

## 🛠️ Available Scripts

### Main Development Commands
- `npm run dev` - Start both client and server with enhanced logging
- `npm run dev:concurrently` - Alternative startup using concurrently
- `npm run dev:verbose` - Start with timestamps and verbose logging
- `npm start` - Alias for `npm run dev`

### Individual Services
- `npm run dev:client` - Start only the client (Vite dev server)
- `npm run dev:server` - Start only the server (Express with nodemon)

### Installation Commands
- `npm run install:all` - Install dependencies for all workspaces
- `npm run install:client` - Install client dependencies only
- `npm run install:server` - Install server dependencies only
- `npm run install:shared` - Install shared dependencies only

### Build Commands
- `npm run build` - Build all packages (shared, client, server)
- `npm run build:client` - Build client for production
- `npm run build:server` - Build server for production
- `npm run build:shared` - Build shared types

### Testing & Quality
- `npm run test` - Run all tests
- `npm run lint` - Run linting for all packages
- `npm run clean` - Clean all node_modules and dist folders

## 🔧 Configuration

### Port Configuration
- **Client**: Port 3000 (configurable in `client/vite.config.ts`)
- **Server**: Port 3001 (configurable in `server/.env`)

### Environment Variables
The server uses environment variables from `server/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# JWT Configuration (development only)
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

## 🔥 Hot Reload Features

### Client Hot Reload
- **Vite HMR**: Instant updates for React components, CSS, and assets
- **React Fast Refresh**: Preserves component state during updates
- **CSS Hot Reload**: Instant style updates without page refresh

### Server Hot Reload
- **Nodemon**: Automatic server restart on file changes
- **TypeScript Compilation**: Automatic recompilation on save
- **Environment Variable Reload**: Automatic restart on `.env` changes

## 🖥️ Cross-Platform Compatibility

### Windows
- Uses `npm.cmd` for script execution
- Handles Windows-specific path separators
- Compatible with PowerShell and Command Prompt

### macOS/Linux
- Uses standard `npm` command
- POSIX-compliant path handling
- Compatible with bash, zsh, and other shells

### Enhanced Startup Script
The custom `start-dev.js` script provides:
- ✅ Cross-platform command detection
- ✅ Port availability checking
- ✅ Prerequisite file validation
- ✅ Colored logging with timestamps
- ✅ Graceful shutdown handling (Ctrl+C)
- ✅ Error handling and recovery

## 📊 Development Monitoring

### Startup Logs
```
[22:53:16] ℹ️  🚀 Starting StudyMaster Development Environment
[22:53:16] ℹ️  Platform: win32
[22:53:16] ℹ️  Node.js: v18.17.0
[22:53:16] ✅ All prerequisites met!
[22:53:16] ✅ Port 3000 is available
[22:53:16] ✅ Port 3001 is available
[22:53:16] [CLIENT] Local:   http://localhost:3000/
[22:53:16] [SERVER] 🚀 Server running on port 3001
```

### Log Color Coding
- 🔵 **Blue**: General information
- 🟢 **Green**: Success messages
- 🟡 **Yellow**: Warnings
- 🔴 **Red**: Errors
- 🟦 **Cyan**: Client messages
- 🟪 **Magenta**: Server messages

## 🏗️ Project Structure

```
studymaster-pwa/
├── client/          # React frontend (Vite)
├── server/          # Express backend (Node.js)
├── shared/          # Shared TypeScript types
├── start-dev.js     # Enhanced development launcher
├── package.json     # Root workspace configuration
└── DEVELOPMENT.md   # This file
```

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill processes if needed (Windows)
taskkill /PID <process_id> /F
```

**Dependencies Issues**
```bash
# Clean install all dependencies
npm run clean
npm run install:all
```

**Hot Reload Not Working**
- Ensure you're editing files within the `src/` directories
- Check that the file extensions are supported (.tsx, .ts, .css)
- Verify the development servers are running without errors

### Getting Help
- Check the terminal output for detailed error messages
- Verify all prerequisites are installed
- Ensure ports 3000 and 3001 are available
- Review the server logs for API-related issues

## 🎯 Next Steps

1. **Demo Login**: Use the "Demo Login" button to quickly access the application
2. **API Testing**: Visit http://localhost:3001/api/docs for API documentation
3. **Hot Reload Testing**: Make changes to any React component and see instant updates
4. **Development**: Start building features with full hot reload support!

---

**Happy Coding! 🚀**