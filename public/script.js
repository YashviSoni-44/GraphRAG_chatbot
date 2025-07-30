// // ========================
// // Global State Variables
// // ========================

// let uploadedFiles = [];  // Stores full relative paths or file names
// let activeFile = null;   // Currently selected file key (full path)

// const chatHistories = {}; // { filename(full path): [ {role, content}, ... ] }

// const fileListElement = document.getElementById('fileList');
// const activeFileSpan = document.getElementById('activeFile');
// const chatbox = document.getElementById('chatbox');
// const uploadStatus = document.getElementById('uploadStatus');

// const askForm = document.getElementById('askForm');
// const questionInput = document.getElementById('question');

// document.addEventListener('DOMContentLoaded', () => {
//   // Attach event listeners for upload buttons and chat form
//   const uploadFilesBtn = document.getElementById('uploadFilesBtn');
//   const uploadFolderBtn = document.getElementById('uploadFolderBtn');
//   if (uploadFilesBtn) uploadFilesBtn.addEventListener('click', uploadFiles);
//   if (uploadFolderBtn) uploadFolderBtn.addEventListener('click', uploadFolder);

//   if (askForm) askForm.addEventListener('submit', e => {
//     e.preventDefault();
//     askQuestion();
//   });

//   if (questionInput) questionInput.addEventListener('keydown', e => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       askQuestion();
//     }
//   });

//   // ===== Load uploaded files from backend and render =====
//   fetchUploadedFilesFromServer().then(() => {
//     // Restore last active file or pick first
//     const savedActiveFile = localStorage.getItem('activeFile');
//     if (savedActiveFile && uploadedFiles.includes(savedActiveFile)) {
//       setActiveFile(savedActiveFile);
//     } else if (uploadedFiles.length > 0) {
//       setActiveFile(uploadedFiles[0]);
//     }
//   });

//   // Focus input on load
//   questionInput.focus();

//   // Setup light/dark mode toggle
//   setupThemeToggle();







//   const clearChatBtn = document.getElementById('clearChatBtn');
//   if (clearChatBtn) {
//     clearChatBtn.addEventListener('click', async () => {
//       if (!activeFile) {
//         alert("No active file selected to clear chat.");
//         return;
//       }
//       if (!confirm(`Are you sure you want to clear chat history for "${activeFile.split('/').pop()}"?`)) {
//         return;
//       }

//       clearChatBtn.disabled = true;
//       clearChatBtn.textContent = "Clearing...";

//       try {
//         const res = await fetch('/api/chat/clear', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ file_name: activeFile })
//         });
//         const data = await res.json();
//         if (!res.ok) {
//           alert(data.error || "Failed to clear chat history.");
//           clearChatBtn.disabled = false;
//           clearChatBtn.textContent = "Clear Chat";
//           return;
//         }
//         // Clear front-end chat cache and UI for active file
//         delete chatHistories[activeFile];
//         chatbox.innerHTML = `<p><b>System:</b> Chat history cleared for "${activeFile.split('/').pop()}".</p>`;

//         alert(data.message || "Chat history cleared.");

//       } catch (err) {
//         alert("Error clearing chat history: " + (err.message || err));
//         console.error(err);
//       } finally {
//         clearChatBtn.disabled = false;
//         clearChatBtn.textContent = "Clear Chat";
//       }
//     });
//   }
// });

// function saveUploadedFiles() {
//   localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
// }

// function loadUploadedFiles() {
//   const saved = localStorage.getItem('uploadedFiles');
//   if (saved) {
//     try {
//       const parsed = JSON.parse(saved);
//       if (Array.isArray(parsed)) return parsed;
//     } catch {}
//   }
//   return [];
// }




// function updateClearChatBtnState() {
//   const clearBtn = document.getElementById('clearChatBtn');
//   if (!clearBtn) return;
//   clearBtn.disabled = !activeFile;
// }






// function setActiveFile(filename) {
//   if (!filename || filename === activeFile) return;
//   activeFile = filename;
//   activeFileSpan.textContent = filename.split('/').pop();
//   updateSidebarHighlight(filename);
//   localStorage.setItem('activeFile', filename);


