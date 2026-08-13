import { createClient } from '@supabase/supabase-js';
import { getMockSupabase } from './mock-supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  !supabaseUrl || supabaseUrl.includes('placeholder');

function createRealAdmin() {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// 在 demo 模式下也导出同一个 mock 客户端（API 路由用不到 supabaseAdmin，
// 因为它们已经改用 mock-store.js 了）。这里只是为了不破坏 import。
export const supabaseAdmin = isDemoMode ? getMockSupabase() : createRealAdmin();
export { isDemoMode };

export const POINTS_CONFIG = {
  registerBonus: parseInt(process.env.REGISTER_BONUS_POINTS || '100'),
  shareReward: parseInt(process.env.SHARE_REWARD_POINTS || '10'),
  downloadCost: parseInt(process.env.DOWNLOAD_COST_POINTS || '5'),
};