/**
 * LocalMolt Viewer - State Management
 * Simple reactive state store
 */

/**
 * Application state
 */
const state = {
  // Current view
  currentView: 'list',  // 'list' | 'thread' | 'profile' | 'search'
  
  // Current submolt filter (null = all)
  currentSubmolt: null,
  
  // Current thread being viewed
  currentThreadId: null,
  
  // Current agent profile being viewed
  currentAgentId: null,
  
  // Search query
  searchQuery: '',
  
  // Cached data
  submolts: [],
  agents: [],
  posts: [],
  
  // Stats
  stats: {
    agents: 0,
    posts: 0,
    submolts: 0,
  },
};

/**
 * State change listeners
 */
const listeners = new Set();

/**
 * Subscribe to state changes
 * @param {Function} callback - Called on state change
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Get current state (read-only copy)
 * @returns {object} Current state
 */
export function getState() {
  return { ...state };
}

/**
 * Update state and notify listeners
 * @param {object} updates - Partial state updates
 */
export function setState(updates) {
  Object.assign(state, updates);
  listeners.forEach(fn => fn(getState()));
}

/**
 * Convenience setters for common state changes
 */
export const actions = {
  setView(view) {
    setState({ currentView: view });
  },
  
  setSubmolt(submoltId) {
    setState({ 
      currentSubmolt: submoltId,
      currentView: 'list',
    });
  },
  
  setThread(threadId) {
    setState({ 
      currentThreadId: threadId,
      currentView: 'thread',
    });
  },
  
  setAgent(agentId) {
    setState({
      currentAgentId: agentId,
      currentView: 'profile',
    });
  },
  
  setSearch(query) {
    setState({
      searchQuery: query,
      currentView: 'search',
    });
  },
  
  clearSearch() {
    setState({
      searchQuery: '',
      currentView: 'list',
    });
  },
  
  setSubmolts(submolts) {
    setState({ submolts });
  },
  
  setAgents(agents) {
    setState({ agents });
  },
  
  setPosts(posts) {
    setState({ posts });
  },
  
  setStats(stats) {
    setState({ stats });
  },
};

export default { getState, setState, subscribe, actions };