//   updateClearChatBtnState();


//   if (chatHistories[filename]) {
//     renderChatHistory(filename);
//   } else {
//     loadChatHistoryFromServer(filename);
//   }
// }

// function updateSidebarHighlight(filename) {
//   Array.from(fileListElement.children).forEach(li => {
//     li.classList.toggle('active-file', li.dataset.fullname === filename);
//   });
// }

// // Safely escape HTML to prevent injection
// function escapeHTML(text) {
//   const div = document.createElement('div');
//   div.textContent = text;
//   return div.innerHTML;
// }

// function createMessageElement(role, content) {
//   const messageDiv = document.createElement('div');
//   messageDiv.classList.add('chat-message');
//   messageDiv.classList.add(role === 'user' ? 'user' : 'bot');

//   // Escape content, preserving newlines in bot messages with <br> tags
//   if (role === 'assistant' || role === 'bot') {
//     // Convert newlines to <br> for bot messages for better formatting
//     const escaped = escapeHTML(content).replace(/\n/g, "<br>");
//     messageDiv.innerHTML = `<b>Bot:</b> ${escaped}`;
//   } else {
//     messageDiv.innerHTML = `<b>You:</b> ${escapeHTML(content)}`;
//   }
//   return messageDiv;
// }

// function renderChatHistory(filename) {
//   chatbox.innerHTML = "";
//   const history = chatHistories[filename] || [];
//   history.forEach(entry => {
//     const messageNode = createMessageElement(entry.role, entry.content);
//     chatbox.appendChild(messageNode);
//   });
//   chatbox.scrollTop = chatbox.scrollHeight;
// }

// async function loadChatHistoryFromServer(filename) {
//   try {
//     const response = await fetch(`/api/chat/history?file_name=${encodeURIComponent(filename)}`);
//     if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
//     const data = await response.json();
//     if (data.history) {
//       chatHistories[filename] = data.history.map(item => ({
//         role: item.role === 'bot' ? 'assistant' : item.role,
//         content: item.content,
//       }));
//       renderChatHistory(filename);
//     } else {
//       let errMsg = data?.error || "No previous history available.";
//       chatbox.innerHTML = `<p><b>System:</b> ${errMsg}</p>`;
//     }
//   } catch (e) {
//     chatbox.innerHTML = `<p><b>System:</b> Error loading chat history: ${e.message}</p>`;
//   }
// }

// // Fetch uploaded files list from backend (Neo4j)
// async function fetchUploadedFilesFromServer() {
//   try {
//     const res = await fetch('/api/upload/files');
//     if (!res.ok) throw new Error(`Failed to fetch files list: ${res.status}`);
//     const data = await res.json();
//     if (Array.isArray(data.files)) {
//       // Clear old state and localStorage
//       uploadedFiles = [];
//       fileListElement.innerHTML = '';

//       // Use backend list
//       data.files.forEach(filename => {
//         uploadedFiles.push(filename);
//         addFileToSidebar(filename);
//       });

//       saveUploadedFiles();
//     } else {
//       console.warn("Malformed files response:", data);
//     }
//   } catch (err) {
//     console.error("Error fetching uploaded files from server:", err);
//     // Fallback: load from localStorage if backend fails
//     const savedFiles = loadUploadedFiles();
//     for (const fileName of savedFiles) {
//       if (!uploadedFiles.includes(fileName)) {
//         uploadedFiles.push(fileName);
//         addFileToSidebar(fileName);
//       }
//     }
//   }
// }

// function uploadFiles() {
//   const fileInput = document.getElementById('fileInput');
//   const files = fileInput.files;
//   if (!files.length) {
//     uploadStatus.textContent = "Please select at least one file.";
//     return;
//   }
//   const formData = new FormData();
//   for (const file of files) {
//     formData.append('file[]', file, file.name);
//   }
//   doUpload(formData);
// }

