# 🔧 Supabase MCP Server Setup Guide

## Overview
The Supabase MCP (Model Context Protocol) server allows Claude to interact directly with your Supabase database, enabling database queries, schema inspection, and data management.

## ✅ Setup Steps

### 1. Get Your Supabase Project Reference ID
- Go to your Supabase project dashboard
- The project reference is in your project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or find it in Project Settings → General → Reference ID

### 2. Create a Personal Access Token
- Visit: https://supabase.com/dashboard/account/tokens
- Click "Generate new token"
- Give it a descriptive name: "Claude MCP Server"
- Copy the token (you won't see it again!)

### 3. Update Claude Settings
Edit `.claude/settings.local.json` and replace the placeholders:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=YOUR_ACTUAL_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_ACTUAL_ACCESS_TOKEN"
      }
    }
  }
}
```

### 4. Restart Claude Code
After updating the settings, restart Claude Code for the MCP server to connect.

## 🔒 Security Features

- **Read-only mode**: Server is configured for read-only access by default
- **Project-scoped**: Limited to your specific project only
- **Token-based auth**: Uses secure personal access tokens

## 🛠 Available Capabilities

Once connected, Claude can:
- Query your database tables
- Inspect table schemas and relationships
- Analyze data patterns
- Generate TypeScript types from your schema
- Help debug database queries
- Suggest database optimizations

## 🔍 Verification

After setup, Claude should be able to:
- See your database schema
- Query your tables (read-only)
- Help with database-related tasks

## 📚 For More Information

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [MCP Server GitHub](https://github.com/supabase-community/supabase-mcp)

---

*Last Updated: 2025-01-26*