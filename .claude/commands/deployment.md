# Deployment Commands Reference

## 🚨 SECURITY FIRST
**NEVER commit API keys to Git - use deployment platform environment variables**

## Prerequisites

### Required Tools
```bash
# Install Vercel CLI globally
npm install -g vercel

# Verify installation
vercel --version
```

### Required Accounts
- **Vercel Account**: For hosting frontend and backend
- **Supabase Account**: For database, auth, and storage
- **Git Repository**: GitHub, GitLab, or Bitbucket

## Environment Variables Setup

### 1. Client Environment Variables
Set these in **Vercel Dashboard** for your client project:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 2. Server Environment Variables
Set these in **Vercel Dashboard** for your server project:

```env
NODE_ENV=production
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
POSTGRES_URL=postgres://postgres.your-project-ref:[password]@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

## Deployment Commands

### Initial Deployment

#### Deploy Client (Frontend)
```bash
# Navigate to client directory
cd client

# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: studymaster-client
# - Directory: ./
# - Override settings? No
```

#### Deploy Server (Backend)
```bash
# Navigate to server directory
cd server

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: studymaster-server
# - Directory: ./
# - Override settings? No
```

### Subsequent Deployments

#### Quick Production Deployment
```bash
# Deploy client
cd client && vercel --prod

# Deploy server
cd server && vercel --prod
```

#### Preview Deployments
```bash
# Deploy preview (for testing)
cd client && vercel
cd server && vercel
```

### Git-based Deployment

#### Setup Git Integration
```bash
# Connect repository to Vercel
vercel --prod

# Enable Git integration in Vercel Dashboard:
# 1. Go to project settings
# 2. Connect Git repository
# 3. Set build commands and output directory
```

#### Automatic Deployments
```bash
# Push to main branch triggers production deployment
git push origin main

# Push to other branches triggers preview deployment
git push origin feature/new-feature
```

## Build Configuration

### Client Build Settings (Vercel Dashboard)
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 18.x
```

### Server Build Settings (Vercel Dashboard)
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 18.x
```

## Environment Management

### Development to Production
```bash
# 1. Test locally first
npm run build:client
npm run build:server

# 2. Deploy to preview
cd client && vercel
cd server && vercel

# 3. Test preview deployment
# 4. Deploy to production
cd client && vercel --prod
cd server && vercel --prod
```

### Environment Variable Updates
```bash
# Update via Vercel CLI
vercel env add VITE_SUPABASE_URL production

# Or update via Vercel Dashboard:
# 1. Go to project settings
# 2. Environment Variables tab
# 3. Add/edit variables
# 4. Redeploy to apply changes
```

## Verification Commands

### Post-Deployment Checks
```bash
# Check client deployment
curl -I https://your-client-domain.vercel.app

# Check server deployment
curl -I https://your-server-domain.vercel.app/health

# Test API endpoints
curl https://your-server-domain.vercel.app/api/health
```

### Health Checks
```bash
# Client health check
curl https://your-client-domain.vercel.app/manifest.json

# Server health check
curl https://your-server-domain.vercel.app/health

# Database connectivity check
curl https://your-server-domain.vercel.app/api/health/db
```

## Monitoring Commands

### View Deployment Logs
```bash
# View latest deployment logs
vercel logs https://your-deployment-url.vercel.app

# View function logs
vercel logs https://your-deployment-url.vercel.app --follow

# View build logs
vercel logs https://your-deployment-url.vercel.app --since 1h
```

### Performance Monitoring
```bash
# Check deployment status
vercel ls

# Check domain status
vercel domains ls

# Check project info
vercel project ls
```

## Rollback Commands

### Quick Rollback
```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote https://previous-deployment-url.vercel.app
```

### Emergency Rollback
```bash
# Rollback to specific deployment
vercel alias https://previous-deployment-url.vercel.app your-domain.vercel.app

# Or redeploy from previous Git commit
git checkout previous-commit-hash
vercel --prod
```

## Domain Management

### Custom Domain Setup
```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS
# Add CNAME record: www -> cname.vercel-dns.com
# Add A record: @ -> 76.76.19.61

# Verify domain
vercel domains verify yourdomain.com
```

### SSL Certificate
```bash
# SSL is automatic with Vercel
# Check certificate status
curl -I https://yourdomain.com
```

## Troubleshooting Deployment

### Common Issues
```bash
# Build failures
vercel logs --follow

# Environment variable issues
vercel env ls

# Function timeout issues
# Check function duration in Vercel Dashboard

# Memory issues
# Upgrade Vercel plan or optimize code
```

### Debug Commands
```bash
# Local build test
npm run build

# Check build output
ls -la dist/

# Test production build locally
npm run preview  # For client
npm run start    # For server

# Check environment variables
vercel env ls
```

## Security Best Practices

### Credential Management
```bash
# NEVER do this:
# git add .env.production
# vercel.json with real credentials

# ALWAYS do this:
# Set variables in Vercel Dashboard
# Use .env.example for templates
# Keep .env.local in .gitignore
```

### Access Control
```bash
# Limit deployment access
# Set team permissions in Vercel Dashboard
# Use deployment protection for production
# Enable Vercel Authentication for previews
```

## Automation Scripts

### Deploy Script
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting deployment..."

# Build and test locally
npm run build
npm run test

# Deploy client
cd client
vercel --prod
cd ..

# Deploy server
cd server
vercel --prod
cd ..

echo "✅ Deployment complete!"
```

### Health Check Script
```bash
#!/bin/bash
# health-check.sh

CLIENT_URL="https://your-client-domain.vercel.app"
SERVER_URL="https://your-server-domain.vercel.app"

echo "🔍 Checking deployments..."

# Check client
if curl -f $CLIENT_URL > /dev/null 2>&1; then
    echo "✅ Client is healthy"
else
    echo "❌ Client is down"
fi

# Check server
if curl -f $SERVER_URL/health > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "❌ Server is down"
fi