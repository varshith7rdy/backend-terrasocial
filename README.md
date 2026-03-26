# TerraTrack API - Setup Guide

## Project Overview
This is the backend API for TerraTrack, a community-driven environmental tracking application built with Node.js, Express, and Snowflake.

## Prerequisites
- Node.js (v14 or higher)
- npm
- Snowflake account with database and warehouse

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your Snowflake credentials:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` with your Snowflake connection details

3. **Create Snowflake database schema**
   - Connect to your Snowflake account
   - Run the SQL commands from `schema.sql` to create all necessary tables

## Running the Server

Start the development server:
```bash
npm start
```

The server will run on `http://localhost:3000` (or the PORT specified in `.env`)

## API Endpoints

### Authentication
- `POST /auth/login` - Login and get JWT token
- `POST /auth/register` - Register new user

### User Profile
- `GET /users/me` - Get current user profile (requires authentication)

### Trees
- `GET /trees` - Get all trees planted globally
- `POST /trees` - Plant a new tree (requires authentication)

### Guilds
- `GET /guilds` - Get available guilds
- `POST /guilds/:id/join` - Join or leave a guild (requires authentication)

### Leaderboard
- `GET /leaderboard` - Get global leaderboard (requires authentication)

## Authentication

All endpoints except `/auth/login` and `/auth/register` require a valid JWT token.

Include the token in the request header:
```
Authorization: Bearer <your_jwt_token>
```

## Database Schema

The application uses the following main tables:
- `users` - User accounts
- `user_stats` - User statistics and rankings
- `trees` - Planted trees
- `guilds` - User communities
- `guild_members` - Guild membership
- `activities` - User activities log
- `user_timeline` - User milestones and achievements

## Security Notes

⚠️ **Important for Production:**
- Replace the default JWT_SECRET with a strong, unique secret
- Use bcrypt for password hashing (currently using plain text for demo)
- Implement rate limiting to prevent abuse
- Add CORS configuration as needed
- Use HTTPS in production
- Implement input validation and sanitization
