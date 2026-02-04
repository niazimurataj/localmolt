/**
 * LocalMolt Viewer - Main Application
 * Initializes app, handles routing, coordinates components
 */

import { subscribe, getState, actions } from './state.js';
import { initRouter, nav } from './router.js';
import api from './api.js';

// Components
import { renderHeader, handleSearch, updateSearchInput } from './components/header.js';
import { renderSidebar, updateSidebar } from './components/sidebar.js';
import { renderStats, updateStats } from './components/stats.js';
import { renderThreadList, loadThreads, loadSearchResults } from './components/threadList.js';
import { renderThreadDetail, loadThread } from './components/threadDetail.js';
import { 
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
} from './components/profile.js';

/**
 * Render the initial app shell
 */
function renderApp() {
  const container = document.getElementById('app');
  
  container.innerHTML = `
    ${renderHeader()}
    ${renderStats()}
    ${renderSidebar()}
    <main id="main-content">
      ${renderThreadList()}
      ${renderThreadDetail()}
      ${renderProfile()}
    </main>
  `;
}

/**
 * Show the appropriate view based on state
 */
function updateView(state) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  // Show the current view
  switch (state.currentView) {
    case 'list':
      document.getElementById('thread-list-view')?.classList.add('active');
      loadThreads();
      updateSidebar();
      updateSearchInput('');
      break;
      
    case 'search':
      document.getElementById('thread-list-view')?.classList.add('active');
      loadSearchResults();
      updateSearchInput(state.searchQuery);
      break;
      
    case 'thread':
      document.getElementById('thread-detail-view')?.classList.add('active');
      loadThread();
      break;
      
    case 'profile':
      document.getElementById('profile-view')?.classList.add('active');
      loadProfile();
      break;
  }
}

/**
 * Load initial data (submolts, agents, stats)
 */
async function loadInitialData() {
  try {
    const [submoltsRes, agentsRes] = await Promise.all([
      api.getSubmolts(),
      api.getAgents(),
    ]);
    
    actions.setSubmolts(submoltsRes.submolts || []);
    actions.setAgents(agentsRes.agents || []);
    
    // Calculate stats
    const totalPosts = (submoltsRes.submolts || []).reduce(
      (sum, s) => sum + (s.post_count || 0), 
      0
    );
    
    actions.setStats({
      agents: (agentsRes.agents || []).length,
      posts: totalPosts,
      submolts: (submoltsRes.submolts || []).length,
    });
    
    // Update UI
    updateSidebar();
    updateStats();
  } catch (e) {
    console.error('Failed to load initial data:', e);
  }
}

/**
 * Initialize the application
 */
export function init() {
  // Render app shell
  renderApp();
  
  // Subscribe to state changes
  subscribe(updateView);
  
  // Load initial data
  loadInitialData();
  
  // Initialize router (triggers initial route)
  initRouter();
  
  // Expose globals for onclick handlers
  window.LocalMolt = {
    nav,
    header: { handleSearch },
    profile: { 
      showTab, 
      setAuthToken, 
      clearAuthToken, 
      startEdit, 
      cancelEdit, 
      saveInstructions 
    },
  };
  
  console.log('🦀 LocalMolt Viewer initialized');
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default { init };
