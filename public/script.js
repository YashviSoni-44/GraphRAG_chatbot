// ========================
// Global State Variables
// ========================

function getSessionId() {
  let sessionId = localStorage.getItem('graphbot_session_id');
  if (!sessionId) {
    if (window.crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    localStorage.setItem('graphbot_session_id', sessionId);
  }
  return sessionId;
}
const SESSION_ID = getSessionId();

let chatSessions = {}; // chatId: { label, messages, fileName }
let activeChatId = null;
let uploadedFiles = [];

const fileListElement = document.getElementById('fileList');
const activeFileSpan = document.getElementById('activeFile');
const chatbox = document.getElementById('chatbox');
const uploadStatus = document.getElementById('uploadStatus');
const askForm = document.getElementById('askForm');
const questionInput = document.getElementById('question');

// -------------------------------------------------------
// Utilities
// -------------------------------------------------------

function generateChatId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'chat-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function saveChatSessions() {
  try {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    localStorage.setItem('activeChatId', activeChatId);
  } catch (e) {
    // ignore
  }
}

function loadChatSessions() {
  try {
    const savedSessions = localStorage.getItem('chatSessions');
    const savedActive = localStorage.getItem('activeChatId');
    if (savedSessions) chatSessions = JSON.parse(savedSessions);
    if (savedActive && chatSessions[savedActive]) activeChatId = savedActive;
    else {
      const ids = Object.keys(chatSessions);
      activeChatId = ids.length > 0 ? ids[0] : null;
    }
  } catch (e) {
    chatSessions = {};
    activeChatId = null;
  }
}

function saveUploadedFiles() {
  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
}
function loadUploadedFiles() {
  const saved = localStorage.getItem('uploadedFiles');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // ignore
    }
  }
  return [];
}

// -------------------------------------------------------
// Sidebar Chat List Handling
// -------------------------------------------------------

function renderChatList() {
  fileListElement.innerHTML = '';

  // Separate file chats and plain chats for ordered display
  const [fileChats, plainChats] = Object.entries(chatSessions).reduce(([fileArr, plainArr], [id, chat]) => {
    if (chat.fileName) fileArr.push([id, chat]);
    else plainArr.push([id, chat]);
    return [fileArr, plainArr];
  }, [[], []]);

  function appendItem([chatId, chat]) {
    const li = document.createElement('li');
    li.dataset.chatId = chatId;
    li.style.cursor = "pointer";

    const container = document.createElement('span');
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "space-between";

    let displayLabel = chat.label;
    if (!displayLabel) {
      displayLabel = chat.fileName ? chat.fileName.split('/').pop() : "New Chat";
    }
    if (displayLabel.length > 30) displayLabel = displayLabel.slice(0, 27) + "...";

    const chatLabelSpan = document.createElement('span');
    chatLabelSpan.textContent = displayLabel;
    chatLabelSpan.style.flex = "1 1 auto";
    chatLabelSpan.style.paddingRight = "8px";
    chatLabelSpan.addEventListener('click', () => setActiveChat(chatId));

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '&times;';
    delBtn.title = `Delete chat "${displayLabel}"`;
    delBtn.setAttribute('aria-label', `Delete chat "${displayLabel}"`);
    delBtn.style.background = "transparent";
    delBtn.style.color = "#aa366b";
    delBtn.style.fontSize = "18px";
    delBtn.style.border = "none";
    delBtn.style.cursor = "pointer";
    delBtn.style.padding = "0px 6px";
    delBtn.style.borderRadius = "50%";
    delBtn.style.width = "22px";
    delBtn.style.height = "22px";
    delBtn.style.lineHeight = "18px";
    delBtn.style.marginLeft = "6px";
    delBtn.style.opacity = "0.82";
    delBtn.style.transition = "background 0.14s";
    delBtn.style.boxSizing = "border-box";
    delBtn.style.display = "inline-flex";
    delBtn.style.justifyContent = "center";
    delBtn.style.alignItems = "center";

    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = window.confirm(`Are you sure you want to delete chat "${displayLabel}" and its data? This cannot be undone.`);
      if (!confirmed) return;
      if (chat.fileName) {
        // Delete file chat - call backend to delete file nodes etc.
        await deleteFileAndChat(chat.fileName);
      } else {
        // Delete plain chat - call backend endpoint to delete chat session + messages
        await deleteRegularChatSession(chatId, chat);
      }
    });
    delBtn.addEventListener('mouseover', () => delBtn.style.background = "#f7bdd2");
    delBtn.addEventListener('mouseout', () => delBtn.style.background = "transparent");

    container.appendChild(chatLabelSpan);
    container.appendChild(delBtn);
    li.appendChild(container);

    if (chatId === activeChatId) {
      li.classList.add('active-file');
    } else {
      li.classList.remove('active-file');
    }

    fileListElement.appendChild(li);
  }

  fileChats.forEach(appendItem);
  plainChats.forEach(appendItem);
}

