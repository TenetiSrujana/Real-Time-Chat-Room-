const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const users = new Map();
const messages = [];

// 🌟 Fake message history
const mockMessages = [
  {
    id: Date.now() - 3600000,
    username: 'Srujana',
    message: 'Hey everyone! How was your day?',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3500000,
    username: 'bubby',
    message: 'Good! I worked on a real-time chat app',
    timestamp: new Date(Date.now() - 3500000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3400000,
    username: 'sanjana',
    message: 'That sounds awesome! What tech stack are you using?',
    timestamp: new Date(Date.now() - 3400000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3300000,
    username: 'malika',
    message: 'Node.js, Express, and Socket.IO for sure!',
    timestamp: new Date(Date.now() - 3300000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3200000,
    username: 'bubby',
    message: 'And React for the frontend ✨',
    timestamp: new Date(Date.now() - 3200000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3100000,
    username: 'bhasker',
    message: 'How\'s the deployment going?',
    timestamp: new Date(Date.now() - 3100000).toLocaleTimeString()
  },
  {
    id: Date.now() - 3000000,
    username: 'srujana',
    message: 'You must be deploying right now, right? 😄',
    timestamp: new Date(Date.now() - 3000000).toLocaleTimeString()
  },
  {
    id: Date.now() - 2900000,
    username: 'bubby',
    message: 'You guessed it!',
    timestamp: new Date(Date.now() - 2900000).toLocaleTimeString()
  },
  {
    id: Date.now() - 2880000,
    username: 'sanjana',
    message: 'Can’t wait to see it live 🚀',
    timestamp: new Date(Date.now() - 2880000).toLocaleTimeString()
  }
];

messages.push(...mockMessages);

// Log app state
function logState(event) {
  console.log(`\n--- ${event} ---`);
  console.log('👥 Users:', Array.from(users.values()));
  console.log('💬 Messages:', messages.length);
  console.log('---------------------\n');
}

// 🔌 Socket.IO handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  logState('User connected');

  socket.on('join', (username) => {
    if (!username || typeof username !== 'string' || !username.trim()) {
      socket.emit('error', 'Invalid username');
      return;
    }

    username = username.trim();

    const nameTaken = Array.from(users.values()).some(
      name => name.toLowerCase() === username.toLowerCase()
    );
    if (nameTaken) {
      socket.emit('error', 'Username already taken');
      return;
    }

    users.set(socket.id, username);
    socket.username = username;

    console.log(`✅ ${username} joined`);
    socket.emit('joinSuccess', username);
    socket.emit('messageHistory', messages);
    socket.broadcast.emit('userJoined', username);
    io.emit('userList', Array.from(users.values()));
    logState('User joined');
  });

  // 💌 Handle new messages
  socket.on('message', (messageText) => {
    if (!socket.username || typeof messageText !== 'string') return;

    const newMsg = {
      id: Date.now() + Math.random(),
      username: socket.username,
      message: messageText,
      timestamp: new Date().toLocaleTimeString()
    };

    messages.push(newMsg);
    io.emit('message', newMsg);
    logState('Message sent');

    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
  });

  // ✍️ Handle editing messages
  socket.on('editMessage', ({ id, newMessage }) => {
    const msg = messages.find(m => m.id === id && m.username === socket.username);
    if (msg && typeof newMessage === 'string' && newMessage.trim()) {
      msg.message = newMessage.trim();
      io.emit('messageEdited', { id, newMessage: msg.message });
      logState(`Message edited by ${socket.username}`);
    }
  });

  // ✍️ Typing status
  socket.on('typing', () => {
    if (socket.username) {
      socket.broadcast.emit('typing', socket.username);
    }
  });

  socket.on('stopTyping', () => {
    if (socket.username) {
      socket.broadcast.emit('stopTyping', socket.username);
    }
  });

  // ❌ Handle disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    if (username) {
      io.emit('userLeft', username);
      io.emit('userList', Array.from(users.values()));
      console.log(`${username} disconnected`);
      logState('User disconnected');
    }
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeUsers: Array.from(users.values()),
    totalMessages: messages.length,
    mockMessages: mockMessages.length,
    realMessages: messages.length - mockMessages.length
  });
});

// 📊 Stats API
app.get('/api/stats', (req, res) => {
  res.json({
    totalMessages: messages.length,
    mockMessages: mockMessages.length,
    realMessages: messages.length - mockMessages.length,
    activeUsers: users.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 🔥 Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🎭 Test:  http://localhost:${PORT}/test`);
});
