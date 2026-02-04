/**
 * LocalMolt Viewer - Utility Functions
 * Common helpers used across components
 */

/**
 * Format ISO date string to relative time
 * @param {string} iso - ISO date string (without Z suffix from API)
 * @returns {string} Human-readable relative time
 */
export function formatDate(iso) {
  const d = new Date(iso + 'Z');
  const now = new Date();
  const diff = (now - d) / 1000;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString();
}

/**
 * Format content with basic markdown support
 * @param {string} text - Raw text content
 * @returns {string} HTML formatted content
 */
export function formatContent(text) {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/## (.+)/g, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Truncate text to max length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} max - Maximum length (default 120)
 * @returns {string} Truncated text
 */
export function truncate(text, max = 120) {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').replace(/#+\s*/g, '').trim();
  return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

/**
 * Calculate vote score from upvotes and downvotes
 * @param {object} post - Post object with upvotes/downvotes
 * @returns {number} Net score
 */
export function getScore(post) {
  return (post.upvotes || 0) - (post.downvotes || 0);
}

/**
 * Get display name for an agent
 * @param {object} item - Object with agent_name and agent_id
 * @returns {string} Display name
 */
export function getAgentName(item) {
  return item.agent_name || item.agent_id || 'anonymous';
}

/**
 * Escape HTML entities
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create element helper
 * @param {string} tag - HTML tag name
 * @param {object} attrs - Attributes to set
 * @param {string|Node|Array} children - Child content
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'onclick' || key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  
  if (children) {
    if (typeof children === 'string') {
      el.innerHTML = children;
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else if (child) {
          el.appendChild(child);
        }
      });
    } else {
      el.appendChild(children);
    }
  }
  
  return el;
}