function setActiveChat(chatId) {
  if (!chatSessions[chatId]) return;
  activeChatId = chatId;
  const chat = chatSessions[chatId];
  activeFileSpan.textContent = chat.label || (chat.fileName ? chat.fileName.split('/').pop() : "New Chat");
  renderChatList();
  renderChatHistory(chatId); // Always fully re-render history
  updateClearChatBtnState();

  questionInput.value = '';
  questionInput.focus();
}

async function deleteRegularChatSession(chatId, chat) {
  try {
    // Compose chat session key for deletion - must match backend stored 'file_name'
    let chatKey = chat.fileName;
    // If no filename, construct default chat key similar to backend naming
    if (!chatKey) {
      chatKey = `${SESSION_ID}__default_chat`;
    }
    const resp = await fetch('/api/chat/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID},
      body: JSON.stringify({ file_name: chatKey, sessionId: SESSION_ID }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || "Failed to delete chat from server.");
      return;
    }
    deleteChatSession(chatId);
    uploadStatus.textContent = data.message || "Chat deleted successfully.";
  } catch (err) {
    alert(`Deletion failed: ${err.message || err}`);
  }
}

function deleteChatSession(chatId) {
  if (!chatSessions[chatId]) return;
  delete chatSessions[chatId];
  if (activeChatId === chatId) {
    const ids = Object.keys(chatSessions);
    if (ids.length > 0) setActiveChat(ids[0]);
    else {
      activeChatId = null;
      activeFileSpan.textContent = "None";
      chatbox.innerHTML = '';
    }
  }
  renderChatList();
  updateClearChatBtnState();
  saveChatSessions();
}

function updateChatLabelOnFirstUserMessage(chatId, questionText) {
  const chat = chatSessions[chatId];
  if (!chat) return;
  if (!chat.label && !chat.fileName) {
    chat.label = questionText.length > 30 ? questionText.slice(0, 27) + "..." : questionText;
    saveChatSessions();
    renderChatList();
    if (chatId === activeChatId) activeFileSpan.textContent = chat.label;
  }
}

// -------------------------------------------------------
// Chat Rendering
// -------------------------------------------------------

function renderChatHistory(chatId) {
  chatbox.innerHTML = "";
  const chat = chatSessions[chatId];
  if (!chat) return;
  chat.messages.forEach(({role, content}) => {
    const msgNode = createMessageElement(role, content);
    chatbox.appendChild(msgNode);
  });
  chatbox.scrollTop = chatbox.scrollHeight;
}

// (Removed appendMessage; everything goes through messages array and full re-render.)

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createMessageElement(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message');
  messageDiv.classList.add(role === 'user' ? 'user' : 'bot');
  if (role === 'assistant' || role === 'bot') {
    const escaped = escapeHTML(content).replace(/\n/g, "<br>");
    messageDiv.innerHTML = `<b>Bot:</b> ${escaped}`;
  } else {
    messageDiv.innerHTML = `<b>You:</b> ${escapeHTML(content)}`;
  }
  return messageDiv;
}

// -------------------------------------------------------
// File Uploading and Chat Integration
// -------------------------------------------------------

