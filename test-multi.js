const io = require('socket.io-client');

function generateRandomUsername() {
  const adjectives = ['Cool', 'Smart', 'Swift', 'Crazy', 'Silent'];
  const animals = ['Tiger', 'Eagle', 'Shark', 'Panther', 'Wolf'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${animal}${num}`;
}

function testUser(username) {
  const socket = io('http://localhost:3000');

  socket.on('connect', () => {
    const userToUse = username || generateRandomUsername();
    console.log(`${userToUse} connected`);
    socket.emit('join', userToUse);
  });

  socket.on('messageHistory', (messages) => {
    console.log(`${username || 'User'} received ${messages.length} message history`);
  });

  socket.on('message', (message) => {
    console.log(`${username || 'User'} received: ${message.username}: ${message.message}`);
  });

  socket.on('userJoined', (user) => {
    console.log(`${username || 'User'} sees ${user} joined`);
  });

  socket.on('userLeft', (user) => {
    console.log(`${username || 'User'} sees ${user} left`);
  });

  socket.on('userList', (users) => {
    console.log(`${username || 'User'} sees users:`, users);
  });

  setTimeout(() => {
    socket.emit('message', `Hello from ${username || 'User'}!`);
  }, 2000);

  return socket;
}

console.log('Starting multi-user test with random usernames...');
const user1 = testUser();
const user2 = testUser();
const user3 = testUser();
const user4 = testUser();
const user5 = testUser();

setTimeout(() => {
  console.log('Test completed');
  user1.disconnect();
  user2.disconnect();
  user3.disconnect();
  user4.disconnect();
  user5.disconnect();
  process.exit(0);
}, 15000);
