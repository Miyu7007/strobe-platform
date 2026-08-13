// 客户端 API 助手 - 替代服务端 API 路由
// 在真实 Supabase 模式下使用 RPC 函数
// 在 Demo 模式下回退到调用 API 路由（仅 next dev 可用）

import { supabase, isDemoMode, POINTS_CONFIG } from './supabase';

/**
 * 分享作品到广场
 * @param {Object} params - { title, description, imagePath, projectFilePath, thumbnailUrl, mode, frameCount }
 * @returns {Object} { success, workId, message, newPoints }
 */
export async function shareWork(params) {
  const { title, description, imagePath, projectFilePath, thumbnailUrl, mode, frameCount } = params;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: '请先登录' };
  }

  // 1. 插入作品记录
  const { data: work, error: workError } = await supabase
    .from('works')
    .insert({
      user_id: session.user.id,
      title: title.substring(0, 50),
      description: description?.substring(0, 200) || null,
      image_path: imagePath,
      project_file_path: projectFilePath || null,
      thumbnail_url: thumbnailUrl,
      mode: mode || 'auto',
      frame_count: frameCount || 0,
      download_count: 0,
    })
    .select()
    .single();

  if (workError) {
    return { success: false, error: '创建作品失败: ' + workError.message };
  }

  // 2. 通过 RPC 函数奖励积分
  if (isDemoMode) {
    // Demo 模式：调用 API 路由（仅 next dev 可用）
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || '',
          imagePath,
          projectFilePath: projectFilePath || null,
          thumbnailUrl,
          mode: mode || 'auto',
          frameCount: frameCount || 0,
        }),
      });
      const result = await res.json();
      return result;
    } catch (err) {
      return { success: false, error: '分享失败: ' + err.message };
    }
  }

  // 真实 Supabase 模式：调用 RPC 函数
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('award_share_points', {
      p_work_id: work.id,
      p_title: title.substring(0, 50),
    });

  if (rpcError) {
    return { success: false, error: '积分奖励失败: ' + rpcError.message };
  }

  // rpcResult 是 JSON 对象
  const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

  return {
    success: result.success,
    workId: work.id,
    message: result.message || `分享成功！获得 ${POINTS_CONFIG.shareReward} 积分`,
    newPoints: result.newPoints,
  };
}

/**
 * 下载作品（扣积分 + 获取签名 URL）
 * @param {string} workId - 作品 ID
 * @param {string} fileType - 'image' 或 'project'
 * @returns {Object} { success, downloadUrl, remainingPoints, isFree }
 */
export async function downloadWork(workId, fileType) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: '请先登录' };
  }

  if (isDemoMode) {
    // Demo 模式：调用 API 路由（仅 next dev 可用）
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workId, fileType }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: '下载失败: ' + err.message };
    }
  }

  // 真实 Supabase 模式：调用 RPC 函数处理积分
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('process_download', {
      p_work_id: workId,
      p_file_type: fileType,
    });

  if (rpcError) {
    return { success: false, error: '下载失败: ' + rpcError.message };
  }

  const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

  if (!result.success) {
    return result;
  }

  // 获取文件路径
  const { data: work } = await supabase
    .from('works')
    .select('image_path, project_file_path')
    .eq('id', workId)
    .single();

  const filePath = fileType === 'project' ? work?.project_file_path : work?.image_path;
  if (!filePath) {
    return { success: false, error: '文件不存在' };
  }

  // 创建签名 URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from('works')
    .createSignedUrl(filePath, 3600);

  if (urlError || !urlData?.signedUrl) {
    return { success: false, error: '生成下载链接失败' };
  }

  return {
    success: true,
    downloadUrl: urlData.signedUrl,
    remainingPoints: result.remainingPoints,
    isFree: result.isFree,
  };
}
