const socket = io();

let currentUser = '';
let isTyping = false;
let typingTimeout;

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const currentUserSpan = document.getElementById('currentUser');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');
const typingIndicator = document.getElementById('typingIndicator');

// Generate unique username for each tab
function generateUniqueUsername() {
  const adjectives = ['Happy', 'Clever', 'Brave', 'Wise', 'Swift', 'Bright', 'Calm', 'Eager', 'Friendly', 'Gentle'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Bear', 'Fox', 'Owl', 'Deer'];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
}

usernameInput.value = generateUniqueUsername();

// Join chat
joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (username) {
    currentUser = username;
    socket.emit('join', username);
    showChatScreen();
  }
});

usernameInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') joinBtn.click();
});

// Leave chat
leaveBtn.addEventListener('click', () => {
  socket.disconnect();
  showLoginScreen();
  clearMessages();
  clearUserList();
});

// Send message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Typing indicator
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing');
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit('stopTyping');
  }, 1000);
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (message && currentUser) {
    socket.emit('message', message);
    messageInput.value = '';
    socket.emit('stopTyping');
    // Button visual pop
    sendBtn.style.transform = 'scale(0.95)';
    setTimeout(() => sendBtn.style.transform = 'translateY(-2px)', 100);
  }
}

// Socket events
socket.on('connect', () => console.log('Connected to server'));
socket.on('disconnect', () => console.log('Disconnected from server'));

socket.on('messageHistory', messages => {
  clearMessages();
  messages.forEach(addMessage);
  scrollToBottom();
});

socket.on('message', message => {
  addMessage(message, true);
});

socket.on('messageEdited', ({ id, newMessage }) => {
  // Update message content in UI by id
  const msgDiv = messagesDiv.querySelector(`.message[data-message-id="${id}"]`);
  if (msgDiv) {
    const contentDiv = msgDiv.querySelector('.message-content');
    contentDiv.textContent = newMessage;
  }
});

socket.on('userJoined', username => addSystemMessage(`${username} joined the chat`));
socket.on('userLeft', username => addSystemMessage(`${username} left the chat`));

socket.on('userList', updateUserList);

socket.on('typing', username => {
  if (username !== currentUser) {
    typingIndicator.textContent = `${username} is typing...`;
    typingIndicator.style.opacity = '1';
  }
});

socket.on('stopTyping', () => {
  typingIndicator.style.opacity = '0';
  setTimeout(() => { typingIndicator.textContent = ''; }, 300);
});

socket.on('error', err => {
  alert(err);
  usernameInput.value = generateUniqueUsername();
});

// UI Helpers

function showChatScreen() {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  currentUserSpan.textContent = currentUser;
  messageInput.focus();
}

function showLoginScreen() {
  chatScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  currentUser = '';
  usernameInput.value = '';
}

function addMessage(message, isNew = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.username === currentUser ? 'own' : 'other'}`;
  messageDiv.dataset.messageId = message.id;

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="username">${message.username}</span>
      <span class="timestamp">${message.timestamp}</span>
      ${message.username === currentUser ? '<button class="edit-btn">Edit</button>' : ''}
    </div>
    <div class="message-content">${escapeHtml(message.message)}</div>
  `;

  messagesDiv.appendChild(messageDiv);

  if (isNew) {
    messageDiv.classList.add('new');
    setTimeout(() => messageDiv.classList.remove('new'), 600);
  }

  if (message.username === currentUser) {
    const editBtn = messageDiv.querySelector('.edit-btn');
    const messageContent = messageDiv.querySelector('.message-content');

    editBtn.addEventListener('click', () => {
      startEditing(messageDiv, messageContent, message);
    });
  }
}

function startEditing(messageDiv, messageContent, message) {
  messageContent.innerHTML = `
    <textarea class="edit-input">${escapeHtml(message.message)}</textarea>
    <div class="edit-actions">
      <button class="save-btn">Save</button>
      <button class="cancel-btn">Cancel</button>
    </div>
  `;

  const saveBtn = messageContent.querySelector('.save-btn');
  const cancelBtn = messageContent.querySelector('.cancel-btn');
  const textarea = messageContent.querySelector('.edit-input');

  textarea.focus();
  textarea.selectionStart = textarea.value.length;

  saveBtn.addEventListener('click', () => {
    const newMessage = textarea.value.trim();
    if (newMessage && newMessage !== message.message) {
      socket.emit('editMessage', { id: message.id, newMessage });
      message.message = newMessage; // optimistically update local message
      finishEditing(messageDiv, messageContent, message);
    } else {
      finishEditing(messageDiv, messageContent, message);
    }
  });

  cancelBtn.addEventListener('click', () => {
    finishEditing(messageDiv, messageContent, message);
  });
}

function finishEditing(messageDiv, messageContent, message) {
  messageContent.textContent = message.message;
}

function addSystemMessage(text) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'system-message';
  systemMsg.textContent = text;
  messagesDiv.appendChild(systemMsg);
}

function updateUserList(users) {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    if (user === currentUser) {
      li.style.fontWeight = 'bold';
      li.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
      li.style.color = 'white';
    }
    userList.appendChild(li);
  });
}

function clearMessages() { messagesDiv.innerHTML = ''; }
function clearUserList() { userList.innerHTML = ''; }

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
