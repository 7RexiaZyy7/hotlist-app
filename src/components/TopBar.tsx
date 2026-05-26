import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getOAuthLoginUrl, oauthLogout, checkUserQuota, QuotaInfo } from '../services/cozeApi';
import { Settings, Zap, Scissors, LogIn, LogOut, User } from 'lucide-react';
import { clsx } from 'clsx';

export function TopBar() {
  const { 
    isConnected, 
    setConnected,
    creationStats,
    activePage,
    isLoggedIn,
    cozeUid,
    clearAuth,
    showToast,
    quota: storeQuota,
    setQuota,
  } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkUserQuota().then(setQuota);
    const interval = setInterval(() => checkUserQuota().then(setQuota), 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const quota = storeQuota;

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const url = await getOAuthLoginUrl();
      window.location.href = url;
    } catch {
      showToast('获取登录链接失败', 'error');
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await oauthLogout();
    clearAuth();
    showToast('已退出登录');
  };

  const pageLabels: Record<string, string> = {
    radar: '热榜驾驶舱',
    explore: '话题勘探',
    forge: '文案工坊',
    profile: '创作档案',
    analyze: '爆款拆解',
  };

  return (
    <>
      <header className="h-16 bg-surface border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-semibold">
            {pageLabels[activePage] || '内容引力引擎'}
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {quota && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm text-gray-400">今日额度</span>
                <span className={clsx(
                  'font-mono text-lg font-semibold',
                  quota.remaining <= 2 ? 'text-red-400' : quota.remaining <= 5 ? 'text-amber-400' : 'text-accent'
                )}>
                  {quota.remaining}/{quota.limit === 9999 ? '∞' : quota.limit}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                title={`Coze UID: ${cozeUid}`}
              >
                <User className="w-3.5 h-3.5 text-accent" />
                <span className="max-w-20 truncate">{cozeUid.slice(0, 8)}...</span>
                <LogOut className="w-3 h-3 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={loggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-accent to-orange-500 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                {loggingIn ? '跳转中...' : 'Coze 登录'}
              </button>
            )}

            <div 
              className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                isConnected ? 'bg-success' : 'bg-warning'
              )}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? '已连接' : '未连接'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-card rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 w-96 border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">连接状态</h2>
            <p className="text-sm text-gray-400 mb-4">
              {isConnected 
                ? 'API 代理已连接，Token 由服务端管理'
                : '请在 Vercel 环境变量中配置 COZE_PAT_TOKEN'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConnected(false);
                  setShowSettings(false);
                }}
                className="flex-1 px-4 py-2 bg-surface border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                断开
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-accent to-orange-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
