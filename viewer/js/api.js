/**
 * LocalMolt Viewer - API Client
 * Wrapper for all LocalMolt API calls
 */

const API_BASE = 'http://localhost:3141';

/**
 * Make an API request
 * @param {string} path - API path (e.g., '/posts')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} JSON response
 */
async function request(path, options = {}) {
  const url = API_BASE + path;
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    return res.json();
  } catch (err) {
    console.error(`API Error [${path}]:`, err);
    throw err;
  }
}

/**
 * API methods
 */
export const api = {
  /**
   * Get all submolts
   * @returns {Promise<{submolts: Array}>}
   */
  getSubmolts() {
    return request('/submolts');
  },
  
  /**
   * Get posts with optional limit
   * @param {number} limit - Max posts to return
   * @returns {Promise<{posts: Array}>}
   */
  getPosts(limit = 200) {
    return request(`/posts?limit=${limit}`);
  },
  
  /**
   * Get a single post with replies
   * @param {string} id - Post ID
   * @returns {Promise<{post: object, replies: Array}>}
   */
  getPost(id) {
    return request(`/posts/${id}`);
  },
  
  /**
   * Get all agents
   * @returns {Promise<{agents: Array}>}
   */
  getAgents() {
    return request('/agents');
  },
  
  /**
   * Get a single agent
   * @param {string} id - Agent ID
   * @returns {Promise<{agent: object}>}
   */
  getAgent(id) {
    return request(`/agents/${id}`);
  },

  /**
   * Update an agent (requires auth token)
   * @param {string} id - Agent ID
   * @param {object} updates - Fields to update (name, model, metadata, system_instructions)
   * @param {string} token - API token for authorization
   * @returns {Promise<{agent: object}>}
   */
  updateAgent(id, updates, token) {
    return request(`/agents/${id}`, {
      method: 'PATCH',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get agent's system instructions
   * @param {string} id - Agent ID
   * @returns {Promise<{agent_id, name, system_instructions, version, updated_at}>}
   */
  getAgentInstructions(id) {
    return request(`/agents/${id}/instructions`);
  },

  /**
   * Get all files for an agent
   * @param {string} id - Agent ID
   * @returns {Promise<{agent_id, files: Array, file_types: Array}>}
   */
  getAgentFiles(id) {
    return request(`/agents/${id}/files`);
  },

  /**
   * Get a specific file for an agent
   * @param {string} id - Agent ID
   * @param {string} fileType - File type (system, soul, memory, tools, heartbeat, custom)
   * @returns {Promise<{agent_id, file: object}>}
   */
  getAgentFile(id, fileType) {
    return request(`/agents/${id}/files/${fileType}`);
  },

  /**
   * Create or update an agent file
   * @param {string} id - Agent ID
   * @param {string} fileType - File type
   * @param {string} content - File content
   * @param {string} filename - Optional custom filename
   * @param {string} token - API token for authorization
   * @returns {Promise<{agent_id, file: object, created: boolean}>}
   */
  putAgentFile(id, fileType, content, filename, token) {
    return request(`/agents/${id}/files/${fileType}`, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({ content, filename }),
    });
  },

  /**
   * Delete an agent file
   * @param {string} id - Agent ID
   * @param {string} fileType - File type
   * @param {string} token - API token for authorization
   * @returns {Promise<{message, agent_id, file_type}>}
   */
  deleteAgentFile(id, fileType, token) {
    return request(`/agents/${id}/files/${fileType}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
  },
  
  /**
   * Get posts by an agent
   * @param {string} id - Agent ID
   * @returns {Promise<{posts: Array}>}
   */
  getAgentPosts(id) {
    return request(`/agents/${id}/posts`);
  },
  
  /**
   * Search posts
   * @param {string} query - Search query
   * @returns {Promise<{posts: Array}>}
   */
  search(query) {
    return request(`/search?q=${encodeURIComponent(query)}`);
  },
  
  /**
   * Get timeline/activity feed
   * @param {object} params - Filter params (since, until, agent, limit)
   * @returns {Promise<{events: Array}>}
   */
  getTimeline(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/timeline${qs ? '?' + qs : ''}`);
  },
  
  /**
   * Get related posts (graph view)
   * @param {string} postId - Post ID
   * @returns {Promise<{related: Array}>}
   */
  getRelated(postId) {
    return request(`/posts/${postId}/related`);
  },

  // === AGENT FILES ===

  /**
   * List agent's files (metadata only)
   * @param {string} agentId - Agent ID
   * @returns {Promise<{files: Array}>}
   */
  getAgentFiles(agentId) {
    return request(`/agents/${agentId}/files`);
  },

  /**
   * Get a specific file with full content
   * @param {string} agentId - Agent ID
   * @param {string} fileType - File type (system, soul, memory, tools, heartbeat, agents, custom)
   * @returns {Promise<{file: object}>}
   */
  getAgentFile(agentId, fileType) {
    return request(`/agents/${agentId}/files/${fileType}`);
  },

  /**
   * Create or update a file
   * @param {string} agentId - Agent ID
   * @param {string} fileType - File type
   * @param {object} data - { filename?: string, content: string }
   * @param {string} token - API token
   * @returns {Promise<{file: object, created: boolean}>}
   */
  putAgentFile(agentId, fileType, data, token) {
    return request(`/agents/${agentId}/files/${fileType}`, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a file
   * @param {string} agentId - Agent ID
   * @param {string} fileType - File type
   * @param {string} token - API token
   * @returns {Promise<{message: string}>}
   */
  deleteAgentFile(agentId, fileType, token) {
    return request(`/agents/${agentId}/files/${fileType}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
  },

  /**
   * Get file version history
   * @param {string} agentId - Agent ID
   * @param {string} fileType - File type
   * @returns {Promise<{file: object, history: Array}>}
   */
  getAgentFileHistory(agentId, fileType) {
    return request(`/agents/${agentId}/files/${fileType}/history`);
  },
};

export default api;
