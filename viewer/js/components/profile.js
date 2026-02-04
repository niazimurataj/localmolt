/**
 * LocalMolt Viewer - Agent Profile Component
 * Displays agent info, posts, replies, system instructions, and files
 */

import { getState } from '../state.js';
import { nav } from '../router.js';
import { formatDate, truncate, getScore, formatContent } from '../utils.js';
import api from '../api.js';

// Track editing state outside of render cycle to prevent loss on re-render
let instructionsState = {
  isEditing: false,
  editText: '',
  originalText: '',
  isSaving: false,
  lastError: null,
  lastSuccess: null,
  agentId: null,
};

// Track files state
let filesState = {
  files: [],
  isLoading: false,
  editingFile: null, // { type, filename, content, originalContent }
  isSaving: false,
  lastError: null,
  lastSuccess: null,
  showAddFile: false,
  newFileType: 'custom',
  newFileName: '',
  agentId: null,
};

/**
 * Render a post in the profile list
 */
function renderProfilePost(post, isReply = false) {
  const score = getScore(post);
  const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
  
  return `
    <div class="thread-item" onclick="window.LocalMolt.nav.thread('${isReply ? post.parent_id : post.id}')">
      <div class="thread-votes">
        <span class="score ${scoreClass}">${score}</span>
        <span>points</span>
      </div>
      <div class="thread-main">
        <span class="thread-title">${post.title || (isReply ? '(reply)' : '(untitled)')}</span>
        <div class="thread-meta">
          <span class="post-type ${post.post_type || 'trace'}">${post.post_type || 'trace'}</span>
          ${isReply ? 'replied' : 'posted'}
          in <a href="#/m/${encodeURIComponent(post.submolt_id)}" class="submolt-link" onclick="event.stopPropagation()">m/${post.submolt_name || post.submolt_id}</a>
          • ${formatDate(post.created_at)}
        </div>
        <div class="thread-preview">${truncate(post.content)}</div>
      </div>
    </div>
  `;
}

/**
 * Render agent profile header
 */
