# PocketBase Production Setup Instructions

## Quick Setup (Recommended)

The application is configured to use PocketBase for enhanced media import functionality. To complete the deployment, you need to set up a PocketBase instance:

### Option 1: PocketBase Cloud (Free Tier Available)

1. Visit [PocketBase Cloud](https://pocketbasecloud.com/)
2. Create a free account
3. Create a new project
4. Note your instance URL (e.g., `https://your-instance-name.pocketbasecloud.com`)
5. Update the production environment variable:
   ```bash
   # In client/.env.production, replace:
   VITE_POCKETBASE_URL=https://your-instance-name.pocketbasecloud.com
   ```

### Option 2: PocketHost (30-second setup)

1. Visit [PocketHost](https://pockethost.io/)
2. Create a new instance
3. Get your instance URL
4. Update the production environment variable

### Option 3: Self-hosted

Use the deployment files in `/pocketbase/` directory with your preferred hosting provider:
- `Dockerfile` - For container deployment
- `server.js` - Node.js wrapper for platforms like Heroku/Railway
- `render.yaml` - Render.com configuration

## Database Migration

After creating your PocketBase instance, you need to apply the database schema:

1. Access your PocketBase admin panel at `https://your-instance.com/_/`
2. Create an admin account
3. Import the migration files from `pocketbase/pb_migrations/`:
   - `enhanced_media_files_schema.js`
   - `enhanced_decks_schema.js`

Or run the setup script:
```bash
node scripts/setup-enhanced-media-schema.js
```

## Environment Configuration

After setup, redeploy the client with the correct PocketBase URL:

```bash
cd client
npm run build
vercel deploy --prod
```

## Security Notes

- PocketBase handles authentication and media file access control
- All media files are validated for security threats
- User-based access control is enforced at the database level
- File signatures are validated to prevent tampering

## Troubleshooting

If you see connection errors in the browser console:
1. Verify your PocketBase instance is accessible
2. Check CORS settings in PocketBase admin panel
3. Ensure the URL in `.env.production` matches your instance
4. Redeploy the client after updating environment variables

## Features Enabled

With PocketBase configured, the following features will work:
- Enhanced media import from Anki decks
- Security validation and threat detection
- Media optimization and metadata stripping
- User authentication and data persistence
- Real-time synchronization