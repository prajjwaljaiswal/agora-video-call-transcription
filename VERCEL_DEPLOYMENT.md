# Vercel Deployment Guide

## ✅ What's Configured

1. **Vercel Configuration** (`vercel.json`)
   - Build command: `npm run build`
   - Output directory: `dist/public`
   - API routes configured for serverless functions
   - CORS headers enabled

2. **API Routes** (in `api/` directory)
   - `POST /api/transcripts` - Create a new transcript
   - `GET /api/transcripts` - Get all transcripts (with optional `?meetingId=xxx` filter)
   - `GET /api/transcripts/:id` - Get a specific transcript

3. **Dependencies**
   - Added `@vercel/node` for TypeScript support in serverless functions
   - Updated `tsconfig.json` to include `api/` directory

## ⚠️ Important: Socket.IO Limitation

**Your application uses Socket.IO for real-time meeting synchronization, which has limitations on Vercel:**

### The Problem
- Vercel serverless functions are **stateless** and **short-lived**
- Socket.IO requires **persistent WebSocket connections**
- Serverless functions cannot maintain long-running connections

### Solutions

#### Option 1: Separate Socket.IO Server (Recommended)
Deploy your Socket.IO server separately on a platform that supports WebSockets:
- **Railway** (https://railway.app) - Easy deployment, supports WebSockets
- **Render** (https://render.com) - Free tier available
- **Fly.io** (https://fly.io) - Good for WebSocket apps
- **DigitalOcean App Platform** - Supports persistent connections

**Steps:**
1. Keep your Socket.IO server code in `server/routes.ts`
2. Deploy only the Socket.IO server to Railway/Render
3. Update your frontend to connect to the separate Socket.IO server URL
4. Deploy the frontend + API routes to Vercel

#### Option 2: Use Vercel's Edge Functions (Limited)
- Vercel Edge Functions support WebSockets but with limitations
- May require significant code refactoring
- Not ideal for complex Socket.IO applications

#### Option 3: Alternative Real-time Solutions
Consider using:
- **Pusher** (https://pusher.com) - Managed WebSocket service
- **Ably** (https://ably.com) - Real-time messaging platform
- **Supabase Realtime** - If using Supabase

## 🚀 Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel:**
   ```bash
   npx vercel
   ```
   Or connect your GitHub repository to Vercel for automatic deployments.

4. **Environment Variables:**
   - Set any required environment variables in Vercel dashboard
   - Example: Database connection strings, API keys, etc.

## 📝 Notes

- The API routes use in-memory storage (`MemStorage`), which means data won't persist across deployments
- For production, consider using a database (PostgreSQL, MongoDB, etc.)
- The build process creates both the client bundle and serverless functions
- Static files are served from `dist/public`

## 🔧 Current Storage Implementation

The app currently uses in-memory storage. For production, you should:
1. Set up a database (PostgreSQL recommended based on your schema)
2. Update `server/storage.ts` to use a database adapter
3. Configure database connection via environment variables

