import { createClient } from '@supabase/supabase-js';
import { getMockSupabase } from './mock-supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  !supabaseUrl || supabaseUrl.includes('placeholder');

if (isDemoMode && typeof window !== 'undefined') {
  console.info('🎭 [Demo Mode] 使用本地内存数据存储，无需 Supabase。重启服务后数据会清空。');
}

function createRealClient() {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

export const supabase = isDemoMode ? getMockSupabase() : createRealClient();
export { isDemoMode };

// 积分配置
export const POINTS_CONFIG = {
  registerBonus: parseInt(process.env.REGISTER_BONUS_POINTS || '100'),
  shareReward: parseInt(process.env.SHARE_REWARD_POINTS || '10'),
  downloadCost: parseInt(process.env.DOWNLOAD_COST_POINTS || '5'),
};