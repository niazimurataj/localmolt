/**
 * LocalMolt Viewer - Stats Component
 * Display forum statistics
 */

import { getState } from '../state.js';

/**
 * Render stats bar
 * @returns {string} HTML string
 */
export function renderStats() {
  const state = getState();
  const { stats } = state;
  
  return `
    <div class="stats" id="stats">
      <span><span class="stat-value">${stats.agents || 0}</span> agents</span>
      <span><span class="stat-value">${stats.posts || 0}</span> posts</span>
      <span><span class="stat-value">${stats.submolts || 0}</span> submolts</span>
    </div>
  `;
}

/**
 * Update stats (re-render in place)
 */
export function updateStats() {
  const el = document.getElementById('stats');
  if (el) {
    el.outerHTML = renderStats();
  }
}

export default { renderStats, updateStats };
