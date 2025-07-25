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
- `VITE_API_URL` = `https://server-72owm2ga8-daniel-perssons-projects-c35d58f6.vercel.app`
- `VITE_SUPABASE_URL` = `https://xbctnstrkgbkrgzdifyq.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY3Ruc3Rya2dia3JnemRpZnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg3NjMsImV4cCI6MjA2ODc5NDc2M30.3SXzhSp-m2cpv2MBbTuAF1uTjqO-8wPPurj6NBGgt7A`

### 2. Server Deployment (Vercel)
```bash
# Deploy from server directory  
cd server
vercel --prod
```

**Environment Variables to set in Vercel Dashboard:**
- `NODE_ENV` = `production`
- `POSTGRES_URL` = `postgres://postgres.xbctnstrkgbkrgzdifyq:TX9AHMf4wcJJHDbd@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x`
- `SUPABASE_URL` = `https://xbctnstrkgbkrgzdifyq.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY3Ruc3Rya2dia3JnemRpZnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg3NjMsImV4cCI6MjA2ODc5NDc2M30.3SXzhSp-m2cpv2MBbTuAF1uTjqO-8wPPurj6NBGgt7A`
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY3Ruc3Rya2dia3JnemRpZnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxODc2MywiZXhwIjoyMDY4Nzk0NzYzfQ.BCxreG0coTiRuwQjdoPIZDzPnXChGREIp4BCaKMB648`
- `SUPABASE_JWT_SECRET` = `qS4dzlfTZekV2pYuuRnhi2rx95Np+gOzpJ2Amyk2pykoeHyphsKZET/8ZacSxvZ2jFdCSsbN06HiptpkaHl3uQ==`

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