// function uploadFolder() {
//   const folderInput = document.getElementById('folderInput');
//   const files = folderInput.files;
//   if (!files.length) {
//     uploadStatus.textContent = "Please select a folder.";
//     return;
//   }
//   const formData = new FormData();
//   for (const file of files) {
//     formData.append('file[]', file, file.webkitRelativePath || file.name);
//   }
//   doUpload(formData);
// }

// function doUpload(formData) {
//   fetch('/api/upload', { method: 'POST', body: formData })
//     .then(res => res.json())
//     .then(async data => {
//       if (data.message) {
//         uploadStatus.textContent = data.message;
//         // Refresh full files list from backend so frontend is synced
//         await fetchUploadedFilesFromServer();

//         // Set active file if none set or was removed
//         if (!activeFile || !uploadedFiles.includes(activeFile)) {
//           if (uploadedFiles.length > 0) setActiveFile(uploadedFiles[0]);
//         }

//         if (data.errors && data.errors.length) {
//           uploadStatus.textContent += ' (Some issues: ' + data.errors.join(' | ') + ')';
//         }
//       } else if (data.errors) {
//         uploadStatus.textContent = "Errors: " + data.errors.join(", ");
//       } else if (data.error) {
//         uploadStatus.textContent = data.error;
//       } else {
//         uploadStatus.textContent = "Upload failed.";
//       }
//     })
//     .catch(err => {
//       uploadStatus.textContent = "Upload failed: " + (err.message || err);
//       console.error(err);
//     });
// }

// // ----> MODIFIED/ADDED <----

// // Add a cross delete icon right to each sidebar file
// function addFileToSidebar(fileName) {
//   if ([...fileListElement.children].some(li => li.dataset.fullname === fileName)) return;
//   const li = document.createElement('li');
//   li.dataset.fullname = fileName;
//   li.style.cursor = "pointer";

//   // Use a flexbox container for file item text + cross
//   const container = document.createElement('span');
//   container.style.display = "flex";
//   container.style.alignItems = "center";
//   container.style.justifyContent = "space-between";

//   // File name display
//   const fileLabel = document.createElement('span');
//   fileLabel.textContent = fileName.split('/').pop();
//   fileLabel.style.flex = "1 1 auto";
//   fileLabel.style.paddingRight = "8px";
//   // Make clicking filename select this file:
//   fileLabel.addEventListener('click', e => {
//     setActiveFile(fileName);
//   });

//   // Cross button
//   const crossBtn = document.createElement('button');
//   crossBtn.innerHTML = '&times;';
//   crossBtn.title = "Delete this file and chat";
//   crossBtn.setAttribute('aria-label', `Delete "${fileName.split('/').pop()}"`);
//   crossBtn.style.background = "transparent";
//   crossBtn.style.color = "#aa366b";
//   crossBtn.style.fontSize = "18px";
//   crossBtn.style.border = "none";
//   crossBtn.style.cursor = "pointer";
//   crossBtn.style.padding = "0px 6px";
//   crossBtn.style.borderRadius = "50%";
//   crossBtn.style.width = "22px";
//   crossBtn.style.height = "22px";
//   crossBtn.style.lineHeight = "18px";
//   crossBtn.style.marginLeft = "6px";
//   crossBtn.style.opacity = "0.82";
//   crossBtn.style.transition = "background 0.14s";
//   crossBtn.style.boxSizing = "border-box";
//   crossBtn.style.display = "inline-flex";
//   crossBtn.style.justifyContent = "center";
//   crossBtn.style.alignItems = "center";
//   crossBtn.addEventListener('click', function(e) {
//     e.stopPropagation();
//     deleteFileAndChat(fileName, li);
//   });

//   crossBtn.addEventListener('mouseover', function() {
//     crossBtn.style.background = "#f7bdd2";
//   });
//   crossBtn.addEventListener('mouseout', function() {
//     crossBtn.style.background = "transparent";
//   });

//   container.appendChild(fileLabel);
//   container.appendChild(crossBtn);
//   li.appendChild(container);

