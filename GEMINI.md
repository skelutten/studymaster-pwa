# 🎯 Gemini Code Context for StudyMaster PWA

Welcome to the comprehensive context guide for the StudyMaster PWA project. This document provides structured access to all development resources, guidelines, and documentation.

---

## ⚡ Development Essentials
*Core workflow, standards, and AI behavior - Daily development needs*

- **🔄 Development Workflow**: [`.claude/workflow.md`](#workflow) - Step-by-step development process
- **📋 Coding Standards**: [`.claude/coding-standards.md`](#coding-standards) - Code quality and style guidelines
- **🤖 AI Behavior Rules**: [`.claude/ai_behaviour.md`](#ai-behavior-rules) - How Gemini should behave and respond

---

## 📖 Comprehensive Guides
*Detailed guides for specific development tasks and troubleshooting*

- **⚡ Common Commands**: [`commands.md`](#common-commands--workflows) - Frequently used CLI commands and shortcuts
- **✅ Common Tasks**: [`common_tasks.md`](#common-tasks) - Step-by-step task implementations

---

## 🤖 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified npm packages.
- **Always confirm file paths and module names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a documented task.

---

## 📝 CODING STANDARDS

### Follow [Clean code](.claude/clean_code.md)
### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced linting rules
- **Prettier**: Consistent code formatting
- **Naming**: camelCase for variables, PascalCase for components

### Component Guidelines
- **Functional components** with hooks
- **TypeScript interfaces** for all props
- **Consistent file structure** and naming
- **Proper error handling** and loading states

### API Design
- **RESTful endpoints** where appropriate
- **Consistent error responses** with proper HTTP codes
- **Input validation** on all endpoints
- **Rate limiting** for production

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
  For React components this looks like:
    - `ComponentName.tsx` - Main component definition
    - `hooks/useComponentName.ts` - Custom hooks for component logic
    - `services/componentNameService.ts` - API calls and business logic
- **Use clear, consistent imports** (prefer relative imports within the project structure).
- **Use environment variables** through Vite's `import.meta.env` for client-side configuration.

### 📎 Style & Conventions
- **Use TypeScript** as the primary language for both frontend and backend.
- **Follow ESLint rules**, use type annotations, and format consistently.
- **Use Zod or similar** for data validation on both client and server.
- Use **Supabase client** for database operations and **Express.js** for API endpoints.
- Write **JSDoc comments for functions** using standard format:
  ```typescript
  /**
   * Brief summary.
   * @param param1 - Description
   * @returns Description
   */
  function example(param1: string): string {
    // implementation
  }
  ```

### 📚 Documentation & Explainability
- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add inline comments** explaining the why, not just the what.

---

## 🔄 WORKFLOW

### Project Awareness & Context
- **Always read documentation** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- **Check existing documentation** before starting a new task to understand current implementation.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in project documentation.
- **Follow the established technology stack**: React + TypeScript + Vite + Supabase + Vercel.

### ✅ Task Completion
- **Update documentation** immediately after finishing features.
- Add new sub-tasks or TODOs discovered during development to appropriate documentation.
- Run linters
- Run unit tests
- Compile for local deployment
- Execute functional tests on local deployment
- Create git commit and push
- Build for real deployment and deploy.

---

# Common Commands & Workflows

## 🚀 Development Commands

### Project Setup
```bash
# Clone and setup (for new developers)
git clone https://github.com/skelutten/studymaster-pwa.git
cd studymaster-pwa
npm install
cd client && npm install
cd ../server && npm install

# Copy production environment files (get from secure source)
cp .env.production.example .env.production
cp client/.env.production.example client/.env.production
# Edit files with actual credentials (NEVER commit these)
```

### Development Workflow
```bash
# Start all services
npm run dev

# Or start individually
cd client && npm run dev     # Frontend dev server
cd server && npm run dev     # Backend dev server

# Build for testing
cd client && npm run build
cd server && npm run build

# Run tests
cd client && npm test
cd server && npm test

# Lint and format
npm run lint
npm run lint:fix
```

## 🔧 Database Commands

### Supabase Local Development
```bash
# Start local Supabase (if using local dev)
npx supabase start

# Apply migrations
npx supabase db reset

# Generate types
npx supabase gen types typescript --local > shared/types/supabase.ts
```

### Database Utilities
```bash
# Test database connection
cd server && npm run db:test

# Run seeds (if available)
cd server && npm run db:seed

# Backup database (production)
npx supabase db dump --local > backup.sql
```

## 🚀 Deployment Commands

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy client (from client directory)
cd client
vercel --prod

# Deploy server (from server directory)
cd server  
vercel --prod

# Check deployment status
vercel ls
vercel logs [deployment-url]
```

### Environment Variable Management
```bash
# List environment variables (Vercel)
vercel env ls

# Add environment variable
vercel env add [NAME] [VALUE] [ENVIRONMENT]

# Remove environment variable
vercel env rm [NAME] [ENVIRONMENT]
```

## 🔒 Security Commands

### Git Security
```bash
# Check for secrets (install git-secrets first)
git secrets --scan

# Remove file from Git history (DANGEROUS - backup first!)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch [FILE]' --prune-empty --tag-name-filter cat -- --all

# Clean up after filter-branch
for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now
```

### Credential Management
```bash
# Generate secure random strings
openssl rand -base64 32

# Check for exposed secrets in files
grep -r "sk_" . --exclude-dir=node_modules
grep -r "pk_" . --exclude-dir=node_modules
grep -r "eyJ" . --exclude-dir=node_modules

# Verify .gitignore is working
git check-ignore .env.production
git check-ignore client/.env.production
```

## 🐛 Debugging Commands

### Client Debugging
```bash
# Build with detailed output
cd client && npm run build -- --mode development

# Analyze bundle size
cd client && npx vite-bundle-analyzer

# Check PWA functionality
cd client && npx workbox --help
```

### Server Debugging
```bash
# Run with debug logging
cd server && DEBUG=* npm run dev

# Check TypeScript compilation
cd server && npx tsc --noEmit

# Test API endpoints
curl -X GET http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Database Debugging
```bash
# Test database connection
cd server && node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('users').select('*').limit(1).then(console.log);
"

# Check database health
npx supabase status --local
```

## 📊 Monitoring Commands

### Performance Analysis
```bash
# Lighthouse audit
npx lighthouse [URL] --output=html --output-path=./report.html

# Bundle analysis
cd client && npx webpack-bundle-analyzer dist/stats.json

# Load testing (if needed)
npx autocannon http://localhost:3000/api/health
```

### Log Analysis
```bash
# Vercel logs
vercel logs [deployment-url] --follow

# Local server logs
cd server && npm run dev | grep ERROR

# Client error tracking
# Check browser console and network tab
```

## 🧪 Testing Commands

### Unit Tests
```bash
# Run all tests
npm test

# Run tests with coverage
cd client && npm run test:coverage
cd server && npm run test:coverage

# Run specific test files
cd client && npm test -- UserProfile.test.tsx
cd server && npm test -- auth.test.ts
```

### Integration Tests
```bash
# API testing
cd server && npm run test:integration

# End-to-end tests (if implemented)
npx playwright test
npx cypress run
```

## 🔄 Maintenance Commands

### Dependency Management
```bash
# Check for outdated packages
npm outdated
cd client && npm outdated
cd server && npm outdated

# Update dependencies
npm update
cd client && npm update
cd server && npm update

# Security audit
npm audit
npm audit fix
```

### Git Maintenance
```bash
# Clean up branches
git branch -d [branch-name]
git push origin --delete [branch-name]

# Squash commits (interactive rebase)
git rebase -i HEAD~3

# Clean up repository
git gc --aggressive --prune=now
```

## 🚨 Emergency Commands

### Rollback Deployment
```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]

# Cancel current deployment
vercel cancel [deployment-id]
```

### Security Incident Response
```bash
# Immediately rotate all credentials
# 1. Change all passwords in Supabase dashboard
# 2. Regenerate all API keys
# 3. Update environment variables in Vercel
# 4. Force refresh of all user sessions

# Check for compromised commits
git log --all --grep="password\|key\|secret\|token" --oneline

# Remove sensitive data from Git (if needed)
# See Git Security section above
```

## 📝 Helpful Aliases

Add these to your `.bashrc` or `.zshrc`:

```bash
# StudyMaster shortcuts
alias sm-dev="cd ~/path/to/studymaster-pwa && npm run dev"
alias sm-client="cd ~/path/to/studymaster-pwa/client"
alias sm-server="cd ~/path/to/studymaster-pwa/server"
alias sm-build="cd ~/path/to/studymaster-pwa && npm run build:all"
alias sm-deploy="cd ~/path/to/studymaster-pwa && npm run deploy:all"

# Git shortcuts
alias gs="git status"
alias gc="git commit -m"
alias gp="git push"
alias gl="git log --oneline -10"

# Vercel shortcuts
alias vd="vercel --prod"
alias vl="vercel logs"
alias vs="vercel ls"
```

---

## 🛠️ COMMON TASKS

### Adding New Features
1. **Define types** in `shared/types/`
2. **Create database migrations** in `supabase/`
3. **Implement API endpoints** in `server/src/routes/`
4. **Add frontend components** in `client/src/components/`
5. **Update state management** in stores if needed

### Debugging Issues
- **Check environment variables** are set correctly
- **Verify Supabase connection** and credentials
- **Review browser console** for client-side errors
- **Check server logs** in Vercel dashboard
- **Test API endpoints** independently

### Database Changes
1. **Update schema** in `supabase/schema.sql`
2. **Create migration scripts** if needed
3. **Update TypeScript types** in `shared/types/`
4. **Test locally** before deploying
