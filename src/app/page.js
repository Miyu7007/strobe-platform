'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import WorkCard from '@/components/WorkCard';

export default function HomePage() {
  const [featuredWorks, setFeaturedWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('works')
        .select(`
          *,
          profiles!works_user_id_fkey(username)
        `)
        .order('download_count', { ascending: false })
        .limit(6);
      setFeaturedWorks(data || []);
      setLoading(false);
    };
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-transparent"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              频闪照片创作平台
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            上传视频，提取关键帧，自动合成或手动涂抹，创作令人惊叹的频闪照片。
            分享你的作品，下载他人的项目，在创作社区中共同成长。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/tool"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/30"
            >
              🎬 开始制作
            </Link>
            <Link
              href="/gallery"
              className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition"
            >
              🖼️ 浏览广场
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">自动检测模式</h3>
            <p className="text-sm text-gray-400">智能检测视频中的运动物体，自动提取运动轨迹，一键生成频闪照片。</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition">
            <div className="text-3xl mb-3">🖌️</div>
            <h3 className="text-lg font-semibold text-white mb-2">涂抹编辑模式</h3>
            <p className="text-sm text-gray-400">手动涂抹选择运动物体区域，精确控制每一帧的合成效果，创作更精细的作品。</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-white mb-2">分享与积分</h3>
            <p className="text-sm text-gray-400">分享作品获得积分，下载他人项目消耗积分。在社区中互相学习，共同进步。</p>
          </div>
        </div>
      </section>

      {/* Featured Works */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🔥 热门作品</h2>
          <Link href="/gallery" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/5"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : featuredWorks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredWorks.map((work) => (
              <WorkCard key={work.id} work={{ ...work, username: work.profiles?.username }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🎨</div>
            <p>还没有作品，快来成为第一个创作者吧！</p>
            <Link href="/tool" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 transition">
              立即创作 →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