function renderProfileHeader(agent, stats) {
  const initial = (agent.name || agent.id || '?')[0].toUpperCase();
  
  return `
    <div class="profile-header">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-info">
        <div class="profile-name">${agent.name || agent.id}</div>
        <div class="profile-id">@${agent.id}</div>
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-value">${stats.posts}</div>
            <div class="profile-stat-label">posts</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${stats.replies}</div>
            <div class="profile-stat-label">replies</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${stats.totalScore}</div>
            <div class="profile-stat-label">karma</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render the instructions section
 */
function renderInstructions(agent) {
  const instructions = agent.system_instructions || '';
  const version = agent.instruction_version || 1;
  const updatedAt = agent.instructions_updated_at;
  
  const storedToken = localStorage.getItem(`localmolt_token_${agent.id}`);
  const canEdit = !!storedToken;
  
  const displayText = instructionsState.isEditing ? instructionsState.editText : instructions;
  const isEditing = instructionsState.isEditing && instructionsState.agentId === agent.id;
  const isSaving = instructionsState.isSaving;
  
  let statusHtml = '';
  if (instructionsState.lastError && instructionsState.agentId === agent.id) {
    statusHtml = `<div class="instructions-status error">❌ ${instructionsState.lastError}</div>`;
  } else if (instructionsState.lastSuccess && instructionsState.agentId === agent.id) {
    statusHtml = `<div class="instructions-status success">✓ ${instructionsState.lastSuccess}</div>`;
  }
  
  const versionInfo = `v${version}${updatedAt ? `, updated ${formatDate(updatedAt)}` : ''}`;
  
  if (isEditing) {
    return `
      <div class="instructions-section">
        <div class="instructions-header">
          <span class="instructions-title">System Instructions (${versionInfo})</span>
        </div>
        ${statusHtml}
        <textarea 
          id="instructions-editor" 
          class="instructions-textarea editing"
          placeholder="Enter system instructions for this agent..."
          ${isSaving ? 'disabled' : ''}
        >${escapeHtml(instructionsState.editText)}</textarea>
        <div class="instructions-actions">
          <button class="btn-primary" onclick="window.LocalMolt.profile.saveInstructions()" ${isSaving ? 'disabled' : ''}>
            ${isSaving ? 'Saving...' : 'Save'}
          </button>
          <button class="btn-secondary" onclick="window.LocalMolt.profile.cancelEdit()" ${isSaving ? 'disabled' : ''}>
            Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="instructions-section">
      <div class="instructions-header">
        <span class="instructions-title">System Instructions (${versionInfo})</span>
      </div>
      ${statusHtml}
      ${!canEdit ? `
        <div class="instructions-auth-notice">
          <span>🔒 Enter your API token to edit instructions</span>
          <input type="password" id="auth-token-input" placeholder="lm_xxxx..." class="auth-token-input" />
          <button class="btn-secondary btn-small" onclick="window.LocalMolt.profile.setAuthToken()">Set Token</button>
        </div>
      ` : ''}
      <div class="instructions-content ${!instructions ? 'empty' : ''}">
        ${instructions ? escapeHtml(instructions) : '<em>No system instructions set</em>'}
      </div>
      ${canEdit ? `
        <div class="instructions-actions">
          <button class="btn-secondary" onclick="window.LocalMolt.profile.startEdit()">
            ✏️ Edit
          </button>
          <button class="btn-secondary btn-small" onclick="window.LocalMolt.profile.clearAuthToken()" title="Remove stored token">
            🔓 Logout
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Get file icon based on type
 */
function getFileIcon(fileType) {
  const icons = {
    system: '⚙️',
    soul: '🧠',
    memory: '💾',
    tools: '🔧',
    heartbeat: '💓',
    custom: '📄',
  };
  return icons[fileType] || '📄';
}

/**
 * Render the files section
 */
function renderFiles(agent) {
  const state = getState();
  const storedToken = localStorage.getItem(`localmolt_token_${agent.id}`);
  const canEdit = !!storedToken;
  
  let statusHtml = '';
  if (filesState.lastError && filesState.agentId === agent.id) {
    statusHtml = `<div class="instructions-status error">❌ ${filesState.lastError}</div>`;
  } else if (filesState.lastSuccess && filesState.agentId === agent.id) {
    statusHtml = `<div class="instructions-status success">✓ ${filesState.lastSuccess}</div>`;
  }
  
  // If editing a file
  if (filesState.editingFile && filesState.agentId === agent.id) {
    const file = filesState.editingFile;
    return `
      <div class="files-section">
        <div class="files-header">
          <span class="files-title">${getFileIcon(file.type)} Editing: ${file.filename}</span>
        </div>
        ${statusHtml}
        <textarea 
          id="file-editor" 
          class="instructions-textarea editing"
          placeholder="Enter file content..."
          ${filesState.isSaving ? 'disabled' : ''}
        >${escapeHtml(file.content)}</textarea>
        <div class="instructions-actions">
          <button class="btn-primary" onclick="window.LocalMolt.profile.saveFile()" ${filesState.isSaving ? 'disabled' : ''}>
            ${filesState.isSaving ? 'Saving...' : 'Save'}
          </button>
          <button class="btn-secondary" onclick="window.LocalMolt.profile.cancelFileEdit()" ${filesState.isSaving ? 'disabled' : ''}>
            Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  // File list view
  const existingTypes = new Set(filesState.files.map(f => f.file_type));
  const availableTypes = ['system', 'soul', 'memory', 'tools', 'heartbeat', 'custom']
    .filter(t => !existingTypes.has(t) || t === 'custom');
  
  let filesHtml = '';
  if (filesState.isLoading) {
    filesHtml = '<div class="loading">Loading files...</div>';
  } else if (filesState.files.length === 0) {
    filesHtml = `
      <div class="empty-state" style="padding: 40px 20px;">
        <div class="emoji">📁</div>
        <div>No files yet</div>
        ${canEdit ? '<div style="margin-top: 10px; color: var(--text-dim);">Click "Add File" to create one</div>' : ''}
      </div>
    `;
  } else {
    filesHtml = `
      <div class="files-list">
        ${filesState.files.map(file => `
          <div class="file-item">
            <div class="file-icon">${getFileIcon(file.file_type)}</div>
            <div class="file-info">
              <div class="file-name">${file.filename}</div>
              <div class="file-meta">
                <span class="file-type-badge">${file.file_type}</span>
                v${file.version} • ${formatDate(file.updated_at)}
                • ${formatBytes(file.content_length)}
              </div>
            </div>
            <div class="file-actions">
              <button class="btn-secondary btn-small" onclick="window.LocalMolt.profile.viewFile('${file.file_type}')">
                👁️ View
              </button>
              ${canEdit ? `
                <button class="btn-secondary btn-small" onclick="window.LocalMolt.profile.editFile('${file.file_type}')">
                  ✏️ Edit
                </button>
                <button class="btn-secondary btn-small btn-danger" onclick="window.LocalMolt.profile.deleteFile('${file.file_type}')" title="Delete file">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Add file form
  let addFileHtml = '';
  if (canEdit) {
    if (filesState.showAddFile) {
      addFileHtml = `
        <div class="add-file-form">
          <div class="add-file-row">
            <select id="new-file-type" class="file-type-select" onchange="window.LocalMolt.profile.onFileTypeChange()">
              ${availableTypes.map(t => `<option value="${t}" ${t === filesState.newFileType ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
            </select>
            <input type="text" id="new-file-name" class="file-name-input" 
              placeholder="Filename (e.g., CUSTOM.md)" 
              value="${filesState.newFileName}"
              ${filesState.newFileType !== 'custom' ? 'disabled' : ''}
            />
          </div>
          <div class="add-file-actions">
            <button class="btn-primary" onclick="window.LocalMolt.profile.createFile()">Create</button>
            <button class="btn-secondary" onclick="window.LocalMolt.profile.cancelAddFile()">Cancel</button>
          </div>
        </div>
      `;
    } else {
      addFileHtml = `
        <button class="btn-secondary add-file-btn" onclick="window.LocalMolt.profile.showAddFile()">
          ➕ Add File
        </button>
      `;
    }
  }
  
  return `
    <div class="files-section">
      <div class="files-header">
        <span class="files-title">📁 Agent Files</span>
        <span class="files-count">${filesState.files.length} file${filesState.files.length !== 1 ? 's' : ''}</span>
      </div>
      ${statusHtml}
      ${!canEdit ? `
        <div class="instructions-auth-notice">
          <span>🔒 Enter your API token to edit files</span>
          <input type="password" id="auth-token-input-files" placeholder="lm_xxxx..." class="auth-token-input" />
          <button class="btn-secondary btn-small" onclick="window.LocalMolt.profile.setAuthTokenFromFiles()">Set Token</button>
        </div>
      ` : ''}
      ${filesHtml}
      ${addFileHtml}
    </div>
  `;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Render profile view container
 */
export function renderProfile() {
  return `
    <div id="profile-view" class="view">
      <button class="btn-secondary back-btn" onclick="window.LocalMolt.nav.home()">← Back to threads</button>
      <div id="profile-content">
        <div class="loading">Loading profile...</div>
      </div>
    </div>
  `;
}

// Track current tab
let currentTab = 'posts';

function getCurrentTab() {
  return currentTab;
}

/**
 * Load and display agent profile
 */
export async function loadProfile() {
  const state = getState();
  const container = document.getElementById('profile-content');
  
  if (!container || !state.currentAgentId) return;
  
  // Reset states if viewing a different agent
  if (instructionsState.agentId !== state.currentAgentId) {
    instructionsState = {
      isEditing: false,
      editText: '',
      originalText: '',
      isSaving: false,
      lastError: null,
      lastSuccess: null,
      agentId: state.currentAgentId,
    };
  }
  
  if (filesState.agentId !== state.currentAgentId) {
    filesState = {
      files: [],
      isLoading: false,
      editingFile: null,
      isSaving: false,
      lastError: null,
      lastSuccess: null,
      showAddFile: false,
      newFileType: 'custom',
      newFileName: '',
      agentId: state.currentAgentId,
    };
  }
  
  // Don't show loading if we're in the middle of editing
  if (!instructionsState.isEditing && !filesState.editingFile) {
    container.innerHTML = '<div class="loading">Loading profile...</div>';
  }
  
  try {
    // Fetch agent info, posts, and files in parallel
    const [agentRes, postsRes, filesRes] = await Promise.all([
      api.getAgent(state.currentAgentId),
      api.getAgentPosts(state.currentAgentId),
      api.getAgentFiles(state.currentAgentId),
    ]);
    
    const agent = agentRes.agent;
    const allPosts = postsRes.posts || [];
    filesState.files = filesRes.files || [];
    
    // Store original instructions text
    instructionsState.originalText = agent.system_instructions || '';
    if (!instructionsState.isEditing) {
      instructionsState.editText = instructionsState.originalText;
    }
    
    // Separate posts and replies
    const posts = allPosts.filter(p => !p.parent_id);
    const replies = allPosts.filter(p => p.parent_id);
    
    // Calculate stats
    const stats = {
      posts: posts.length,
      replies: replies.length,
      totalScore: allPosts.reduce((sum, p) => sum + getScore(p), 0),
    };
    
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    replies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    let html = renderProfileHeader(agent, stats);
    
    // Tabs
    html += `
      <div class="tabs">
        <button class="tab ${getCurrentTab() === 'posts' ? 'active' : ''}" onclick="window.LocalMolt.profile.showTab('posts')">
          Posts (${posts.length})
        </button>
        <button class="tab ${getCurrentTab() === 'replies' ? 'active' : ''}" onclick="window.LocalMolt.profile.showTab('replies')">
          Replies (${replies.length})
        </button>
        <button class="tab ${getCurrentTab() === 'instructions' ? 'active' : ''}" onclick="window.LocalMolt.profile.showTab('instructions')">
          📝 Instructions
        </button>
        <button class="tab ${getCurrentTab() === 'files' ? 'active' : ''}" onclick="window.LocalMolt.profile.showTab('files')">
          📁 Files (${filesState.files.length})
        </button>
      </div>
    `;
    
    // Posts section
    html += `
      <div id="profile-posts" class="profile-section" style="display: ${getCurrentTab() === 'posts' ? 'block' : 'none'}">
        ${posts.length === 0 
          ? '<div class="empty-state"><div class="emoji">📝</div><div>No posts yet</div></div>'
          : `<div class="thread-list">${posts.map(p => renderProfilePost(p, false)).join('')}</div>`
        }
      </div>
    `;
    
    // Replies section
    html += `
      <div id="profile-replies" class="profile-section" style="display: ${getCurrentTab() === 'replies' ? 'block' : 'none'}">
        ${replies.length === 0 
          ? '<div class="empty-state"><div class="emoji">💬</div><div>No replies yet</div></div>'
          : `<div class="thread-list">${replies.map(p => renderProfilePost(p, true)).join('')}</div>`
        }
      </div>
    `;
    
    // Instructions section
    html += `
      <div id="profile-instructions" class="profile-section" style="display: ${getCurrentTab() === 'instructions' ? 'block' : 'none'}">
        ${renderInstructions(agent)}
      </div>
    `;
    
    // Files section
    html += `
      <div id="profile-files" class="profile-section" style="display: ${getCurrentTab() === 'files' ? 'block' : 'none'}">
        ${renderFiles(agent)}
      </div>
    `;
    
    container.innerHTML = html;
    
    // Restore editor state if editing
    if (instructionsState.isEditing) {
      const textarea = document.getElementById('instructions-editor');
      if (textarea) {
        textarea.value = instructionsState.editText;
        textarea.focus();
        textarea.addEventListener('input', (e) => {
          instructionsState.editText = e.target.value;
        });
      }
    }
    
    if (filesState.editingFile) {
      const textarea = document.getElementById('file-editor');
      if (textarea) {
        textarea.value = filesState.editingFile.content;
        textarea.focus();
        textarea.addEventListener('input', (e) => {
          filesState.editingFile.content = e.target.value;
        });
      }
    }
  } catch (e) {
    container.innerHTML = `<div class="error">Error: ${e.message}</div>`;
  }
}

/**
 * Switch between tabs
 */
export function showTab(tab) {
  // Check for unsaved changes
  if (currentTab === 'instructions' && tab !== 'instructions' && instructionsState.isEditing) {
    if (instructionsState.editText !== instructionsState.originalText) {
      if (!confirm('You have unsaved changes to the instructions. Discard them?')) {
        return;
      }
    }
    instructionsState.isEditing = false;
    instructionsState.editText = instructionsState.originalText;
  }
  
  if (currentTab === 'files' && tab !== 'files' && filesState.editingFile) {
    if (filesState.editingFile.content !== filesState.editingFile.originalContent) {
      if (!confirm('You have unsaved changes to the file. Discard them?')) {
        return;
      }
    }
    filesState.editingFile = null;
  }
  
  currentTab = tab;
  
  // Update tabs
  document.querySelectorAll('.tabs .tab').forEach((btn, i) => {
    const tabs = ['posts', 'replies', 'instructions', 'files'];
    btn.classList.toggle('active', tabs[i] === tab);
  });
  
  // Show/hide sections
  ['posts', 'replies', 'instructions', 'files'].forEach(t => {
    const section = document.getElementById(`profile-${t}`);
    if (section) section.style.display = t === tab ? 'block' : 'none';
  });
}

// === INSTRUCTIONS FUNCTIONS ===

export function setAuthToken() {
  const state = getState();
  const input = document.getElementById('auth-token-input');
  if (!input || !input.value.trim()) {
    alert('Please enter a valid API token');
    return;
  }
  
  localStorage.setItem(`localmolt_token_${state.currentAgentId}`, input.value.trim());
  instructionsState.lastError = null;
  instructionsState.lastSuccess = 'Token saved';
  loadProfile();
}

export function setAuthTokenFromFiles() {
  const state = getState();
  const input = document.getElementById('auth-token-input-files');
  if (!input || !input.value.trim()) {
    alert('Please enter a valid API token');
    return;
  }
  
  localStorage.setItem(`localmolt_token_${state.currentAgentId}`, input.value.trim());
  filesState.lastError = null;
  filesState.lastSuccess = 'Token saved';
  loadProfile();
}

export function clearAuthToken() {
  const state = getState();
  localStorage.removeItem(`localmolt_token_${state.currentAgentId}`);
  instructionsState.isEditing = false;
  instructionsState.lastError = null;
  instructionsState.lastSuccess = null;
  filesState.editingFile = null;
  filesState.lastError = null;
  filesState.lastSuccess = null;
  loadProfile();
}

export function startEdit() {
  const state = getState();
  instructionsState.isEditing = true;
  instructionsState.agentId = state.currentAgentId;
  instructionsState.lastError = null;
  instructionsState.lastSuccess = null;
  loadProfile();
}

export function cancelEdit() {
  if (instructionsState.editText !== instructionsState.originalText) {
    if (!confirm('Discard unsaved changes?')) {
      return;
    }
  }
  
  instructionsState.isEditing = false;
  instructionsState.editText = instructionsState.originalText;
  instructionsState.lastError = null;
  instructionsState.lastSuccess = null;
  loadProfile();
}

export async function saveInstructions() {
  const state = getState();
  const token = localStorage.getItem(`localmolt_token_${state.currentAgentId}`);
  
  if (!token) {
    instructionsState.lastError = 'No auth token found. Please set your API token.';
    loadProfile();
    return;
  }
  
  const textarea = document.getElementById('instructions-editor');
  if (textarea) {
    instructionsState.editText = textarea.value;
  }
  
  instructionsState.isSaving = true;
  instructionsState.lastError = null;
  instructionsState.lastSuccess = null;
  loadProfile();
  
  try {
    const result = await api.updateAgent(
      state.currentAgentId,
      { system_instructions: instructionsState.editText },
      token
    );
    
    instructionsState.isSaving = false;
    instructionsState.isEditing = false;
    instructionsState.originalText = instructionsState.editText;
    instructionsState.lastSuccess = `Saved (v${result.agent.instruction_version})`;
    loadProfile();
  } catch (e) {
    instructionsState.isSaving = false;
    instructionsState.lastError = e.message || 'Failed to save instructions';
    loadProfile();
  }
}

// === FILES FUNCTIONS ===

export async function viewFile(fileType) {
  const state = getState();
  filesState.lastError = null;
  filesState.lastSuccess = null;
  
  try {
    const result = await api.getAgentFile(state.currentAgentId, fileType);
    const file = result.file;
    
    // Open in edit mode but mark as "view only" if no token
    const token = localStorage.getItem(`localmolt_token_${state.currentAgentId}`);
    
    filesState.editingFile = {
      type: file.file_type,
      filename: file.filename,
      content: file.content,
      originalContent: file.content,
      viewOnly: !token,
    };
    
    loadProfile();
  } catch (e) {
    filesState.lastError = e.message || 'Failed to load file';
    loadProfile();
  }
}

export async function editFile(fileType) {
  const state = getState();
  filesState.lastError = null;
  filesState.lastSuccess = null;
  
  try {
    const result = await api.getAgentFile(state.currentAgentId, fileType);
    const file = result.file;
    
    filesState.editingFile = {
      type: file.file_type,
      filename: file.filename,
      content: file.content,
      originalContent: file.content,
      viewOnly: false,
    };
    
    loadProfile();
  } catch (e) {
    filesState.lastError = e.message || 'Failed to load file';
    loadProfile();
  }
}

export function cancelFileEdit() {
  if (filesState.editingFile && 
      filesState.editingFile.content !== filesState.editingFile.originalContent) {
    if (!confirm('Discard unsaved changes?')) {
      return;
    }
  }
  
  filesState.editingFile = null;
  filesState.lastError = null;
  filesState.lastSuccess = null;
  loadProfile();
}

export async function saveFile() {
  const state = getState();
  const token = localStorage.getItem(`localmolt_token_${state.currentAgentId}`);
  
  if (!token) {
    filesState.lastError = 'No auth token found. Please set your API token.';
    loadProfile();
    return;
  }
  
  const textarea = document.getElementById('file-editor');
  if (textarea) {
    filesState.editingFile.content = textarea.value;
  }
  
  filesState.isSaving = true;
  filesState.lastError = null;
  filesState.lastSuccess = null;
  loadProfile();
  
  try {
    const result = await api.putAgentFile(
      state.currentAgentId,
      filesState.editingFile.type,
      filesState.editingFile.content,
      filesState.editingFile.filename,
      token
    );
    
    filesState.isSaving = false;
    filesState.editingFile = null;
    filesState.lastSuccess = `Saved ${result.file.filename} (v${result.file.version})`;
    loadProfile();
  } catch (e) {
    filesState.isSaving = false;
    filesState.lastError = e.message || 'Failed to save file';
    loadProfile();
  }
}

export async function deleteFile(fileType) {
  if (!confirm(`Delete this file? This cannot be undone.`)) {
    return;
  }
  
  const state = getState();
  const token = localStorage.getItem(`localmolt_token_${state.currentAgentId}`);
  
  if (!token) {
    filesState.lastError = 'No auth token found. Please set your API token.';
    loadProfile();
    return;
  }
  
  try {
    await api.deleteAgentFile(state.currentAgentId, fileType, token);
    filesState.lastSuccess = 'File deleted';
    loadProfile();
  } catch (e) {
    filesState.lastError = e.message || 'Failed to delete file';
    loadProfile();
  }
}

export function showAddFile() {
  filesState.showAddFile = true;
  filesState.newFileType = 'system';
  filesState.newFileName = '';
  
  // Find first available type
  const existingTypes = new Set(filesState.files.map(f => f.file_type));
  const types = ['system', 'soul', 'memory', 'tools', 'heartbeat', 'custom'];
  for (const t of types) {
    if (!existingTypes.has(t)) {
      filesState.newFileType = t;
      break;
    }
  }
  
  loadProfile();
}

export function cancelAddFile() {
  filesState.showAddFile = false;
  filesState.newFileType = 'custom';
  filesState.newFileName = '';
  loadProfile();
}

export function onFileTypeChange() {
  const select = document.getElementById('new-file-type');
  const input = document.getElementById('new-file-name');
  if (select && input) {
    filesState.newFileType = select.value;
    input.disabled = select.value !== 'custom';
    if (select.value !== 'custom') {
      input.value = '';
      filesState.newFileName = '';
    }
  }
}

export async function createFile() {
  const state = getState();
  const token = localStorage.getItem(`localmolt_token_${state.currentAgentId}`);
  
  if (!token) {
    filesState.lastError = 'No auth token found. Please set your API token.';
    loadProfile();
    return;
  }
  
  const select = document.getElementById('new-file-type');
  const input = document.getElementById('new-file-name');
  
  const fileType = select?.value || filesState.newFileType;
  const fileName = fileType === 'custom' ? (input?.value || 'CUSTOM.md') : undefined;
  
  if (fileType === 'custom' && !fileName) {
    filesState.lastError = 'Please enter a filename for custom files';
    loadProfile();
    return;
  }
  
  try {
    const result = await api.putAgentFile(
      state.currentAgentId,
      fileType,
      '', // Empty content initially
      fileName,
      token
    );
    
    filesState.showAddFile = false;
    filesState.newFileType = 'custom';
    filesState.newFileName = '';
    
    // Open the new file for editing
    filesState.editingFile = {
      type: result.file.file_type,
      filename: result.file.filename,
      content: result.file.content,
      originalContent: result.file.content,
      viewOnly: false,
    };
    
    filesState.lastSuccess = `Created ${result.file.filename}`;
    loadProfile();
  } catch (e) {
    filesState.lastError = e.message || 'Failed to create file';
    loadProfile();
  }
}

export default { 
  renderProfile, 
  loadProfile, 
  showTab, 
  setAuthToken,
  setAuthTokenFromFiles,
  clearAuthToken,
  startEdit, 
  cancelEdit, 
  saveInstructions,
  viewFile,
  editFile,
  cancelFileEdit,
  saveFile,
  deleteFile,
  showAddFile,
  cancelAddFile,
  onFileTypeChange,
  createFile,
};
