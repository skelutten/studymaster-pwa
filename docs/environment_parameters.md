### Master Environment Variable Matrix

#### Client Environment Variables (`client/.env.local`)
```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional Configuration
VITE_API_BASE_URL=http://localhost:3001  # For local development
VITE_APP_ENV=development
```

#### Server Environment Variables (`server/.env.local`)
```env
# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase Configuration (Required)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here

# Database (via Supabase)
POSTGRES_URL=postgres://postgres.your-project-ref:[password]@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

#### Production Deployment Variables (Vercel Dashboard)
- **Client Project**: Set all `VITE_*` variables
- **Server Project**: Set all server variables without `VITE_` prefix
- **Security**: Never include credentials in `vercel.json` files