### Master Environment Variable Matrix

#### Client Environment Variables (`client/.env.local`)
```env


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


```

#### Production Deployment Variables (Vercel Dashboard)
- **Client Project**: Set all `VITE_*` variables
- **Server Project**: Set all server variables without `VITE_` prefix
- **Security**: Never include credentials in `vercel.json` files