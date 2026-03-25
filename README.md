# SAMFRIGGINGPT - Brutalist Terminal Chat

A deliberately crude terminal-style web experience with direct admin interface and enterprise-grade security.

## Features

- **Brutalist Design**: Raw terminal aesthetic with ASCII art and monospace fonts
- **Secure Authentication**: JWT tokens with bcrypt password hashing
- **Direct Admin Interface**: Built-in web panel for user management
- **Paint Overlay**: Privileged drawing feature controlled via admin panel
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

3. Configure server settings in `.env`:
   - Set JWT secret (minimum 32 characters)
   - Configure port and database path

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

## Admin Interface

The built-in admin system provides complete user management:
- Admin usernames: `sam`, `admin`, `samfrigginsen`
- View all active users and their activity
- Reply as SAM directly through web interface
- Grant paint permissions to specific users
- Real-time notifications for new messages

## Paint Permission System

Only admin users can grant paint permissions:
1. Admin logs in with admin username
2. Select user from admin panel
3. Click "GRANT PAINT" button
4. User receives paint capability immediately

## Security Features

- **Rate Limiting**: 5 login attempts per minute, then 1-hour block
- **Input Sanitization**: All user input sanitized with DOMPurify
- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure session management
- **Environment Variables**: Secrets never exposed in code

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

- `JWT_SECRET`: Minimum 32 characters for JWT signing
- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database file path
- `NODE_ENV`: Environment (development/production)

## License

MIT
