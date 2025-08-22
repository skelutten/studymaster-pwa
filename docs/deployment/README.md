# Deployment Guide

## 🚨 CRITICAL SECURITY RULE
**NEVER commit API keys to Git - use deployment platform environment variables instead**

## Deployment Process

### 1. Client Deployment (Vercel)
```bash
# Deploy from client directory
cd client
vercel --prod
```

**Environment Variables to set in Vercel Dashboard:**
- `VITE_API_URL` = `https://your-server-deployment-url.vercel.app`
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-key-here`

### 2. Server Deployment (Vercel)
```bash
# Deploy from server directory  
cd server
vercel --prod
```

**Environment Variables to set in Vercel Dashboard:**
- `NODE_ENV` = `production`
- `POSTGRES_URL` = `postgres://postgres.your-project-id:your-db-password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require`
- `SUPABASE_URL` = `https://your-project-id.supabase.co`
- `SUPABASE_ANON_KEY` = `your-supabase-anon-key-here`
- `SUPABASE_SERVICE_ROLE_KEY` = `your-supabase-service-role-key-here`
- `SUPABASE_JWT_SECRET` = `your-supabase-jwt-secret-here`

## Security Best Practices

1. **Never commit credentials to Git**
2. **Use deployment platform environment variables**
3. **Keep production credentials in `.env.production` files (excluded from Git)**
4. **Set environment variables through Vercel Dashboard, not vercel.json**

## Deployment Commands

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy client
cd client && vercel --prod

# Deploy server  
cd server && vercel --prod
```

## Verification Steps

1. Check client deployment loads at Vercel URL
2. Verify API endpoints respond correctly
3. Test authentication with Supabase
4. Confirm database connectivity
5. Test all major features work in production

## Environment Setup

### For Production Deployment:
1. Copy values from your secure credential store to your deployment platform
2. Set environment variables in Vercel/Railway/etc using these values
3. Ensure production files are never committed to Git

### For Local Development:
1. Copy production credentials to local `.env` files if needed
2. Modify values for local development
3. The `.env.local` files will be ignored by Git

## Related Guides

- [Security Configuration](../security/README.md) - Security best practices
- [Environment Variables](environment-variables.md) - Complete variable reference
- [Troubleshooting Deployment](troubleshooting.md) - Common deployment issues

---

**Deploy Safely! 🚀**