//   li.addEventListener('click', (e) => {
//     // Only handle clicks on li if not from cross
//     if (e.target !== crossBtn) {
//       setActiveFile(fileName);
//     }
//   });
//   fileListElement.appendChild(li);
// }

// // The actual delete action (calls backend, updates UI)
// async function deleteFileAndChat(fileName, sidebarLiElement) {
//   if (!window.confirm(`Are you sure you want to delete "${fileName.split('/').pop()}" and its chat data? This cannot be undone.`)) {
//     return;
//   }

//   // Indicate deleting state
//   if (sidebarLiElement) {
//     sidebarLiElement.style.opacity = '0.4';
//   }

//   try {
//     const res = await fetch(`/api/upload/delete`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ file_name: fileName })
//     });
//     const data = await res.json();

//     if (!res.ok) {
//       uploadStatus.textContent = data.error || "Failed to delete file!";
//       if (sidebarLiElement) sidebarLiElement.style.opacity = '1';
//       return;
//     }

//     // Remove from global state
//     const idx = uploadedFiles.indexOf(fileName);
//     if (idx !== -1) uploadedFiles.splice(idx, 1);
//     if (sidebarLiElement && sidebarLiElement.parentElement)
//       sidebarLiElement.parentElement.removeChild(sidebarLiElement);

//     if (activeFile === fileName) {
//       // Switch active file if any left, else "None"
//       if (uploadedFiles.length > 0)
//         setActiveFile(uploadedFiles[0]);
//       else {
//         activeFile = null;
//         activeFileSpan.textContent = "None";
//         chatbox.innerHTML = '';
//       }
//     }
//     delete chatHistories[fileName];

//     uploadStatus.textContent = data.message || `Deleted "${fileName.split('/').pop()}".`;
//     saveUploadedFiles();
//   } catch (err) {
//     uploadStatus.textContent = "Delete failed: " + (err.message || err);
//     if (sidebarLiElement) sidebarLiElement.style.opacity = '1';
//     console.error(err);
//   }
// }

// const TYPING_DELAY_MS = 600;

// function showUserTypingIndicator() {
//   let typingEl = document.getElementById('typingIndicator');
//   if (!typingEl) {
//     typingEl = document.createElement('div');
//     typingEl.id = 'typingIndicator';
//     typingEl.textContent = "You are typing...";
//     chatbox.appendChild(typingEl);
//   }
//   typingEl.classList.add('show');
// }

// function hideUserTypingIndicator() {
//   const typingEl = document.getElementById('typingIndicator');
//   if (typingEl) {
//     typingEl.classList.remove('show');
//     setTimeout(() => {
//       if (typingEl.parentElement) typingEl.parentElement.removeChild(typingEl);
//     }, 400);
//   }
// }

// async function askQuestion() {
//   const question = questionInput.value.trim();
//   if (!question) return;
//   if (!activeFile) {
//     alert("Please upload and select a file to chat about.");
//     return;
//   }
//   questionInput.value = "";
//   questionInput.disabled = true;

//   showUserTypingIndicator();

//   setTimeout(async () => {
//     hideUserTypingIndicator();

//     // User message bubble
//     const userMsg = createMessageElement('user', question);
//     chatbox.appendChild(userMsg);
//     chatbox.scrollTop = chatbox.scrollHeight;

//     let contextText = "";
//     try {
//       const ctxResponse = await fetch(`/api/chat/context?file_name=${encodeURIComponent(activeFile)}`);
//       const ctxData = await ctxResponse.json();
//       if (ctxData.context) contextText = ctxData.context;
//     } catch (err) {
//       console.error("Failed to fetch context:", err);
//     }
//     if (!contextText.trim()) {
//       const botMsg = createMessageElement('bot', "❌ No relevant context found for this file.");
//       chatbox.appendChild(botMsg);
//       chatbox.scrollTop = chatbox.scrollHeight;
//       questionInput.disabled = false;
//       questionInput.focus();
//       return;
//     }

