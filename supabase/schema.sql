-- ============================================
-- 频闪照片平台 - Supabase 数据库 Schema
-- ============================================

-- 1. 用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  points INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 作品表
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT NOT NULL,
  project_file_path TEXT,
  thumbnail_url TEXT NOT NULL,
  mode TEXT DEFAULT 'auto',
  frame_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 积分交易记录表
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  work_id UUID REFERENCES works(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可读，仅本人可更新
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- works: 所有人可读，仅本人可增删改
CREATE POLICY "works_select" ON works FOR SELECT USING (true);
CREATE POLICY "works_insert" ON works FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "works_update" ON works FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "works_delete" ON works FOR DELETE USING (auth.uid() = user_id);

-- point_transactions: 仅本人可读，不允许直接插入（由 service role 操作）
CREATE POLICY "transactions_select" ON point_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 触发器：新用户注册时自动创建 profile
-- 注意：新版 Supabase 要求 SECURITY DEFINER 函数显式 SET search_path
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    100
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON point_transactions(user_id);

-- ============================================
-- 权限授权（确保 anon/authenticated 角色能访问）
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON works TO anon, authenticated;
GRANT SELECT ON point_transactions TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;
GRANT ALL ON storage.objects TO anon, authenticated;

-- ============================================
-- 存储桶
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('works', 'works', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 存储桶策略
-- ============================================
CREATE POLICY "works_bucket_read" ON storage.objects FOR SELECT USING (bucket_id = 'works');
CREATE POLICY "works_bucket_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'works');
CREATE POLICY "works_bucket_update" ON storage.objects FOR UPDATE USING (bucket_id = 'works');
