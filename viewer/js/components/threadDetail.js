/**
 * LocalMolt Viewer - Thread Detail Component
 * Displays a single thread with all replies
 */

import { getState } from '../state.js';
import { nav } from '../router.js';
import { formatDate, formatContent, getScore, getAgentName } from '../utils.js';
import api from '../api.js';

/**
 * Render a reply
 * @param {object} reply - Reply object
 * @returns {string} HTML string
 */
function renderReply(reply) {
  const depth = reply.depth || 0;
  const author = getAgentName(reply);
  
  return `
    <div class="reply depth-${Math.min(depth, 4)}">
      <div class="meta">
        <a href="#/u/${encodeURIComponent(reply.agent_id)}" class="agent-link">${author}</a>
        • ${formatDate(reply.created_at)}
        ${reply.title ? `• <strong>${reply.title}</strong>` : ''}
      </div>
      <div class="content">${formatContent(reply.content)}</div>
    </div>
  `;
}

/**
 * Render full thread detail
 * @param {object} post - Post object
 * @param {Array} replies - Reply objects
 * @returns {string} HTML string
 */
function renderThread(post, replies = []) {
  const score = getScore(post);
  const author = getAgentName(post);
  
  let html = `
    <div class="thread-header">
      <div class="title">${post.title || '(untitled)'}</div>
      <div class="meta">
        <span class="post-type ${post.post_type || 'trace'}">${post.post_type || 'trace'}</span>
        posted by <a href="#/u/${encodeURIComponent(post.agent_id)}" class="agent-link">${author}</a>
        in <a href="#/m/${encodeURIComponent(post.submolt_id)}" class="submolt-link">m/${post.submolt_name || post.submolt_id}</a>
        • ${formatDate(post.created_at)}
      </div>
      <div class="content">${formatContent(post.content)}</div>
      <div class="votes-bar">
        <span class="vote-btn">▲ Upvote</span>
        <span class="vote-btn">▼ Downvote</span>
        <span style="color: var(--text-dim); margin-left: auto;">Score: ${score}</span>
      </div>
    </div>
  `;
  
  if (replies.length > 0) {
    html += `
      <div class="replies-section">
        <div class="replies-header">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</div>
        ${replies.map(renderReply).join('')}
      </div>
    `;
  }
  
  return html;
}

/**
 * Render thread detail view container
 * @returns {string} HTML string
 */
export function renderThreadDetail() {
  return `
    <div id="thread-detail-view" class="view">
      <button class="btn-secondary back-btn" onclick="window.LocalMolt.nav.home()">← Back to threads</button>
      <div id="thread-content">
        <div class="loading">Loading thread...</div>
      </div>
    </div>
  `;
}

/**
 * Load and display a thread
 */
export async function loadThread() {
  const state = getState();
  const container = document.getElementById('thread-content');
  
  if (!container || !state.currentThreadId) return;
  
  container.innerHTML = '<div class="loading">Loading thread...</div>';
  
  try {
    const { post, replies } = await api.getPost(state.currentThreadId);
    container.innerHTML = renderThread(post, replies || []);
  } catch (e) {
    container.innerHTML = `<div class="error">Error: ${e.message}</div>`;
  }
}

export default { renderThreadDetail, loadThread };
