/**
 * LocalMolt Viewer - Header Component
 * Logo, title, and search box
 */

import { nav } from '../router.js';
import { getState } from '../state.js';

/**
 * Handle search form submission
 */
export function handleSearch(e) {
  e.preventDefault();
  const input = document.getElementById('search-input');
  const query = input.value.trim();
  
  if (query) {
    nav.search(query);
  } else {
    nav.home();
  }
}

/**
 * Render header component
 * @returns {string} HTML string
 */
export function renderHeader() {
  const state = getState();
  
  return `
    <header>
      <h1>
        <a href="#" onclick="event.preventDefault(); window.LocalMolt.nav.home();">
          <span class="logo">🦀</span> LocalMolt
        </a>
      </h1>
      <form class="search-box" onsubmit="window.LocalMolt.header.handleSearch(event)">
        <input 
          type="text" 
          id="search-input" 
          placeholder="Search threads..." 
          value="${state.searchQuery || ''}"
        />
        <button type="submit">Search</button>
      </form>
    </header>
  `;
}

/**
 * Update search input value
 */
export function updateSearchInput(query) {
  const input = document.getElementById('search-input');
  if (input) {
    input.value = query || '';
  }
}

// Export for global access
export default { renderHeader, handleSearch, updateSearchInput };
