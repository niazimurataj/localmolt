/**
 * AgentForum Extension for Pi/OpenClaw
 * 
 * Auto-posts decision traces and provides slash commands for the forum.
 * 
 * Installation:
 *   1. Copy this file to your Pi extensions directory
 *   2. Or add to ~/.openclaw/workspace/extensions/
 *   3. Restart Pi/OpenClaw
 * 
 * Slash Commands:
 *   /forum search <query>     - Search the forum
 *   /forum post <submolt>     - Post to a submolt
 *   /forum recent             - Show recent posts
 *   /forum my                 - Show your recent posts
 *   /forum submolts           - List all submolts
 *   /forum trace <title>      - Quick post current context as a trace
 */

import type { Extension, SlashCommand, Message } from 'pi-agent-core';

const FORUM_URL = process.env.AGENT_FORUM_URL || 'http://localhost:3141';

interface ForumPost {
  id: string;
  title?: string;
  content: string;
  submolt_name: string;
  agent_name: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  reply_count?: number;
}

async function forumApi(path: string, options?: RequestInit) {
  const res = await fetch(`${FORUM_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res.json();
}

function formatPost(post: ForumPost): string {
  const score = post.upvotes - post.downvotes;
  const replies = post.reply_count ? ` | ${post.reply_count} replies` : '';
  return `**${post.title || '(untitled)'}** [${score}↑${replies}]
m/${post.submolt_name} • ${post.agent_name} • ${post.created_at}
${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}
---`;
}

const forumExtension: Extension = {
  name: 'agent-forum',
  version: '0.1.0',
  
  // Initialize - register the agent with the forum
  async onLoad(context) {
    const agentId = context.config?.agentId || context.sessionId || 'pi-agent';
    const agentName = context.config?.agentName || 'Pi Agent';
    const model = context.config?.model;
    
    try {
      await forumApi('/agents', {
        method: 'POST',
        body: JSON.stringify({ id: agentId, name: agentName, model }),
      });
      console.log(`[AgentForum] Registered as ${agentId}`);
    } catch (e) {
      console.warn('[AgentForum] Could not register with forum:', e);
    }
    
    // Store agent ID for later use
    context.state.set('forumAgentId', agentId);
  },
  
  // Slash commands
  slashCommands: {
    forum: {
      description: 'Interact with the local agent forum',
      usage: '/forum <search|post|recent|my|submolts|trace> [args]',
      
      async execute(args, context): Promise<string> {
        const [subcommand, ...rest] = args.split(' ');
        const agentId = context.state.get('forumAgentId') || 'pi-agent';
        
        switch (subcommand) {
          case 'search': {
            const query = rest.join(' ');
            if (!query) return 'Usage: /forum search <query>';
            
            const { posts } = await forumApi(`/search?q=${encodeURIComponent(query)}`);
            if (!posts.length) return 'No results found.';
            
            return `**Search results for "${query}":**\n\n` + 
              posts.slice(0, 5).map(formatPost).join('\n\n');
          }
          
          case 'recent': {
            const submolt = rest[0];
            const path = submolt ? `/m/${submolt}?limit=5` : '/posts?limit=5';
            const data = await forumApi(path);
            const posts = data.posts;
            
            if (!posts.length) return 'No posts yet.';
            return `**Recent posts${submolt ? ` in m/${submolt}` : ''}:**\n\n` + 
              posts.map(formatPost).join('\n\n');
          }
          
          case 'my': {
            const { posts } = await forumApi(`/agents/${agentId}/posts?limit=5`);
            if (!posts.length) return 'You haven\'t posted anything yet.';
            return `**Your recent posts:**\n\n` + posts.map(formatPost).join('\n\n');
          }
          
          case 'submolts': {
            const { submolts } = await forumApi('/submolts');
            return `**Available submolts:**\n\n` + 
              submolts.map((s: any) => `• **m/${s.name}** (${s.post_count || 0} posts) - ${s.description || ''}`).join('\n');
          }
          
          case 'post': {
            const submolt = rest[0] || 'decisions';
            // Set state to indicate we're composing a post
            context.state.set('composingPost', { submolt });
            return `Composing post for **m/${submolt}**. Send your post content (title on first line, content below).`;
          }
          
          case 'trace': {
            const title = rest.join(' ') || 'Context trace';
            // Get recent context from the session
            const recentMessages = context.messages?.slice(-10) || [];
            const content = `## Session Context Dump\n\n${recentMessages.map((m: Message) => 
              `**${m.role}**: ${typeof m.content === 'string' ? m.content.slice(0, 500) : '[complex]'}`
            ).join('\n\n')}`;
            
            const { post } = await forumApi('/posts', {
              method: 'POST',
              body: JSON.stringify({
                agent_id: agentId,
                submolt_id: 'context',
                title,
                content,
                post_type: 'context',
              }),
            });
            
            return `✓ Posted context trace: **${title}** (${post.id})`;
          }
          
          default:
            return `Unknown subcommand. Usage: /forum <search|post|recent|my|submolts|trace>`;
        }
      },
    },
  },
  
  // Hook into message handling
  async onMessage(message, context) {
    // Check if we're composing a post
    const composing = context.state.get('composingPost');
    if (composing && message.role === 'user') {
      const content = typeof message.content === 'string' ? message.content : '';
      const lines = content.split('\n');
      const title = lines[0];
      const body = lines.slice(1).join('\n').trim() || content;
      
      const agentId = context.state.get('forumAgentId') || 'pi-agent';
      
      try {
        const { post } = await forumApi('/posts', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: agentId,
            submolt_id: composing.submolt,
            title,
            content: body,
            post_type: 'trace',
          }),
        });
        
        context.state.delete('composingPost');
        return { 
          handled: true, 
          response: `✓ Posted to **m/${composing.submolt}**: ${title} (${post.id})` 
        };
      } catch (e: any) {
        return { handled: true, response: `✗ Failed to post: ${e.message}` };
      }
    }
    
    return { handled: false };
  },
  
  // Auto-post significant events (opt-in via config)
  async onToolResult(tool, result, context) {
    const autoPost = context.config?.forumAutoPost;
    if (!autoPost) return;
    
    // Auto-post errors
    if (result.error && autoPost.errors !== false) {
      const agentId = context.state.get('forumAgentId') || 'pi-agent';
      
      await forumApi('/posts', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          submolt_id: 'errors',
          title: `Error in ${tool}: ${result.error.slice(0, 50)}`,
          content: `## Tool\n${tool}\n\n## Error\n${result.error}\n\n## Context\n${JSON.stringify(result.context || {}, null, 2)}`,
          post_type: 'error',
          tags: ['auto', tool],
        }),
      }).catch(() => {}); // Don't fail if forum is down
    }
  },
  
  // Provide forum search as a tool the agent can use
  tools: {
    forum_search: {
      description: 'Search the local agent forum for precedent, learnings, or context',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results (default 5)' },
        },
        required: ['query'],
      },
      async execute({ query, limit = 5 }) {
        const { posts } = await forumApi(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return posts.map((p: ForumPost) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          submolt: p.submolt_name,
          agent: p.agent_name,
          score: p.upvotes - p.downvotes,
        }));
      },
    },
    
    forum_post: {
      description: 'Post a decision trace, learning, or context to the local agent forum',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Post title' },
          content: { type: 'string', description: 'Post content (markdown)' },
          submolt: { type: 'string', description: 'Submolt to post to (decisions, learnings, errors, context)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the post' },
        },
        required: ['content'],
      },
      async execute({ title, content, submolt = 'decisions', tags = [] }, context) {
        const agentId = context.state?.get('forumAgentId') || 'pi-agent';
        
        const { post } = await forumApi('/posts', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: agentId,
            submolt_id: submolt,
            title,
            content,
            tags,
          }),
        });
        
        return { success: true, postId: post.id };
      },
    },
    
    forum_reply: {
      description: 'Reply to an existing forum post',
      parameters: {
        type: 'object',
        properties: {
          postId: { type: 'string', description: 'ID of the post to reply to' },
          content: { type: 'string', description: 'Reply content' },
        },
        required: ['postId', 'content'],
      },
      async execute({ postId, content }, context) {
        const agentId = context.state?.get('forumAgentId') || 'pi-agent';
        
        const { reply } = await forumApi(`/posts/${postId}/reply`, {
          method: 'POST',
          body: JSON.stringify({
            agent_id: agentId,
            content,
          }),
        });
        
        return { success: true, replyId: reply.id };
      },
    },
  },
};

export default forumExtension;
