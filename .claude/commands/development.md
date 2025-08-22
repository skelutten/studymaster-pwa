# Development Commands Reference

## Quick Start Commands

### Initial Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd studymaster-pwa
npm install
```

### Development Server
```bash
# Start both client and server (recommended)
npm run dev

# Start individual services
npm run dev:client    # Client only (port 3000)
npm run dev:server    # Server only (port 3001)

# Alternative startup methods
npm run dev:concurrently  # Using concurrently
npm run dev:verbose      # With timestamps
npm start               # Alias for npm run dev
```

## Build Commands

### Production Builds
```bash
# Build all packages
npm run build

# Build individual packages
npm run build:client    # React frontend
npm run build:server    # Express backend
npm run build:shared    # Shared types
```

### Development Builds
```bash
# Build and watch for changes
cd client && npm run dev    # Vite dev server with HMR
cd server && npm run dev    # Nodemon with auto-restart
```

## Testing Commands

### Run Tests
```bash
# Run all tests
npm run test

# Run individual test suites
npm run test:client     # Vitest for React components
npm run test:server     # Jest for backend logic
```

### Test Development
```bash
# Watch mode for tests
cd client && npm run test -- --watch
cd server && npm run test -- --watch
```

## Code Quality Commands

### Linting
```bash
# Lint all packages
npm run lint

# Lint individual packages
npm run lint:client
npm run lint:server

# Auto-fix linting issues
cd client && npm run lint:fix
cd server && npm run lint:fix
```

### Type Checking
```bash
# TypeScript compilation check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
cd shared && npm run build
```

## Dependency Management

### Installation
```bash
# Install all dependencies
npm run install:all

# Install for specific packages
npm run install:client
npm run install:server
npm run install:shared
```

### Cleanup
```bash
# Clean all node_modules and dist folders
npm run clean

# Clean individual packages
npm run clean:client
npm run clean:server
npm run clean:shared
```

## Database Commands (Supabase)

### Local Development
```bash
# Check Supabase status
supabase status

# Start local Supabase (if using local development)
supabase start

# Stop local Supabase
supabase stop
```

### Database Management
```bash
# Generate TypeScript types from database
supabase gen types typescript --project-id your-project-id > shared/types/supabase.ts

# Run migrations (if using migrations)
supabase db push

# Reset local database
supabase db reset
```

## Deployment Commands

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy client
cd client && vercel --prod

# Deploy server
cd server && vercel --prod

# Preview deployment
cd client && vercel
cd server && vercel
```

### Environment Setup
```bash
# Copy environment templates
cp client/.env.example client/.env.local
cp server/.env.example server/.env.local

# Edit environment variables
# Set your actual Supabase credentials in .env.local files
```

## Debugging Commands

### Development Debugging
```bash
# Start with debugging enabled
cd server && npm run dev:debug

# Check port usage
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill processes on ports (Windows)
taskkill /PID <process-id> /F
```

### Log Analysis
```bash
# View real-time logs
cd client && npm run dev    # Check browser console
cd server && npm run dev    # Check terminal output

# Check Vercel deployment logs
vercel logs <deployment-url>
```

## Git Commands

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name
```

### Security Commands
```bash
# Check for committed secrets (if needed)
git log --all --full-history -- client/.env.local
git log --all --full-history -- server/.env.local

# Clean Git history (emergency only)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch client/.env.local' --prune-empty --tag-name-filter cat -- --all
```

## Troubleshooting Commands

### Common Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js and npm versions
node --version    # Should be >= 18.0.0
npm --version     # Should be >= 9.0.0

# Verify Supabase connection
cd client && node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

### Performance Monitoring
```bash
# Bundle analysis
cd client && npm run build -- --analyze

# Check bundle size
cd client && npm run build && ls -la dist/

# Memory usage
node --max-old-space-size=4096 server/dist/app.js