'use client';

import { useState } from 'react';
import { supabase, POINTS_CONFIG } from '@/lib/supabase';
import { shareWork } from '@/lib/client-api';

export default function ShareDialog({ shareData, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async () => {
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }

    setSharing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('请先登录');
        return;
      }

      const userId = session.user.id;
      const workId = crypto.randomUUID();
      const basePath = `${userId}/${workId}`;
      const imageFileName = `${basePath}/result.png`;
      const projectFileName = `${basePath}/project.strobeproj`;

      // 1. 上传图片到 Storage
      const imageData = dataURLtoBlob(shareData.imageDataUrl);
      const { error: imgErr } = await supabase.storage
        .from('works')
        .upload(imageFileName, imageData, { contentType: 'image/png' });
      if (imgErr) throw new Error('图片上传失败: ' + imgErr.message);

      // 获取图片公开 URL
      const { data: urlData } = supabase.storage
        .from('works')
        .getPublicUrl(imageFileName);

      // 2. 上传项目文件
      const projectBlob = new Blob([JSON.stringify(shareData.projectData)], { type: 'application/json' });
      const { error: projErr } = await supabase.storage
        .from('works')
        .upload(projectFileName, projectBlob, { contentType: 'application/json' });
      if (projErr) throw new Error('项目文件上传失败: ' + projErr.message);

      // 3. 调用客户端 API 创建记录并加积分
      const result = await shareWork({
        title: title.trim(),
        description: description.trim(),
        imagePath: imageFileName,
        projectFilePath: projectFileName,
        thumbnailUrl: urlData.publicUrl,
        mode: shareData.mode,
        frameCount: shareData.frameCount,
      });

      if (!result.success) throw new Error(result.error || '分享失败');

      // 4. 通知 iframe 工具
      window.postMessage({ type: 'strobe-share-success', message: `已分享到广场！获得 ${POINTS_CONFIG.shareReward} 积分` }, '*');
      onClose();
    } catch (err) {
      setError(err.message);
      window.postMessage({ type: 'strobe-share-error', message: err.message }, '*');
    } finally {
      setSharing(false);
    }
  };

  // dataURL 转 Blob
  function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">🚀 分享到广场</h2>

        {/* 预览图 */}
        <div className="mb-4 rounded-lg overflow-hidden bg-black/50">
          <img src={shareData.imageDataUrl} alt="预览" className="w-full max-h-48 object-contain" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的频闪照片起个名字..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下你的作品..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
          <div className="text-xs text-indigo-300 bg-indigo-500/10 rounded-lg p-2">
            💡 分享后你将获得 <strong>{POINTS_CONFIG.shareReward} 积分</strong>，其他用户下载你的作品时会消耗积分并给你奖励。
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-2">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
          >
            取消
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {sharing ? '分享中...' : '确认分享'}
          </button>
        </div>
      </div>
    </div>
  );
}
