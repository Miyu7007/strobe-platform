'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ShareDialog from '@/components/ShareDialog';

export default function ToolPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shareData, setShareData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setIsLoggedIn(true);
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  // 监听来自 iframe 的分享消息
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'strobe-share') {
        setShareData(e.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 mb-4 text-sm text-indigo-300 flex items-center gap-2">
          <span>💡</span>
          <span>使用工具制作频闪照片后，点击「分享到广场」即可分享你的作品并获得积分</span>
        </div>

        {/* iframe 嵌入频闪工具 */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50">
          <iframe
            src="/tool.html"
            className="w-full"
            style={{ minHeight: 'calc(100vh - 12rem)', border: 'none' }}
            title="频闪照片合成器"
          />
        </div>
      </div>

      {/* 分享对话框 */}
      {shareData && (
        <ShareDialog
          shareData={shareData}
          onClose={() => setShareData(null)}
        />
      )}
    </div>
  );
}