async function fetchUploadedFilesFromServer() {
  try {
    const res = await fetch('/api/upload/files', {
      headers: {'X-Session-Id': SESSION_ID}
    });
    if (!res.ok) throw new Error(`Failed to fetch files list: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.files)) {
      uploadedFiles = data.files;
      saveUploadedFiles();

      // Create or update file chats
      uploadedFiles.forEach(filename => ensureChatForFile(filename));
      // Remove file chats for deleted files
      Object.entries(chatSessions).forEach(([chatId, chat]) => {
        if (chat.fileName && !uploadedFiles.includes(chat.fileName)) {
          deleteChatSession(chatId);
        }
      });
      renderChatList();

      if (!activeChatId && uploadedFiles.length > 0) {
        const chatId = findChatIdByFileName(uploadedFiles[0]);
        if (chatId) setActiveChat(chatId);
      }
    } else {
      console.warn("Malformed files response:", data);
    }
  } catch (err) {
    console.error("Error fetching files:", err);
    uploadedFiles = loadUploadedFiles();
    uploadedFiles.forEach(filename => ensureChatForFile(filename));
    renderChatList();
  }
}

function uploadFiles() {
  const fileInput = document.getElementById('fileInput');
  const files = fileInput.files;
  if (!files.length) {
    uploadStatus.textContent = "Please select at least one file.";
    return;
  }
  const formData = new FormData();
  for (const file of files) formData.append('file[]', file, file.name);
  formData.append('sessionId', SESSION_ID);
  doUpload(formData);
}

function uploadFolder() {
  const folderInput = document.getElementById('folderInput');
  const files = folderInput.files;
  if (!files.length) {
    uploadStatus.textContent = "Please select a folder.";
    return;
  }
  const formData = new FormData();
  for (const file of files) formData.append('file[]', file, file.webkitRelativePath || file.name);
  formData.append('sessionId', SESSION_ID);
  doUpload(formData);
}

function doUpload(formData) {
  fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {"X-Session-Id": SESSION_ID}
  })
  .then(res => res.json())
  .then(async data => {
    if (data.message) {
      uploadStatus.textContent = data.message;
      await fetchUploadedFilesFromServer();
      let fileToSet = null;
      if (Array.isArray(data.success) && data.success.length > 0) {
        fileToSet = data.success[0];
      } else if (uploadedFiles.length > 0) {
        fileToSet = uploadedFiles[0];
      }
      if (fileToSet) {
        const chatId = findChatIdByFileName(fileToSet);
        if (chatId) setActiveChat(chatId);
      }
      if (data.errors && data.errors.length) {
        uploadStatus.textContent += ' (Some issues: ' + data.errors.join(' | ') + ')';
      }
    } else if (data.errors) {
      uploadStatus.textContent = "Errors: " + data.errors.join(", ");
    } else if (data.error) {
      uploadStatus.textContent = data.error;
    } else {
      uploadStatus.textContent = "Upload failed.";
    }
  })
  .catch(err => {
    uploadStatus.textContent = "Upload failed: " + (err.message || err);
    console.error(err);
  });
}

function ensureChatForFile(fileName) {
  const existingChatId = findChatIdByFileName(fileName);
  if (!existingChatId) {
    const newChatId = generateChatId();
    chatSessions[newChatId] = { label: null, messages: [], fileName };
    saveChatSessions();
  }
}

function findChatIdByFileName(fileName) {
  const found = Object.entries(chatSessions).find(([id, chat]) => chat.fileName === fileName);
  return found && found[0];
}

// -------------------------------------------------------
// Chat Interaction Logic
// -------------------------------------------------------

const TYPING_DELAY_MS = 600;

function showUserTypingIndicator() {
  let typingEl = document.getElementById('typingIndicator');
  if (!typingEl) {
    typingEl = document.createElement('div');
    typingEl.id = 'typingIndicator';
    typingEl.textContent = "You are typing...";
    chatbox.appendChild(typingEl);
  }
  typingEl.classList.add('show');
}
function hideUserTypingIndicator() {
  const typingEl = document.getElementById('typingIndicator');
  if (typingEl) {
    typingEl.classList.remove('show');
    setTimeout(() => {
      if (typingEl.parentElement) typingEl.parentElement.removeChild(typingEl);
    }, 400);
  }
}

async function askQuestion() {
  if (!activeChatId) {
    alert("Please select or create a chat first.");
    return;
  }
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = "";
  questionInput.disabled = true;
  showUserTypingIndicator();

  updateChatLabelOnFirstUserMessage(activeChatId, question);

  // Add user message to messages and update UI immediately
  const chat = chatSessions[activeChatId];
  if (!chat) return;
  chat.messages.push({ role: 'user', content: question });
  renderChatHistory(activeChatId);  // <--- This ensures immediate display

  setTimeout(async () => {
    hideUserTypingIndicator();

    const messagesToSend = chat.messages.map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.content
    }));

    const payload = {
      messages: messagesToSend,
      booking_state: {},
      sessionId: SESSION_ID,
    };
    if (chat.fileName) {
      payload.file_name = chat.fileName;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (data.answer) {
        chat.messages.push({ role: "assistant", content: data.answer });
        saveChatSessions();
      } else {
        chat.messages.push({ role: "assistant", content: `Error: ${data.error || "Unknown error"}` });
      }
      renderChatHistory(activeChatId); // re-render to show new bot reply
    } catch (err) {
      chat.messages.push({ role: "assistant", content: `Error occurred: ${err.message || err}` });
      renderChatHistory(activeChatId);
      console.error(err);
    } finally {
      questionInput.disabled = false;
      questionInput.focus();
    }
  }, TYPING_DELAY_MS);
}


// -------------------------------------------------------
// Clear Chat Button Logic
// -------------------------------------------------------

function updateClearChatBtnState() {
  const clearBtn = document.getElementById('clearChatBtn');
  if (!clearBtn) return;
  clearBtn.disabled = !activeChatId;
}

const clearChatBtn = document.getElementById('clearChatBtn');
if (clearChatBtn) {
  clearChatBtn.addEventListener('click', async () => {
    if (!activeChatId) {
      alert("No active chat selected to clear.");
      return;
    }
    const chat = chatSessions[activeChatId];
    let dispLabel = chat.label || (chat.fileName ? chat.fileName.split('/').pop() : "chat");
    if (!confirm(`Are you sure you want to clear chat history for "${dispLabel}"?`)) {
      return;
    }
    clearChatBtn.disabled = true;
    clearChatBtn.textContent = "Clearing...";
    try {
      const payload = { sessionId: SESSION_ID };
      if (chat.fileName) payload.file_name = chat.fileName;
      const res = await fetch('/api/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to clear chat history.");
        clearChatBtn.disabled = false;
        clearChatBtn.textContent = "Clear Chat";
        return;
      }
      chat.messages = [];
      chatbox.innerHTML = `<p><b>System:</b> Chat history cleared for "${dispLabel}".</p>`;
      alert(data.message || "Chat history cleared.");
      saveChatSessions();
    } catch (err) {
      alert("Error clearing chat history: " + (err.message || err));
      console.error(err);
    } finally {
      clearChatBtn.disabled = false;
      clearChatBtn.textContent = "Clear Chat";
    }
  });
}

// -------------------------------------------------------
// File deletion via backend with chat removal
// -------------------------------------------------------

async function deleteFileAndChat(fileName) {
  try {
    const res = await fetch(`/api/upload/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID },
      body: JSON.stringify({ file_name: fileName, sessionId: SESSION_ID })
    });
    const data = await res.json();
    if (!res.ok) {
      uploadStatus.textContent = data.error || "Failed to delete file!";
      return;
    }
    Object.entries(chatSessions).forEach(([chatId, chat]) => {
      if (chat.fileName === fileName) deleteChatSession(chatId);
    });
    uploadStatus.textContent = data.message || `Deleted "${fileName.split('/').pop()}".`;
    await fetchUploadedFilesFromServer();
  } catch (err) {
    uploadStatus.textContent = "Delete failed: " + (err.message || err);
    console.error(err);
  }
}