//     const systemMsg = "You are a helpful assistant answering questions based only on the following context.";
//     const priorMessages = (chatHistories[activeFile] || []).map(m => ({ role: m.role, content: m.content }));
//     const messages = [
//       { role: "system", content: systemMsg + "\n\n" + contextText },
//       ...priorMessages,
//       { role: "user", content: question }
//     ];

//     const botTypingBubble = document.createElement('div');
//     botTypingBubble.classList.add('chat-message', 'bot');
//     botTypingBubble.textContent = "Bot is typing...";
//     chatbox.appendChild(botTypingBubble);
//     chatbox.scrollTop = chatbox.scrollHeight;

//     try {
//       const res = await fetch('/api/chat', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ messages, file_name: activeFile })
//       });
//       const data = await res.json();
//       botTypingBubble.remove();

//       if (data.answer) {
//         const botMsg = createMessageElement('bot', data.answer);
//         chatbox.appendChild(botMsg);
//         chatbox.scrollTop = chatbox.scrollHeight;

//         if (!chatHistories[activeFile]) chatHistories[activeFile] = [];
//         chatHistories[activeFile].push({ role: "user", content: question });
//         chatHistories[activeFile].push({ role: "assistant", content: data.answer });
//       } else {
//         const botMsg = createMessageElement('bot', `Error: ${data.error || "Unknown error"}`);
//         chatbox.appendChild(botMsg);
//         chatbox.scrollTop = chatbox.scrollHeight;
//       }
//     } catch (err) {
//       botTypingBubble.remove();
//       const botMsg = createMessageElement('bot', "Error occurred.");
//       chatbox.appendChild(botMsg);
//       chatbox.scrollTop = chatbox.scrollHeight;
//     } finally {
//       questionInput.disabled = false;
//       questionInput.focus();
//     }
//   }, TYPING_DELAY_MS);
// }

// // Theme toggle setup
// function setupThemeToggle() {
//   const toggleThemeCheckbox = document.getElementById('toggleTheme');
//   const modeLabel = document.getElementById('modeLabel');

//   const savedTheme = localStorage.getItem('theme');
//   if (savedTheme === 'dark') {
//     document.body.classList.add('dark-mode');
//     toggleThemeCheckbox.checked = true;
//     modeLabel.textContent = 'Dark Mode';
//   } else {
//     modeLabel.textContent = 'Light Mode';
//   }

//   toggleThemeCheckbox.addEventListener('change', function() {
//     if (this.checked) {
//       document.body.classList.add('dark-mode');
//       localStorage.setItem('theme', 'dark');
//       modeLabel.textContent = 'Dark Mode';
//     } else {
//       document.body.classList.remove('dark-mode');
//       localStorage.setItem('theme', 'light');
//       modeLabel.textContent = 'Light Mode';
//     }
//   });
// }

// window.uploadFiles = uploadFiles;
// window.uploadFolder = uploadFolder;
// window.askQuestion = askQuestion;



//=============================================================================================




// ========================
// Global State Variables
// ========================

