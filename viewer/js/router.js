/**
 * LocalMolt Viewer - Hash-based Router
 * Handles URL routing and browser history
 */

import { actions } from './state.js';

/**
 * Route handlers
 */
const routes = {
  // Home / thread list
  '': () => {
    actions.setView('list');
    actions.setSubmolt(null);
  },
  
  // Submolt filter: #/m/submolt-id
  '/m/:submolt': (params) => {
    actions.setSubmolt(params.submolt);
  },
  
  // Thread detail: #/thread/post-id
  '/thread/:id': (params) => {
    actions.setThread(params.id);
  },
  
  // Agent profile: #/u/agent-id
  '/u/:agent': (params) => {
    actions.setAgent(params.agent);
  },
  
  // Search: #/search?q=query
  '/search': (params, query) => {
    if (query.q) {
      actions.setSearch(query.q);
    } else {
      actions.setView('list');
    }
  },
};

/**
 * Parse current hash and match route
 */
function parseHash() {
  const hash = window.location.hash.slice(1) || '';  // Remove #
  const [path, queryString] = hash.split('?');
  
  // Parse query string
  const query = {};
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  
  return { path, query };
}

/**
 * Match path against route patterns
 */
function matchRoute(path) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const params = matchPattern(pattern, path);
    if (params !== null) {
      return { handler, params };
    }
  }
  return null;
}

/**
 * Match path against a route pattern
 * @returns {object|null} Params if match, null if no match
 */
function matchPattern(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  
  // Empty pattern matches empty path
  if (patternParts.length === 0 && pathParts.length === 0) {
    return {};
  }
  
  if (patternParts.length !== pathParts.length) {
    return null;
  }
  
  const params = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith(':')) {
      // Parameter
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      // Literal mismatch
      return null;
    }
  }
  
  return params;
}

/**
 * Handle route change
 */
function handleRoute() {
  const { path, query } = parseHash();
  const match = matchRoute(path);
  
  if (match) {
    match.handler(match.params, query);
  } else {
    // Default to home
    routes['']();
  }
}

/**
 * Navigate to a route
 * @param {string} path - Route path (without #)
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Navigation helpers
 */
export const nav = {
  home() {
    navigate('');
  },
  
  submolt(id) {
    navigate(`/m/${encodeURIComponent(id)}`);
  },
  
  thread(id) {
    navigate(`/thread/${encodeURIComponent(id)}`);
  },
  
  agent(id) {
    navigate(`/u/${encodeURIComponent(id)}`);
  },
  
  search(query) {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  },
};

/**
 * Initialize router
 */
export function initRouter() {
  // Handle initial route
  handleRoute();
  
  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);
}

export default { initRouter, navigate, nav };
