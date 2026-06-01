import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { getOAuthLoginUrl, oauthLogout, checkUserQuota, QuotaInfo } from '../services/cozeApi';
import { Settings, Zap, LogIn, LogOut } from 'lucide-react';
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
  const setActivePage = useAppStore((s) => s.setActivePage);
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

  const displayUid = useMemo(() => {
    if (!cozeUid) return '';
    return cozeUid.length > 8 ? `${cozeUid.slice(0, 8)}...` : cozeUid;
  }, [cozeUid]);

  return (
    <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-text-primary">热点工坊</h1>
        </div>
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
            {displayUid && (
              <span className="text-caption text-text-tertiary hidden sm:inline">{displayUid}</span>
            )}
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
            <span className="text-body-sm font-medium">{loggingIn ? '登录中...' : 'Coze 登录'}</span>
          </button>
        )}

        <div ref={settingsRef} className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md hover:bg-bg-elevated transition-all duration-120"
            aria-label="设置"
          >
            <Settings className="w-4 h-4 text-text-tertiary" />
          </button>
          {showSettings && (
            <div className="absolute right-0 mt-1 w-48 bg-bg-surface border border-border rounded-lg p-1 z-40 animate-fadeIn shadow-lg">
              <button
                onClick={() => { setShowSettings(false); setActivePage('profile'); }}
                className="w-full px-3 py-2 rounded-md text-left text-body-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                创作者档案
              </button>
              <button
                onClick={() => { setShowSettings(false); setShowQuotaModal(true); }}
                className="w-full px-3 py-2 rounded-md text-left text-body-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                使用额度
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
