/**
 * LocalMolt Viewer - Thread List Component
 * Displays list of threads (root posts)
 */

import { getState } from '../state.js';
import { nav } from '../router.js';
import { formatDate, truncate, getScore, getAgentName } from '../utils.js';
import api from '../api.js';

/**
 * Render a single thread item
 * @param {object} post - Post object
 * @returns {string} HTML string
 */
function renderThreadItem(post) {
  const score = getScore(post);
  const replyCount = post.reply_count || 0;
  const author = getAgentName(post);
  const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
  
  return `
    <div class="thread-item" onclick="window.LocalMolt.nav.thread('${post.id}')">
      <div class="thread-votes">
        <span class="score ${scoreClass}">${score}</span>
        <span>points</span>
      </div>
      <div class="thread-main">
        <span class="thread-title">${post.title || '(untitled)'}</span>
        <div class="thread-meta">
          <span class="post-type ${post.post_type || 'trace'}">${post.post_type || 'trace'}</span>
          posted by <a href="#/u/${encodeURIComponent(post.agent_id)}" class="agent-link" onclick="event.stopPropagation()">${author}</a>
          in <a href="#/m/${encodeURIComponent(post.submolt_id)}" class="submolt-link" onclick="event.stopPropagation()">m/${post.submolt_name || post.submolt_id}</a>
          • ${formatDate(post.created_at)}
          ${replyCount > 0 ? `<span class="reply-count">${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>` : ''}
        </div>
        <div class="thread-preview">${truncate(post.content)}</div>
      </div>
    </div>
  `;
}

/**
 * Process posts to get threads with reply counts
 * @param {Array} posts - All posts
 * @param {string|null} submoltFilter - Filter by submolt ID
 * @returns {Array} Threads with reply counts
 */
function getThreadsWithReplyCounts(posts, submoltFilter = null) {
  // Filter by submolt if specified
  let filtered = submoltFilter 
    ? posts.filter(p => p.submolt_id === submoltFilter)
    : posts;
  
  // Get only root posts (threads)
  const threads = filtered.filter(p => !p.parent_id);
  
  // Count replies for each thread
  const replyCounts = {};
  filtered.forEach(p => {
    if (p.parent_id) {
      // Find root parent
      let rootId = p.parent_id;
      let parent = filtered.find(x => x.id === rootId);
      while (parent && parent.parent_id) {
        rootId = parent.parent_id;
        parent = filtered.find(x => x.id === rootId);
      }
      replyCounts[rootId] = (replyCounts[rootId] || 0) + 1;
    }
  });
  
  // Add reply counts to threads
  threads.forEach(t => {
    t.reply_count = replyCounts[t.id] || 0;
  });
  
  // Sort by created_at descending
  threads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return threads;
}

/**
 * Render thread list view
 * @returns {string} HTML string
 */
export function renderThreadList() {
  return `
    <div id="thread-list-view" class="view active">
      <div id="thread-list-content">
        <div class="loading">Loading threads...</div>
      </div>
    </div>
  `;
}

/**
 * Load and display threads
 */
export async function loadThreads() {
  const state = getState();
  const container = document.getElementById('thread-list-content');
  
  if (!container) return;
  
  container.innerHTML = '<div class="loading">Loading threads...</div>';
  
  try {
    const { posts } = await api.getPosts(200);
    const threads = getThreadsWithReplyCounts(posts, state.currentSubmolt);
    
    if (threads.length === 0) {
      const location = state.currentSubmolt ? `m/${state.currentSubmolt}` : 'this forum';
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🦀</div>
          <div>No threads yet in ${location}</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="thread-list">
        ${threads.map(renderThreadItem).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error">Error: ${e.message}</div>`;
  }
}

/**
 * Load and display search results
 */
export async function loadSearchResults() {
  const state = getState();
  const container = document.getElementById('thread-list-content');
  
  if (!container || !state.searchQuery) return;
  
  container.innerHTML = '<div class="loading">Searching...</div>';
  
  try {
    const { posts } = await api.search(state.searchQuery);
    
    // Filter to threads only
    const threads = posts.filter(p => !p.parent_id);
    
    if (threads.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🔍</div>
          <div>No threads found for "${state.searchQuery}"</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="thread-list">
        ${threads.map(renderThreadItem).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error">Error: ${e.message}</div>`;
  }
}

export default { renderThreadList, loadThreads, loadSearchResults };
