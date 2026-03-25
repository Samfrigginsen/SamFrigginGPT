const socket = io();
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isPainting = false;
let paintEnabled = false;

const systemLogs = [
    '[SYSTEM_BOOT] Initializing terminal interface...',
    '[MEMORY_CHECK] 640K OK',
    '[DISK_CHECK] Found storage device',
    '[NETWORK_CHECK] Establishing connection...',
    '[AUTH_SUCCESS] User authenticated',
    '[SAM_NEURON_ACTIVE] Neural network online',
    '[LATENCY_HIGH_COFFEE_REQUIRED] System ready',
    '[SECURITY_SCAN] All systems nominal',
    '[THREAD_ROUTER] Discord integration active'
];

function addSystemLog(log) {
    const logsContainer = document.getElementById('systemLogs');
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.textContent = log;
    logsContainer.appendChild(logLine);
    
    if (logsContainer.children.length > 8) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
    
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function animateSystemLogs() {
    systemLogs.forEach((log, index) => {
        setTimeout(() => addSystemLog(log), index * 300);
    });
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    setTimeout(() => {
        errorDiv.textContent = '';
    }, 5000);
}

function register() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('[INVALID_INPUT] All fields required');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showError('[INVALID_INPUT] Username 3-20 chars');
        return;
    }
    
    fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            token = data.token;
            username = data.username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            authenticateWithSocket();
        }
    })
    .catch(err => {
        showError('[SYSTEM_ERROR] Registration failed');
    });
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('[INVALID_INPUT] All fields required');
        return;
    }
    
    fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            token = data.token;
            username = data.username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            authenticateWithSocket();
        }
    })
    .catch(err => {
        showError('[SYSTEM_ERROR] Login failed');
    });
}

function authenticateWithSocket() {
    socket.emit('authenticate', token);
}

function showChatInterface() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'block';
    updateStatus(`[CONNECTED] User: ${username}`);
    loadMessages();
    checkPaintPermission();
}

function loadMessages() {
    fetch(`/api/messages/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(messages => {
        messages.forEach(msg => addMessage(msg));
    })
    .catch(err => {
        console.error('[ERROR] Failed to load messages');
    });
}

function addMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.is_from_sam ? 'sam' : ''}`;
    
    const sender = message.is_from_sam ? 'SAM' : message.username;
    const timestamp = new Date(message.created_at).toLocaleTimeString();
    
    messageDiv.innerHTML = `<strong>[${timestamp}] ${sender}:</strong> ${message.content}`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    socket.emit('message', { content });
    input.value = '';
}

function checkPaintPermission() {
    fetch('/api/paint-permission', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.hasPermission) {
            enablePaintMode();
        }
    });
}

function enablePaintMode() {
    paintEnabled = true;
    document.getElementById('paintControls').classList.add('active');
    addSystemLog('[PAINT_UNLOCK] Paint mode enabled');
}

function togglePaint() {
    isPainting = !isPainting;
    const canvas = document.getElementById('paintCanvas');
    canvas.classList.toggle('active', isPainting);
    updateStatus(isPainting ? '[PAINT_MODE] Drawing enabled' : `[CONNECTED] User: ${username}`);
}

function clearCanvas() {
    const canvas = document.getElementById('paintCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('paint_data', { type: 'clear' });
}

// Paint functionality
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
let lastX = 0;
let lastY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousedown', (e) => {
    if (!isPainting || !paintEnabled) return;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isPainting || !paintEnabled) return;
    
    const color = document.getElementById('colorPicker').value;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    
    socket.emit('paint_data', {
        type: 'draw',
        fromX: lastX,
        fromY: lastY,
        toX: e.clientX,
        toY: e.clientY,
        color: color
    });
    
    lastX = e.clientX;
    lastY = e.clientY;
});

// Socket event handlers
socket.on('authenticated', (data) => {
    username = data.username;
    showChatInterface();
});

socket.on('auth_error', (data) => {
    showError(data.error);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
});

socket.on('message_sent', (message) => {
    addMessage(message);
});

socket.on('sam_response', (message) => {
    addMessage(message);
    addSystemLog('[SAM_REPLY] Response received');
});

socket.on('paint_permission_granted', () => {
    enablePaintMode();
});

socket.on('paint_update', (data) => {
    if (data.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (data.type === 'draw') {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(data.fromX, data.fromY);
        ctx.lineTo(data.toX, data.toY);
        ctx.stroke();
    }
});

socket.on('error', (data) => {
    showError(data.error);
});

// Input handlers
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

// Initialize
animateSystemLogs();

if (token) {
    authenticateWithSocket();
} else {
    updateStatus('[AUTH_REQUIRED] Please login or register');
}
