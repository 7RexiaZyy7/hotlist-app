import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { getOAuthLoginUrl, oauthLogout, checkUserQuota, QuotaInfo } from '../services/cozeApi';
import { Settings, Zap, Scissors, LogIn, LogOut, User, Flame, Search, Sparkles, Palette } from 'lucide-react';
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
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUserQuota().then(setQuota);
    const interval = setInterval(() => checkUserQuota().then(setQuota), 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

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
    <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-text-primary">热点引力引擎</h1>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'radar', label: '热榜驾驶舱', icon: Flame },
            { id: 'explore', label: '话题勘探', icon: Search },
            { id: 'forge', label: '文案工坊', icon: Sparkles },
            { id: 'analyze', label: '爆款拆解', icon: Scissors },
            { id: 'profile', label: '创作档案', icon: User },
            { id: 'theme', label: '设计风格', icon: Palette },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => useAppStore.getState().setActivePage(item.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-md flex items-center gap-2 transition-all duration-120',
                  isActive
                    ? 'bg-accent-subtle text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-body-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowQuotaModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-border transition-all duration-120 cursor-pointer"
        >
          <Zap className="w-4 h-4 text-warning" />
          <span className="text-body-sm font-medium text-text-primary">
            {quota ? `${quota.used}/${quota.limit}` : '--'}
          </span>
          {quota && quota.tier && getTierBadge(quota.tier)}
        </button>

        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <span className="text-caption text-text-tertiary hidden sm:inline">{cozeUid.slice(0, 8)}...</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-error/10 text-error hover:bg-error/20 transition-all duration-120"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-body-sm font-medium">退出</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-120',
              loggingIn
                ? 'bg-bg-elevated text-text-tertiary cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent-hover'
            )}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="text-body-sm font-medium">{loggingIn ? '登录中...' : 'Coze登录'}</span>
          </button>
        )}

        <div ref={settingsRef} className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md hover:bg-bg-elevated transition-all duration-120"
          >
            <Settings className="w-4 h-4 text-text-tertiary" />
          </button>
          {showSettings && (
            <div className="absolute right-0 mt-1 w-48 bg-bg-surface border border-border rounded-lg p-1 z-40 animate-fadeIn shadow-lg">
              <button className="w-full px-3 py-2 rounded-md text-left text-body-sm text-text-secondary hover:bg-bg-elevated transition-colors">
                偏好设置
              </button>
              <button className="w-full px-3 py-2 rounded-md text-left text-body-sm text-text-secondary hover:bg-bg-elevated transition-colors">
                关于我们
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}