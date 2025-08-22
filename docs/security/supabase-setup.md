# Supabase Setup Guide

## Project Information
- **Project Name**: StudyMaster
- **URL**: your-supabase-url-here
- **Database**: PostgreSQL with real-time subscriptions

## Setup Instructions

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Create a new project or use existing project
3. Navigate to the SQL editor
4. Copy the contents of `supabase/schema.sql` and run it
5. Go to Authentication > Settings
6. Configure your authentication settings
7. Enable email authentication
8. Set up your email templates (optional)

## Database Schema

The database includes:
- Users table with profiles
- Study decks and cards
- Study sessions and progress tracking
- Achievements and statistics
- Public/private deck sharing

## Authentication

The app uses Supabase Auth with:
- Email/password authentication
- User profiles with additional metadata
- Row Level Security (RLS) policies
- JWT token handling

## Features

### ✅ Full CRUD Operations
- Create, read, update, delete study decks
- Manage study cards with rich content
- Track study progress and sessions

### ✅ Public Deck Sharing
- Users can make decks public or private
- Public decks are visible to all users
- Proper security for all operations

### Environment Variables for Deployment
For Vercel deployment, add these environment variables:
```
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

Note: The actual production keys are stored in `.env.production` (not tracked by git).

## Features Enabled

### ✅ Persistent Authentication
- Real user accounts with email/password
- Session persistence across browser sessions
- Automatic token refresh
- Secure logout functionality

### ✅ User Profiles
- Extended user profiles with display names
- Profile creation during signup
- Profile updates and management

### ✅ Study Deck Management
- Full CRUD operations for study decks
- Public/private deck visibility
- Deck sharing and discovery

### ✅ Study Card System
- Rich content support for cards
- Front/back card structure
- Study session tracking

### ✅ Progress Tracking
- Study session history
- Performance metrics
- Achievement system

## Security Features

- Row Level Security (RLS) enabled
- User-based access control
- Secure API endpoints
- JWT token validation
- CORS configuration

## Related Guides

- [Security Overview](README.md) - Complete security documentation
- [Environment Variables](../deployment/environment-variables.md) - Variable configuration
- [Database Schema](../development/database.md) - Database structure details