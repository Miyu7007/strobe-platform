'use client';

import Link from 'next/link';

export default function WorkCard({ work }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <Link href={`/work/?id=${work.id}`} className="group">
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
        {/* 缩略图 */}
        <div className="relative aspect-video bg-black/50 overflow-hidden">
          <img
            src={work.thumbnail_url}
            alt={work.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-gray-300">
            {work.mode === 'brush' ? '🖌️ 涂抹' : '⚡ 自动'}
          </div>
        </div>

        {/* 信息 */}
        <div className="p-3">
          <h3 className="text-white text-sm font-medium truncate group-hover:text-indigo-400 transition">
            {work.title}
          </h3>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span className="truncate">{work.username || '匿名用户'}</span>
            <span className="flex items-center gap-1">
              <span>📥 {work.download_count}</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{formatDate(work.created_at)}</div>
        </div>
      </div>
    </Link>
  );
}
