'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, TrendingUp, Heart, Star, Filter, Plus,
  Send, Tag, Bookmark, Users, Award, ChevronDown, MessageCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

const POST_TYPES = [
  { value: '', label: 'All Posts' },
  { value: 'insight', label: '💡 Insights' },
  { value: 'analysis', label: '📊 Analysis' },
  { value: 'news', label: '📰 News' },
  { value: 'discussion', label: '💬 Discussion' },
  { value: 'question', label: '❓ Questions' },
];

const TYPE_COLORS: Record<string, string> = {
  insight: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  analysis: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  news: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  discussion: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  question: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'insight', tags: '' });

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getCommunityFeed({ type: filter || undefined, sort });
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [filter, sort]);

  const handleLike = async (postId: string) => {
    try {
      const result = await api.likePost(postId, 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: result.likes } : p));
    } catch (e) { console.error(e); }
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await api.createPost({
        walletAddress: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        authorName: 'Arjun Mehta',
        type: newPost.type,
        title: newPost.title,
        content: newPost.content,
        tags: newPost.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setShowNewPost(false);
      setNewPost({ title: '', content: '', type: 'insight', tags: '' });
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center">
                  <Users size={22} className="text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-white">Community</h1>
              </div>
              <p className="text-white/40">{total} insights shared by investors worldwide</p>
            </div>
            <button onClick={() => setShowNewPost(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors">
              <Plus size={18} /> New Post
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === t.value
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/50 border border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/60 text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* New Post Modal */}
        {showNewPost && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">Share your insight</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <select
                  value={newPost.type}
                  onChange={e => setNewPost(p => ({ ...p, type: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <option value="insight">💡 Insight</option>
                  <option value="analysis">📊 Analysis</option>
                  <option value="news">📰 News</option>
                  <option value="discussion">💬 Discussion</option>
                  <option value="question">❓ Question</option>
                </select>
                <input
                  value={newPost.title}
                  onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  placeholder="Post title..."
                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <textarea
                value={newPost.content}
                onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                placeholder="Write your analysis, insight, or question..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
              />
              <div className="flex items-center justify-between">
                <input
                  value={newPost.tags}
                  onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))}
                  placeholder="Tags (comma separated)..."
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-64"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowNewPost(false)} className="px-4 py-2 rounded-xl bg-white/5 text-white/50 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleCreatePost} className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2">
                    <Send size={16} /> Publish
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-20 text-white/40">Loading community feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-white/40">No posts yet. Be the first to share!</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <motion.article
                key={post._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {(post.authorName || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{post.authorName || 'Anonymous'}</div>
                      <div className="text-xs text-white/30">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.isPinned && (
                      <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold border border-amber-500/20">📌 Pinned</span>
                    )}
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${TYPE_COLORS[post.type] || 'bg-white/5 text-white/40 border-white/10'}`}>
                      {post.type}
                    </span>
                  </div>
                </div>

                {/* Post Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                <p className="text-white/50 leading-relaxed whitespace-pre-line text-sm mb-4 line-clamp-4">
                  {post.content}
                </p>

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag: string, j: number) => (
                      <span key={j} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-white/40 text-xs">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleLike(post._id)}
                    className="flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors text-sm"
                  >
                    <Heart size={16} className={post.likes > 0 ? 'fill-red-400 text-red-400' : ''} />
                    <span className="font-medium">{post.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <MessageCircle size={16} />
                    <span className="font-medium">{post.commentsCount || 0} comments</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
