'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import WorkCard from '@/components/WorkCard';

export default function GalleryPage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  const fetchWorks = async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;

    let query = supabase
      .from('works')
      .select(`
        id, title, thumbnail_url, mode, frame_count, download_count, created_at,
        profiles!works_user_id_fkey(username)
      `)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (modeFilter !== 'all') {
      query = query.eq('mode', modeFilter);
    }

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    const { data } = await query;

    const formatted = (data || []).map(w => ({ ...w, username: w.profiles?.username }));

    if (reset || currentPage === 0) {
      setWorks(formatted);
    } else {
      setWorks(prev => [...prev, ...formatted]);
    }

    setHasMore(formatted.length === PAGE_SIZE);
    setPage(currentPage);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorks(true);
  }, [modeFilter]);

  const handleSearch = () => {
    fetchWorks(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">🖼️ 作品广场</h1>

      {/* 搜索和筛选 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索作品..."
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setModeFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm transition ${modeFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
          >
            全部
          </button>
          <button
            onClick={() => setModeFilter('auto')}
            className={`px-3 py-2 rounded-lg text-sm transition ${modeFilter === 'auto' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
          >
            ⚡ 自动
          </button>
          <button
            onClick={() => setModeFilter('brush')}
            className={`px-3 py-2 rounded-lg text-sm transition ${modeFilter === 'brush' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
          >
            🖌️ 涂抹
          </button>
        </div>
      </div>

      {/* 作品网格 */}
      {loading && works.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/5"></div>
              <div className="p-3 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4"></div>
                <div className="h-3 bg-white/5 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : works.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => { setPage(p => p + 1); fetchWorks(false); }}
                className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
              >
                加载更多
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg">暂无作品</p>
          <p className="text-sm mt-2">尝试更换搜索条件，或成为第一个创作者！</p>
        </div>
      )}
    </div>
  );
}
