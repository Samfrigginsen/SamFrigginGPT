# SAMFRIGGINGPT - Brutalist Terminal Chat

A deliberately crude terminal-style web experience with Discord-based multi-user routing and enterprise-grade security.

## Features

- **Brutalist Design**: Raw terminal aesthetic with ASCII art and monospace fonts
- **Secure Authentication**: JWT tokens with bcrypt password hashing
- **Discord Integration**: Thread-based routing for multiple users
- **Paint Overlay**: Privileged drawing feature controlled via Discord commands
- **Rate Limiting**: Protection against brute force attacks
- **WebSocket Chat**: Real-time messaging with character-by-character delivery
- **SQLite Database**: Simple, reliable data storage with automated backups

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure Discord bot:
   - Create a Discord bot at https://discord.com/developers/applications
   - Enable Message Content intent
   - Get bot token, channel ID, and your user ID
   - Update `.env` with your credentials

4. Create database directory:
```bash
mkdir database
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Discord Integration

The bot automatically creates private threads for each user:
- New user messages create `User_Username` threads
- Replies in threads route back to specific users
- Paint permission command: `did you know you can paint over the site and shit`

## Security Features

- **Rate Limiting**: 5 login attempts per minute, then 1-hour block
- **Input Sanitization**: All user input sanitized with DOMPurify
- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure session management
- **Environment Variables**: Secrets never exposed in code

## Paint Permission System

Only the Discord owner (your user ID) can grant paint permissions:
1. User sends message to site
2. Bot creates `User_Username` thread
3. Send `did you know you can paint over the site and shit` in that thread
4. User receives paint capability in their browser session

## Backup System

Automated database backups:
```bash
npm run backup
```
Keeps last 10 backups in `./backups/` directory.

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production` in `.env`
2. Use PM2 or similar process manager
3. Configure reverse proxy with SSL (Let's Encrypt)
4. Set up automated backups via cron

## Environment Variables

- `DISCORD_BOT_TOKEN`: Your Discord bot token
- `DISCORD_CHANNEL_ID`: Channel for thread creation
- `DISCORD_USER_ID`: Your Discord user ID (for paint permissions)
- `JWT_SECRET`: Minimum 32 characters for JWT signing
- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database file path

## License

MIT