// Generate or fetch unique session ID per user and persist in localStorage
function getSessionId() {
  let sessionId = localStorage.getItem('graphbot_session_id');
  if (!sessionId) {
    if (window.crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      // fallback random string if crypto unavailable
      sessionId = 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    localStorage.setItem('graphbot_session_id', sessionId);
  }
  return sessionId;
}
const SESSION_ID = getSessionId();

// Existing global variables
let uploadedFiles = [];
let activeFile = null;
const chatHistories = {};
const fileListElement = document.getElementById('fileList');
const activeFileSpan = document.getElementById('activeFile');
const chatbox = document.getElementById('chatbox');
const uploadStatus = document.getElementById('uploadStatus');
const askForm = document.getElementById('askForm');
const questionInput = document.getElementById('question');

document.addEventListener('DOMContentLoaded', () => {
  // (Existing initialization code...)

  const uploadFilesBtn = document.getElementById('uploadFilesBtn');
  const uploadFolderBtn = document.getElementById('uploadFolderBtn');
  if (uploadFilesBtn) uploadFilesBtn.addEventListener('click', uploadFiles);
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

  fetchUploadedFilesFromServer().then(() => {
    const savedActiveFile = localStorage.getItem('activeFile');
    if (savedActiveFile && uploadedFiles.includes(savedActiveFile)) {
      setActiveFile(savedActiveFile);
    } else if (uploadedFiles.length > 0) {
      setActiveFile(uploadedFiles[0]);
    }
  });

  questionInput.focus();
  setupThemeToggle();

  const clearChatBtn = document.getElementById('clearChatBtn');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      if (!activeFile) {
        alert("No active file selected to clear chat.");
        return;
      }
      if (!confirm(`Are you sure you want to clear chat history for "${activeFile.split('/').pop()}"?`)) {
        return;
      }

      clearChatBtn.disabled = true;
      clearChatBtn.textContent = "Clearing...";

      try {
        const res = await fetch('/api/chat/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID },
          body: JSON.stringify({ file_name: activeFile, sessionId: SESSION_ID })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to clear chat history.");
          clearChatBtn.disabled = false;
          clearChatBtn.textContent = "Clear Chat";
          return;
        }
        delete chatHistories[activeFile];
        chatbox.innerHTML = `<p><b>System:</b> Chat history cleared for "${activeFile.split('/').pop()}".</p>`;
        alert(data.message || "Chat history cleared.");
      } catch (err) {
        alert("Error clearing chat history: " + (err.message || err));
        console.error(err);
      } finally {
        clearChatBtn.disabled = false;
        clearChatBtn.textContent = "Clear Chat";
      }
    });
  }
});

function saveUploadedFiles() {
  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
}

