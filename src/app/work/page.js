'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, POINTS_CONFIG } from '@/lib/supabase';
import { downloadWork } from '@/lib/client-api';

function WorkDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedProject, setDownloadedProject] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      // 获取作品详情
      const { data: workData } = await supabase
        .from('works')
        .select(`
          *,
          profiles!works_user_id_fkey(username, points)
        `)
        .eq('id', id)
        .single();

      if (workData) {
        setWork({
          ...workData,
          authorUsername: workData.profiles?.username,
        });
      }

      // 获取当前用户
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', session.user.id)
          .single();
        setUserPoints(profile?.points ?? 0);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const isOwner = currentUser && work && currentUser.id === work.user_id;

  const handleDownloadImage = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setDownloading(true);
    setMessage('');

    try {
      const result = await downloadWork(id, 'image');

      if (!result.success) {
        setMessage(result.error || '下载失败');
        setDownloading(false);
        return;
      }

      setUserPoints(result.remainingPoints);
      setDownloaded(true);

      // 下载文件
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `${work.title}.png`;
      link.click();

      setMessage('✅ 下载成功！');
    } catch (err) {
      setMessage('下载失败: ' + err.message);
    }
    setDownloading(false);
  };

  const handleDownloadProject = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setDownloading(true);
    setMessage('');

    try {
      const result = await downloadWork(id, 'project');

      if (!result.success) {
        setMessage(result.error || '下载失败');
        setDownloading(false);
        return;
      }

      setUserPoints(result.remainingPoints);
      setDownloadedProject(true);

      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `${work.title}.strobeproj`;
      link.click();

      setMessage('✅ 项目文件下载成功！导入后可继续编辑。');
    } catch (err) {
      setMessage('下载失败: ' + err.message);
    }
    setDownloading(false);
  };

  const handleDirectDownload = async (path, filename) => {
    const { data } = await supabase.storage.from('works').createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = filename;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😢</div>
        <p className="text-gray-400">作品不存在或已被删除</p>
        <Link href="/gallery" className="text-indigo-400 hover:text-indigo-300 transition mt-4 inline-block">
          返回广场 →
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/gallery" className="text-sm text-gray-400 hover:text-white transition mb-4 inline-block">
        ← 返回广场
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：图片 */}
        <div className="lg:col-span-2">
          <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden">
            <img
              src={work.thumbnail_url}
              alt={work.title}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* 右侧：信息和操作 */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h1 className="text-xl font-bold text-white mb-2">{work.title}</h1>

            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <span>作者: {work.authorUsername || '匿名'}</span>
            </div>

            {work.description && (
              <p className="text-sm text-gray-300 mb-3 leading-relaxed">{work.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
              <span className="px-2 py-1 rounded bg-white/5">
                {work.mode === 'brush' ? '🖌️ 涂抹模式' : '⚡ 自动模式'}
              </span>
              <span className="px-2 py-1 rounded bg-white/5">
                📷 {work.frame_count} 帧
              </span>
              <span className="px-2 py-1 rounded bg-white/5">
                📥 {work.download_count} 次下载
              </span>
              <span className="px-2 py-1 rounded bg-white/5">
                📅 {formatDate(work.created_at)}
              </span>
            </div>
          </div>

          {/* 下载操作 */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            {isOwner ? (
              <>
                <div className="text-sm text-indigo-300 bg-indigo-500/10 rounded-lg p-3 mb-3">
                  这是你的作品，可以免费下载
                </div>
                <button
                  onClick={() => handleDirectDownload(work.image_path, `${work.title}.png`)}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition mb-2"
                >
                  📥 下载图片
                </button>
                {work.project_file_path && (
                  <button
                    onClick={() => handleDirectDownload(work.project_file_path, `${work.title}.strobeproj`)}
                    className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                  >
                    📦 下载项目文件
                  </button>
                )}
              </>
            ) : currentUser ? (
              <>
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-gray-400">你的积分</span>
                  <span className="text-amber-400 font-medium">⚡ {userPoints}</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  下载消耗 {POINTS_CONFIG.downloadCost} 积分，作者获得 {Math.floor(POINTS_CONFIG.downloadCost / 2)} 积分
                </div>

                <button
                  onClick={handleDownloadImage}
                  disabled={downloading || downloaded}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 mb-2"
                >
                  {downloading ? '下载中...' : downloaded ? '✅ 已下载' : `📥 下载图片 (${POINTS_CONFIG.downloadCost} 积分)`}
                </button>

                {work.project_file_path && (
                  <button
                    onClick={handleDownloadProject}
                    disabled={downloading || downloadedProject}
                    className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition disabled:opacity-50"
                  >
                    {downloading ? '下载中...' : downloadedProject ? '✅ 已下载' : `📦 下载项目文件 (${POINTS_CONFIG.downloadCost} 积分)`}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">登录后可下载</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition"
                >
                  去登录
                </Link>
              </div>
            )}

            {message && (
              <div className="mt-3 text-sm bg-white/5 rounded-lg p-2 text-gray-300">{message}</div>
            )}
          </div>

          {/* 导入提示 */}
          {downloadedProject && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-sm text-green-300">
              <p className="font-medium mb-1">💡 如何使用项目文件？</p>
              <p>打开制作工具页面，点击「导入已有项目」，选择下载的 .strobeproj 文件即可继续编辑。</p>
              <Link href="/tool" className="text-green-400 hover:text-green-300 transition mt-2 inline-block">
                前往工具 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <WorkDetailContent />
    </Suspense>
  );
}
