# Claude Memory

## 🚨 CRITICAL SECURITY RULES

### NEVER COMMIT API KEYS TO GIT
- **NEVER** put real API keys in vercel.json or any tracked files
- **NEVER** commit credentials to Git repositories  
- **ALWAYS** use deployment platform environment variables instead
- **ALWAYS** keep production credentials in `.env.production` files (excluded from Git)

## Project Context

### StudyMaster PWA Project
- React/TypeScript client application
- Node.js/Express server
- Supabase database and authentication
- Deployed on Vercel platform

### Security Implementation
- API keys removed from Git history using git filter-branch
- Production credentials stored in excluded `.env.production` files
- Deployment configurations use placeholder values only
- Environment variables must be set through deployment platform dashboards

### Key Files & Documentation
- `client/.env.production` - Client production credentials (not tracked)
- `server/.env.production` - Server production credentials (not tracked) 
- `SECURITY.md` - Security documentation
- `DEPLOYMENT.md` - Deployment instructions with environment variables
- `.claude/CLAUDE.md` - Comprehensive project documentation and guidelines
- `.claude/context.md` - Current project state and context
- `.claude/commands.md` - Common commands and workflows

### Deployment Process
- Use `vercel --prod` command for deployment
- Set environment variables through Vercel Dashboard UI
- Never put real credentials in vercel.json files

### Current Status
- All sensitive data removed from Git repository
- Comprehensive documentation created in `.claude/` folder
- Security rules permanently stored and enforced
- Ready for secure deployment with proper environment variable setup