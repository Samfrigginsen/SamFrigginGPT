const socket = io();
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdmin = false;
let isPainting = false;
let paintEnabled = false;
let selectedUser = '';

const systemLogs = [
    '[DISK_CHECK] Found storage device',
    '[MEMORY_CHECK] 640K OK',
    '[SYSTEM_BOOT] Initializing terminal interface...',
    '[NETWORK_CHECK] Establishing connection...',
    '[AUTH_SUCCESS] User authenticated',
    '[SAM_NEURON_ACTIVE] Neural network online',
    '[LATENCY_HIGH_COFFEE_REQUIRED] System ready',
    '[SECURITY_SCAN] All systems nominal'
];

function addSystemLog(log) {
    const statusContainer = document.getElementById('systemStatus');
    const logLine = document.createElement('div');
    logLine.className = 'status-line';
    logLine.textContent = log;
    statusContainer.appendChild(logLine);
    
    if (statusContainer.children.length > 8) {
        statusContainer.removeChild(statusContainer.firstChild);
    }
    
    statusContainer.scrollTop = statusContainer.scrollHeight;
}

function animateSystemLogs() {
    systemLogs.forEach((log, index) => {
        setTimeout(() => addSystemLog(log), index * 300);
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
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
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'block';
    
    if (isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminUsers();
        setInterval(loadAdminUsers, 30000);
    } else {
        document.getElementById('adminPanel').style.display = 'none';
    }
    
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
    const messagesDiv = document.getElementById('userMessages');
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

function loadAdminUsers() {
    fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(users => {
        const userSelect = document.getElementById('userSelect');
        
        userSelect.innerHTML = '<option value="">Select User...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });
    })
    .catch(err => {
        console.error('[ERROR] Failed to load admin users');
    });
}

function loadUserMessages() {
    const userSelect = document.getElementById('userSelect');
    selectedUser = userSelect.value;
    
    if (!selectedUser) return;
    
    fetch(`/api/admin/messages/${selectedUser}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(messages => {
        const messagesDiv = document.getElementById('adminMessages');
        messagesDiv.innerHTML = '';
        messages.forEach(msg => addAdminMessage(msg));
    })
    .catch(err => {
        console.error('[ERROR] Failed to load user messages');
    });
}

function addAdminMessage(message) {
    const messagesDiv = document.getElementById('adminMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.is_from_sam ? 'sam' : ''}`;
    
    const sender = message.is_from_sam ? 'SAM' : message.username;
    const timestamp = new Date(message.created_at).toLocaleTimeString();
    
    messageDiv.innerHTML = `<strong>[${timestamp}] ${sender}:</strong> ${message.content}`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendAdminReply() {
    const userSelect = document.getElementById('userSelect');
    const targetUser = userSelect.value;
    
    if (!targetUser) {
        alert('Please select a user first');
        return;
    }
    
    const content = prompt('Enter your reply as SAM:');
    if (!content) return;
    
    fetch('/api/admin/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: targetUser, content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addAdminMessage(data.message);
        }
    })
    .catch(err => {
        console.error('[ERROR] Failed to send reply');
    });
}

function grantPaintPermission() {
    const userSelect = document.getElementById('userSelect');
    const targetUser = userSelect.value;
    
    if (!targetUser) {
        alert('Please select a user first');
        return;
    }
    
    fetch('/api/admin/grant-paint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: targetUser })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addSystemLog(`[PAINT_UNLOCK] Granted to ${targetUser}`);
        }
    })
    .catch(err => {
        console.error('[ERROR] Failed to grant paint permission');
    });
}

function enablePaintMode() {
    paintEnabled = true;
    document.getElementById('paintControls').style.display = 'block';
    addSystemLog('[PAINT_UNLOCK] Paint mode enabled');
}

function togglePaint() {
    isPainting = !isPainting;
    const canvas = document.getElementById('paintCanvas');
    canvas.classList.toggle('active', isPainting);
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
    isAdmin = data.isAdmin || false;
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

socket.on('new_user_message', (data) => {
    if (isAdmin) {
        addSystemLog(`[NEW_MESSAGE] ${data.username}: ${data.content.substring(0, 30)}...`);
    }
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
