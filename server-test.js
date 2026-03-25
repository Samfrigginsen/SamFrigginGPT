const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const window = new JSDOM('').window;
const dompurify = createDOMPurify(window);

const db = new sqlite3.Database(process.env.DB_PATH || './database/samfriggingpt.db');

const userSockets = new Map();
const userPaintPermissions = new Map();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: '[RATE_LIMIT_EXCEEDED] Too many attempts. Try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      is_from_sam INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '[ACCESS_DENIED] No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '[ACCESS_DENIED] Invalid token' });
    }
    req.user = user;
    next();
  });
}

app.post('/auth/register', limiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '[INVALID_INPUT] Username and password required' });
  }
  
  const sanitizedUsername = dompurify.sanitize(username);
  
  if (sanitizedUsername !== username || username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: '[INVALID_INPUT] Invalid username' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [sanitizedUsername, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '[USERNAME_TAKEN] Choose another username' });
        }
        return res.status(500).json({ error: '[DATABASE_ERROR] Registration failed' });
      }
      
      const token = jwt.sign({ username: sanitizedUsername, id: this.lastID }, process.env.JWT_SECRET);
      res.json({ token, username: sanitizedUsername });
    });
  } catch (error) {
    res.status(500).json({ error: '[SYSTEM_ERROR] Registration failed' });
  }
});

app.post('/auth/login', limiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '[INVALID_INPUT] Username and password required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '[AUTH_FAILED] Invalid credentials' });
    }
    
    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: '[AUTH_FAILED] Invalid credentials' });
      }
      
      const token = jwt.sign({ username: user.username, id: user.id }, process.env.JWT_SECRET);
      res.json({ token, username: user.username });
    } catch (error) {
      res.status(500).json({ error: '[SYSTEM_ERROR] Login failed' });
    }
  });
});

app.get('/api/messages/:username', authenticateToken, (req, res) => {
  const { username } = req.params;
  
  if (req.user.username !== username) {
    return res.status(403).json({ error: '[ACCESS_DENIED] Cannot access other users\' messages' });
  }
  
  db.all('SELECT * FROM messages WHERE username = ? ORDER BY created_at ASC', [username], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: '[DATABASE_ERROR] Failed to load messages' });
    }
    res.json(messages);
  });
});

app.get('/api/paint-permission', authenticateToken, (req, res) => {
  const hasPermission = userPaintPermissions.get(req.user.username) || false;
  res.json({ hasPermission });
});

// Mock Sam responses for testing
const samResponses = [
  "Interesting question. Let me process that...",
  "I see what you're getting at. Here's my take:",
  "From my perspective, that makes sense.",
  "Have you considered the alternative approaches?",
  "That reminds me of something important..."
];

io.on('connection', (socket) => {
  console.log(`[SOCKET_CONNECT] New connection: ${socket.id}`);
  
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userSockets.set(decoded.username, socket.id);
      socket.username = decoded.username;
      console.log(`[AUTH_SUCCESS] ${decoded.username} authenticated`);
      socket.emit('authenticated', { username: decoded.username });
    } catch (error) {
      socket.emit('auth_error', { error: '[ACCESS_DENIED] Invalid token' });
      socket.disconnect();
    }
  });
  
  socket.on('message', (data) => {
    if (!socket.username) {
      socket.emit('error', { error: '[ACCESS_DENIED] Not authenticated' });
      return;
    }
    
    const sanitizedContent = dompurify.sanitize(data.content);
    
    db.run('INSERT INTO messages (username, content, is_from_sam) VALUES (?, ?, ?)', 
      [socket.username, sanitizedContent, 0], function(err) {
      if (err) {
        socket.emit('error', { error: '[DATABASE_ERROR] Message not saved' });
        return;
      }
      
      const message = {
        id: this.lastID,
        username: socket.username,
        content: sanitizedContent,
        is_from_sam: 0,
        created_at: new Date().toISOString()
      };
      
      socket.emit('message_sent', message);
      
      // Mock Sam response after 2 seconds
      setTimeout(() => {
        const response = samResponses[Math.floor(Math.random() * samResponses.length)];
        db.run('INSERT INTO messages (username, content, is_from_sam) VALUES (?, ?, ?)', 
          [socket.username, response, 1], function(err) {
          if (!err) {
            const samMessage = {
              id: this.lastID,
              username: socket.username,
              content: response,
              is_from_sam: 1,
              created_at: new Date().toISOString()
            };
            socket.emit('sam_response', samMessage);
            console.log(`[SAM_REPLY] Mock response sent to ${socket.username}`);
          }
        });
      }, 2000);
    });
  });
  
  socket.on('paint_data', (data) => {
    if (!socket.username) {
      socket.emit('error', { error: '[ACCESS_DENIED] Not authenticated' });
      return;
    }
    
    const hasPermission = userPaintPermissions.get(socket.username) || false;
    if (!hasPermission) {
      socket.emit('error', { error: '[ACCESS_DENIED] Paint permission required' });
      return;
    }
    
    socket.broadcast.emit('paint_update', data);
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      userSockets.delete(socket.username);
      console.log(`[SOCKET_DISCONNECT] ${socket.username} disconnected`);
    }
  });
});

function startServer() {
  initializeDatabase();
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[SERVER_READY] Terminal active on port ${PORT}`);
    console.log(`[MODE] Running without Discord integration for testing`);
  });
}

startServer();
