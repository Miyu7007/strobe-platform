-- ============================================
-- 频闪照片平台 - RPC 函数（客户端直接调用）
-- 替代服务端 API 路由，用于积分操作
-- ============================================

-- ============================================
-- 1. 分享作品时奖励积分
-- ============================================
CREATE OR REPLACE FUNCTION award_share_points(p_work_id UUID, p_title TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_reward INTEGER := 10;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', '未登录');
  END IF;

  SELECT points INTO v_current_points FROM profiles WHERE id = v_user_id;
  IF v_current_points IS NULL THEN
    RETURN json_build_object('success', false, 'error', '用户不存在');
  END IF;

  v_new_points := v_current_points + v_reward;
  UPDATE profiles SET points = v_new_points WHERE id = v_user_id;

  INSERT INTO point_transactions (user_id, amount, type, work_id, description)
  VALUES (v_user_id, v_reward, 'share', p_work_id, '分享作品「' || p_title || '」');

  RETURN json_build_object(
    'success', true,
    'newPoints', v_new_points,
    'message', '分享成功！获得 ' || v_reward || ' 积分'
  );
END;
$$;

-- ============================================
-- 2. 下载作品时扣积分 + 奖励作者
-- ============================================
CREATE OR REPLACE FUNCTION process_download(p_work_id UUID, p_file_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_work RECORD;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_sharer_points INTEGER;
  v_sharer_new_points INTEGER;
  v_cost INTEGER := 5;
  v_sharer_reward INTEGER := 2;
  v_already_downloaded BOOLEAN := false;
  v_is_owner BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', '未登录');
  END IF;

  SELECT * INTO v_work FROM works WHERE id = p_work_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '作品不存在');
  END IF;

  v_is_owner := (v_user_id = v_work.user_id);

  -- 检查是否已下载过
  SELECT EXISTS(
    SELECT 1 FROM point_transactions
    WHERE user_id = v_user_id AND work_id = p_work_id AND type = 'download'
  ) INTO v_already_downloaded;

  IF v_is_owner OR v_already_downloaded THEN
    SELECT points INTO v_current_points FROM profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', true,
      'isFree', true,
      'remainingPoints', COALESCE(v_current_points, 0)
    );
  END IF;

  -- 检查积分
  SELECT points INTO v_current_points FROM profiles WHERE id = v_user_id;
  IF v_current_points IS NULL OR v_current_points < v_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', '积分不足！下载需要 ' || v_cost || ' 积分，你当前有 ' || COALESCE(v_current_points, 0) || ' 积分'
    );
  END IF;

  -- 扣除下载者积分
  v_new_points := v_current_points - v_cost;
  UPDATE profiles SET points = v_new_points WHERE id = v_user_id;

  -- 奖励分享者
  IF v_sharer_reward > 0 THEN
    SELECT points INTO v_sharer_points FROM profiles WHERE id = v_work.user_id;
    IF v_sharer_points IS NOT NULL THEN
      v_sharer_new_points := v_sharer_points + v_sharer_reward;
      UPDATE profiles SET points = v_sharer_new_points WHERE id = v_work.user_id;

      INSERT INTO point_transactions (user_id, amount, type, work_id, description)
      VALUES (v_work.user_id, v_sharer_reward, 'share', p_work_id, '作品「' || v_work.title || '」被下载');
    END IF;
  END IF;

  -- 记录下载者交易
  INSERT INTO point_transactions (user_id, amount, type, work_id, description)
  VALUES (
    v_user_id, -v_cost, 'download', p_work_id,
    '下载作品「' || v_work.title || '」的' || CASE WHEN p_file_type = 'project' THEN '项目文件' ELSE '图片' END
  );

  -- 更新下载次数
  UPDATE works SET download_count = COALESCE(download_count, 0) + 1 WHERE id = p_work_id;

  RETURN json_build_object(
    'success', true,
    'isFree', false,
    'remainingPoints', v_new_points
  );
END;
$$;

-- ============================================
-- 3. 更新 RLS 策略：允许用户插入自己的交易记录
-- ============================================
CREATE POLICY "transactions_insert_own" ON point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. 授予执行权限
-- ============================================
GRANT EXECUTE ON FUNCTION award_share_points(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_download(UUID, TEXT) TO anon, authenticated;