// -------------------------------------------------------
// Theme toggle functionality (unchanged)
// -------------------------------------------------------

function setupThemeToggle() {
  const toggleThemeCheckbox = document.getElementById('toggleTheme');
  const modeLabel = document.getElementById('modeLabel');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    toggleThemeCheckbox.checked = true;
    modeLabel.textContent = 'Dark Mode';
  } else {
    modeLabel.textContent = 'Light Mode';
  }
  toggleThemeCheckbox.addEventListener('change', function () {
    if (this.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
      modeLabel.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      modeLabel.textContent = 'Light Mode';
    }
  });
}

// -------------------------------------------------------
// "New Chat" button
// -------------------------------------------------------

document.getElementById('newfile').addEventListener('click', () => {
  createNewChatSession();
});

function createNewChatSession() {
  const newId = generateChatId();
  chatSessions[newId] = { label: null, messages: [], fileName: null };
  setActiveChat(newId);
  saveChatSessions();
  chatbox.innerHTML = '';
  activeFileSpan.textContent = "New Chat";
  questionInput.value = '';
  questionInput.focus();
}

// -------------------------------------------------------
// Initialization
// -------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  loadChatSessions();
  await fetchUploadedFilesFromServer();

  if (!activeChatId) {
    const ids = Object.keys(chatSessions);
    if (ids.length > 0) activeChatId = ids[0];
    else createNewChatSession();
  }
  renderChatList();
  setActiveChat(activeChatId);

  const uploadFilesBtn = document.getElementById('uploadFilesBtn');
  if (uploadFilesBtn) uploadFilesBtn.addEventListener('click', uploadFiles);

  const uploadFolderBtn = document.getElementById('uploadFolderBtn');
  if (uploadFolderBtn) uploadFolderBtn.addEventListener('click', uploadFolder);

  if (askForm) askForm.addEventListener('submit', e => {
    e.preventDefault();
    askQuestion();
  });
  if (questionInput) {
    questionInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
      }
    });
  }
  questionInput.focus();

  setupThemeToggle();

  if (Object.values(chatSessions).every(chat => chat.messages.length === 0)) {
    chatSessions[activeChatId].messages.push({ role: 'assistant', content: "Hello! I am your assistant. How can I help you today?" });
    renderChatHistory(activeChatId);
    saveChatSessions();
  }
});
