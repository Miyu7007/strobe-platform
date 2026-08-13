'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import WorkCard from '@/components/WorkCard';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [works, setWorks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('works');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 获取 profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      // 获取用户作品
      const { data: worksData } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setWorks(worksData || []);

      // 获取积分记录
      const { data: txData } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions(txData || []);

      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 用户信息卡片 */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{profile?.username}</h1>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">⚡ {profile?.points ?? 0}</div>
              <div className="text-xs text-gray-500">积分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{works.length}</div>
              <div className="text-xs text-gray-500">作品</div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('works')}
          className={`px-4 py-2 rounded-lg text-sm transition ${tab === 'works' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
        >
          📸 我的作品
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`px-4 py-2 rounded-lg text-sm transition ${tab === 'transactions' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
        >
          💰 积分明细
        </button>
      </div>

      {/* 内容 */}
      {tab === 'works' ? (
        works.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map((w) => (
              <WorkCard key={w.id} work={{ ...w, username: profile?.username }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🎨</div>
            <p>还没有作品</p>
            <Link href="/tool" className="text-indigo-400 hover:text-indigo-300 transition mt-4 inline-block">
              开始创作 →
            </Link>
          </div>
        )
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {transactions.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left p-3 font-normal">类型</th>
                  <th className="text-left p-3 font-normal">描述</th>
                  <th className="text-right p-3 font-normal">积分变动</th>
                  <th className="text-right p-3 font-normal">时间</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${tx.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tx.type === 'register_bonus' ? '注册奖励' : tx.type === 'share' ? '分享' : tx.type === 'download' ? '下载' : tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300">{tx.description || '-'}</td>
                    <td className={`p-3 text-right font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="p-3 text-right text-gray-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>暂无积分记录</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
