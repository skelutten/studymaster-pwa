# Claude Code Context for StudyMaster PWA

## 🚨 CRITICAL SECURITY RULES

### API Keys & Credentials
- **NEVER** commit API keys, passwords, or secrets to Git
- **NEVER** put real credentials in `vercel.json` or any tracked files
- **ALWAYS** use deployment platform environment variables
- **ALWAYS** keep production credentials in `.env.production` files (excluded from Git)
- **IMMEDIATELY** revert any accidental credential commits and clean Git history

### Git Repository Security
- All sensitive data has been removed from Git history using `git filter-branch`
- Production credentials are stored in excluded files: `.env.production`, `client/.env.production`
- The `.gitignore` includes comprehensive patterns to prevent credential leaks

## 📋 PROJECT OVERVIEW

### StudyMaster PWA - Flashcard Study Application
**Architecture**: Full-stack Progressive Web App
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth (email/password)
- **Deployment**: Vercel (client + server)
- **Storage**: Supabase Storage + S3 compatible

### Key Features
- **Study System**: Flashcard decks with spaced repetition (Anki-inspired)
- **Authentication**: User accounts with profiles and progress tracking
- **Social Features**: Public/private deck sharing, leaderboards
- **Gamification**: Achievements, XP system, streaks, challenges
- **Progressive Web App**: Offline support, installable, service worker
- **Real-time Updates**: Live statistics and multiplayer features

## 🏗️ PROJECT STRUCTURE

```
studymaster-pwa/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── stores/        # State management (Zustand)
│   │   ├── services/      # API calls and business logic
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   ├── .env.production    # Production environment variables (NOT TRACKED)
│   └── vercel.json        # Deployment config (placeholders only)
├── server/                # Node.js backend API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # External service integrations
│   │   └── utils/         # Helper functions
│   └── vercel.json        # Deployment config (placeholders only)
├── shared/                # Shared TypeScript types
├── supabase/             # Database schema and migrations
├── .env.production       # Root production environment variables (NOT TRACKED)
└── .claude/              # Claude context and documentation
```

## 🔧 DEVELOPMENT SETUP

### Prerequisites
- Node.js 18+ with npm
- Git
- Vercel CLI (for deployment)

### Environment Setup
1. **Copy production credentials** from `.env.production` files
2. **Create local environment files** for development
3. **Never commit** environment files with real credentials

### Common Commands
```bash
# Install dependencies
npm install                    # Root dependencies
cd client && npm install      # Client dependencies  
cd server && npm install      # Server dependencies

# Development
npm run dev                   # Start all services (root)
cd client && npm run dev      # Client only
cd server && npm run dev      # Server only

# Building
cd client && npm run build    # Build client
cd server && npm run build    # Build server

# Testing
cd client && npm test         # Client tests
cd server && npm test         # Server tests
```

## 🚀 DEPLOYMENT PROCESS

### Secure Deployment Rules
1. **Build applications** locally first
2. **Deploy via Vercel CLI** or Git integration
3. **Set environment variables** through Vercel Dashboard UI
4. **Never include credentials** in deployment configurations

### Environment Variables Setup
- **Client**: Set in Vercel Dashboard for client deployment
- **Server**: Set in Vercel Dashboard for server deployment
- **Reference**: See `DEPLOYMENT.md` for complete variable list

## 📊 KEY INTEGRATIONS

### Supabase Configuration
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Email/password with JWT tokens
- **Real-time**: WebSocket subscriptions for live updates
- **Storage**: File uploads and management
- **Edge Functions**: Server-side logic

### External Services
- **Vercel**: Frontend and backend deployment
- **Supabase**: Database, auth, real-time, storage
- **S3 Compatible Storage**: For file uploads

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

## 🔍 TROUBLESHOOTING

### Common Issues
- **CORS errors**: Check API URL configuration
- **Auth failures**: Verify Supabase keys and JWT settings
- **Build failures**: Check TypeScript errors and dependencies
- **Deployment issues**: Verify environment variables in Vercel

### Quick Fixes
- **Clear node_modules** and reinstall dependencies
- **Check .env files** are not accidentally committed
- **Verify API endpoints** are accessible
- **Test authentication flow** step by step

## 📝 CODING STANDARDS

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

## 🎯 PROJECT GOALS

### Current Status
- ✅ **Basic CRUD operations** for decks and cards
- ✅ **User authentication** and profiles
- ✅ **Study system** with progress tracking
- ✅ **PWA features** and offline support
- ✅ **Security hardening** and credential management

### Future Enhancements
- 🔄 **Advanced spaced repetition** algorithms
- 🔄 **Social features** and deck sharing
- 🔄 **Mobile app** versions
- 🔄 **Advanced analytics** and insights
- 🔄 **Multiplayer study** sessions

## 📞 SUPPORT CONTACTS

### Resources
- **GitHub Repository**: [StudyMaster PWA](https://github.com/skelutten/studymaster-pwa)
- **Documentation**: See `README.md`, `SECURITY.md`, `DEPLOYMENT.md`
- **Supabase Dashboard**: Access via project URL
- **Vercel Dashboard**: Check deployment status and logs

### Emergency Procedures
- **Security breach**: Immediately rotate all API keys
- **Deployment failure**: Check Vercel logs and revert if needed
- **Database issues**: Check Supabase dashboard and connection strings
- **Service outage**: Monitor external service status pages