function loadUploadedFiles() {
  const saved = localStorage.getItem('uploadedFiles');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function updateClearChatBtnState() {
  const clearBtn = document.getElementById('clearChatBtn');
  if (!clearBtn) return;
  clearBtn.disabled = !activeFile;
}

function setActiveFile(filename) {
  if (!filename || filename === activeFile) return;
  activeFile = filename;
  activeFileSpan.textContent = filename.split('/').pop();
  updateSidebarHighlight(filename);
  localStorage.setItem('activeFile', filename);
  updateClearChatBtnState();

  if (chatHistories[filename]) {
    renderChatHistory(filename);
  } else {
    loadChatHistoryFromServer(filename);
  }
}

function updateSidebarHighlight(filename) {
  Array.from(fileListElement.children).forEach(li => {
    li.classList.toggle('active-file', li.dataset.fullname === filename);
  });
}

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

function renderChatHistory(filename) {
  chatbox.innerHTML = "";
  const history = chatHistories[filename] || [];
  history.forEach(entry => {
    const messageNode = createMessageElement(entry.role, entry.content);
    chatbox.appendChild(messageNode);
  });
  chatbox.scrollTop = chatbox.scrollHeight;
}

async function loadChatHistoryFromServer(filename) {
  try {
    const response = await fetch(`/api/chat/history?file_name=${encodeURIComponent(filename)}`, {
      headers: { 'X-Session-Id': SESSION_ID }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data.history) {
      chatHistories[filename] = data.history.map(item => ({
        role: item.role === 'bot' ? 'assistant' : item.role,
        content: item.content,
      }));
      renderChatHistory(filename);
    } else {
      let errMsg = data?.error || "No previous history available.";
      chatbox.innerHTML = `<p><b>System:</b> ${errMsg}</p>`;
    }
  } catch (e) {
    chatbox.innerHTML = `<p><b>System:</b> Error loading chat history: ${e.message}</p>`;
  }
}

async function fetchUploadedFilesFromServer() {
  try {
    const res = await fetch('/api/upload/files', {
      headers: { 'X-Session-Id': SESSION_ID }
    });
    if (!res.ok) throw new Error(`Failed to fetch files list: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.files)) {
      uploadedFiles = [];
      fileListElement.innerHTML = '';
      data.files.forEach(filename => {
        uploadedFiles.push(filename);
        addFileToSidebar(filename);
      });
      saveUploadedFiles();
    } else {
      console.warn("Malformed files response:", data);
    }
  } catch (err) {
    console.error("Error fetching uploaded files from server:", err);
    const savedFiles = loadUploadedFiles();
    for (const fileName of savedFiles) {
      if (!uploadedFiles.includes(fileName)) {
        uploadedFiles.push(fileName);
        addFileToSidebar(fileName);
      }
    }
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
  for (const file of files) {
    formData.append('file[]', file, file.name);
  }
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
  for (const file of files) {
    formData.append('file[]', file, file.webkitRelativePath || file.name);
  }
  formData.append('sessionId', SESSION_ID);
  doUpload(formData);
}

function doUpload(formData) {
  fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      "X-Session-Id": SESSION_ID
    }
  })
  .then(res => res.json())
  .then(async data => {
    if (data.message) {
      uploadStatus.textContent = data.message;
      await fetchUploadedFilesFromServer();
      if (!activeFile || !uploadedFiles.includes(activeFile)) {
        if (uploadedFiles.length > 0) setActiveFile(uploadedFiles[0]);
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

function addFileToSidebar(fileName) {
  if ([...fileListElement.children].some(li => li.dataset.fullname === fileName)) return;
  const li = document.createElement('li');
  li.dataset.fullname = fileName;
  li.style.cursor = "pointer";

  const container = document.createElement('span');
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "space-between";

  const fileLabel = document.createElement('span');
  fileLabel.textContent = fileName.split('/').pop();
  fileLabel.style.flex = "1 1 auto";
  fileLabel.style.paddingRight = "8px";
  fileLabel.addEventListener('click', e => {
    setActiveFile(fileName);
  });

  const crossBtn = document.createElement('button');
  crossBtn.innerHTML = '&times;';
  crossBtn.title = "Delete this file and chat";
  crossBtn.setAttribute('aria-label', `Delete "${fileName.split('/').pop()}"`);
  crossBtn.style.background = "transparent";
  crossBtn.style.color = "#aa366b";
  crossBtn.style.fontSize = "18px";
  crossBtn.style.border = "none";
  crossBtn.style.cursor = "pointer";
  crossBtn.style.padding = "0px 6px";
  crossBtn.style.borderRadius = "50%";
  crossBtn.style.width = "22px";
  crossBtn.style.height = "22px";
  crossBtn.style.lineHeight = "18px";
  crossBtn.style.marginLeft = "6px";
  crossBtn.style.opacity = "0.82";
  crossBtn.style.transition = "background 0.14s";
  crossBtn.style.boxSizing = "border-box";
  crossBtn.style.display = "inline-flex";
  crossBtn.style.justifyContent = "center";
  crossBtn.style.alignItems = "center";

  crossBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    deleteFileAndChat(fileName, li);
  });
  crossBtn.addEventListener('mouseover', () => crossBtn.style.background = "#f7bdd2");
  crossBtn.addEventListener('mouseout', () => crossBtn.style.background = "transparent");

  container.appendChild(fileLabel);
  container.appendChild(crossBtn);
  li.appendChild(container);

  li.addEventListener('click', (e) => {
    if (e.target !== crossBtn) {
      setActiveFile(fileName);
    }
  });
  fileListElement.appendChild(li);
}

async function deleteFileAndChat(fileName, sidebarLiElement) {
  if (!window.confirm(`Are you sure you want to delete "${fileName.split('/').pop()}" and its chat data? This cannot be undone.`)) {
    return;
  }

  if (sidebarLiElement) {
    sidebarLiElement.style.opacity = '0.4';
  }

  try {
    const res = await fetch(`/api/upload/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': SESSION_ID
      },
      body: JSON.stringify({ file_name: fileName, sessionId: SESSION_ID })
    });
    const data = await res.json();

    if (!res.ok) {
      uploadStatus.textContent = data.error || "Failed to delete file!";
      if (sidebarLiElement) sidebarLiElement.style.opacity = '1';
      return;
    }

    const idx = uploadedFiles.indexOf(fileName);
    if (idx !== -1) uploadedFiles.splice(idx, 1);
    if (sidebarLiElement && sidebarLiElement.parentElement)
      sidebarLiElement.parentElement.removeChild(sidebarLiElement);

    if (activeFile === fileName) {
      if (uploadedFiles.length > 0)
        setActiveFile(uploadedFiles[0]);
      else {
        activeFile = null;
        activeFileSpan.textContent = "None";
        chatbox.innerHTML = '';
      }
    }
    delete chatHistories[fileName];

    uploadStatus.textContent = data.message || `Deleted "${fileName.split('/').pop()}".`;
    saveUploadedFiles();
  } catch (err) {
    uploadStatus.textContent = "Delete failed: " + (err.message || err);
    if (sidebarLiElement) sidebarLiElement.style.opacity = '1';
    console.error(err);
  }
}

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
  const question = questionInput.value.trim();
  if (!question) return;
  if (!activeFile) {
    alert("Please upload and select a file to chat about.");
    return;
  }
  questionInput.value = "";
  questionInput.disabled = true;

  showUserTypingIndicator();

  setTimeout(async () => {
    hideUserTypingIndicator();

    // User message bubble
    const userMsg = createMessageElement('user', question);
    chatbox.appendChild(userMsg);
    chatbox.scrollTop = chatbox.scrollHeight;

    let contextText = "";
    try {
      const ctxResponse = await fetch(`/api/chat/context?file_name=${encodeURIComponent(activeFile)}`, {
        headers: { 'X-Session-Id': SESSION_ID }
      });
      const ctxData = await ctxResponse.json();
      if (ctxData.context) contextText = ctxData.context;
    } catch (err) {
      console.error("Failed to fetch context:", err);
    }
    if (!contextText.trim()) {
      const botMsg = createMessageElement('bot', "❌ No relevant context found for this file.");
      chatbox.appendChild(botMsg);
      chatbox.scrollTop = chatbox.scrollHeight;
      questionInput.disabled = false;
      questionInput.focus();
      return;
    }

    const systemMsg = "You are a helpful assistant answering questions based only on the following context.";
    const priorMessages = (chatHistories[activeFile] || []).map(m => ({ role: m.role, content: m.content }));
    const messages = [
      { role: "system", content: systemMsg + "\n\n" + contextText },
      ...priorMessages,
      { role: "user", content: question }
    ];

    const botTypingBubble = document.createElement('div');
    botTypingBubble.classList.add('chat-message', 'bot');
    botTypingBubble.textContent = "Bot is typing...";
    chatbox.appendChild(botTypingBubble);
    chatbox.scrollTop = chatbox.scrollHeight;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': SESSION_ID },
        body: JSON.stringify({ messages, file_name: activeFile, sessionId: SESSION_ID })
      });
      const data = await res.json();
      botTypingBubble.remove();

      if (data.answer) {
        const botMsg = createMessageElement('bot', data.answer);
        chatbox.appendChild(botMsg);
        chatbox.scrollTop = chatbox.scrollHeight;

        if (!chatHistories[activeFile]) chatHistories[activeFile] = [];
        chatHistories[activeFile].push({ role: "user", content: question });
        chatHistories[activeFile].push({ role: "assistant", content: data.answer });
      } else {
        const botMsg = createMessageElement('bot', `Error: ${data.error || "Unknown error"}`);
        chatbox.appendChild(botMsg);
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    } catch (err) {
      botTypingBubble.remove();
      const botMsg = createMessageElement('bot', "Error occurred.");
      chatbox.appendChild(botMsg);
      chatbox.scrollTop = chatbox.scrollHeight;
    } finally {
      questionInput.disabled = false;
      questionInput.focus();
    }
  }, TYPING_DELAY_MS);
}

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

  toggleThemeCheckbox.addEventListener('change', function() {
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

window.uploadFiles = uploadFiles;
window.uploadFolder = uploadFolder;
window.askQuestion = askQuestion;
