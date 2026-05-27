import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getOAuthLoginUrl, oauthLogout, checkUserQuota, QuotaInfo } from '../services/cozeApi';
import { Settings, Zap, Scissors, LogIn, LogOut, User, Flame, Search, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export function TopBar() {
  const isConnected = useAppStore((s) => s.isConnected);
  const activePage = useAppStore((s) => s.activePage);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const cozeUid = useAppStore((s) => s.cozeUid);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const showToast = useAppStore((s) => s.showToast);
  const quota = useAppStore((s) => s.quota);
  const setQuota = useAppStore((s) => s.setQuota);
  const setShowQuotaModal = useAppStore((s) => s.setShowQuotaModal);
  const [showSettings, setShowSettings] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkUserQuota().then(setQuota);
    const interval = setInterval(() => checkUserQuota().then(setQuota), 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

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
    localStorage.removeItem('coze_oauth_uid');
    clearAuth();
    setQuota({ allowed: true, used: 0, limit: 3, tier: 'anon', remaining: 3 });
    showToast('已退出登录');
    checkUserQuota().then(setQuota);
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'pro') return <span className="tier-badge pro">Pro</span>;
    if (tier === 'free') return <span className="tier-badge free">登录用户</span>;
    return <span className="tier-badge anon">游客</span>;
  };

  return (
    <>
      <header className="h-16 glass-card mx-4 mt-4 rounded-2xl px-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center pulse-glow">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg gradient-text">热点引力引擎</h1>
              <p className="text-xs text-text-muted">爆款文案生成器</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'radar', label: '热榜驾驶舱', icon: Flame },
              { id: 'explore', label: '话题勘探', icon: Search },
              { id: 'forge', label: '文案工坊', icon: Sparkles },
              { id: 'analyze', label: '爆款拆解', icon: Scissors },
              { id: 'profile', label: '创作档案', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => useAppStore.getState().setActivePage(item.id)}
                  className={clsx(
                    'px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowQuotaModal(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">
                {quota ? `${quota.used}/${quota.limit}` : '--'}
              </span>
            </div>
            {quota && quota.tier && getTierBadge(quota.tier)}
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{cozeUid.slice(0, 8)}...</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">退出</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300',
                loggingIn
                  ? 'bg-white/10 text-text-muted cursor-not-allowed'
                  : 'glow-button'
              )}
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm font-medium">{loggingIn ? '登录中...' : 'Coze登录'}</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl hover:bg-white/5 transition-all duration-300"
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 glass-card p-2 fade-in">
                <button className="w-full px-4 py-2 rounded-lg text-left text-sm hover:bg-white/5 transition-colors">
                  偏好设置
                </button>
                <button className="w-full px-4 py-2 rounded-lg text-left text-sm hover:bg-white/5 transition-colors">
                  关于我们
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}