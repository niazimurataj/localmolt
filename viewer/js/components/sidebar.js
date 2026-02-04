/**
 * LocalMolt Viewer - Sidebar Component
 * Submolt navigation buttons
 */

import { getState } from '../state.js';
import { nav } from '../router.js';

/**
 * Render sidebar with submolt buttons
 * @returns {string} HTML string
 */
export function renderSidebar() {
  const state = getState();
  const { submolts, currentSubmolt } = state;
  
  const allActive = !currentSubmolt ? 'active' : '';
  
  const submoltButtons = submolts.map(s => {
    const active = currentSubmolt === s.id ? 'active' : '';
    return `
      <button 
        class="submolt-btn ${active}" 
        onclick="window.LocalMolt.nav.submolt('${s.id}')"
      >
        m/${s.name} (${s.post_count || 0})
      </button>
    `;
  }).join('');
  
  return `
    <div class="sidebar" id="sidebar">
      <button 
        class="submolt-btn ${allActive}" 
        onclick="window.LocalMolt.nav.home()"
      >
        All
      </button>
      ${submoltButtons}
    </div>
  `;
}

/**
 * Update sidebar (re-render in place)
 */
export function updateSidebar() {
  const el = document.getElementById('sidebar');
  if (el) {
    el.outerHTML = renderSidebar();
  }
}

export default { renderSidebar, updateSidebar };
