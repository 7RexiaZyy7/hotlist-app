import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HotRadar } from './pages/HotRadar';
import { TopicExplorer } from './pages/TopicExplorer';
import { ContentForge } from './pages/ContentForge';
import { CreatorProfile } from './pages/CreatorProfile';
import { HitAnalyzer } from './pages/HitAnalyzer';
import { AuthCallback } from './pages/AuthCallback';
import { ThemeSelector } from './pages/ThemeSelector';
import { useAppStore } from './store';
import { getOAuthStatus, setUserId, getOAuthLoginUrl } from './services/cozeApi';
import { Check, AlertCircle, Info, Loader2, AlertTriangle, Flame, Search, Sparkles, User, Scissors } from 'lucide-react';
import QuotaModal from './components/QuotaModal';
import { clsx } from 'clsx';

const mobileNavItems = [
  { id: 'radar', label: '热榜', icon: Flame },
  { id: 'explore', label: '勘探', icon: Search },
  { id: 'forge', label: '文案', icon: Sparkles },
  { id: 'profile', label: '档案', icon: User },
  { id: 'analyze', label: '拆解', icon: Scissors },
];

function Toast() {
  const { toast } = useAppStore();
  if (!toast) return null;

  const iconMap: Record<string, JSX.Element> = {
    success: <Check className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-error" />,
    info: <Info className="w-4 h-4 text-accent" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  };

  return (
    <div className="fixed top-16 right-4 z-50 animate-fadeIn">
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-lg">
        {iconMap[toast.type]}
        <span className="text-body-sm text-text-primary">{toast.message}</span>
      </div>
    </div>
  );
}

function App() {
  const { activePage, isLoggedIn, isLoadingAuth, setAuth, clearAuth, setLoadingAuth, quota, showQuotaModal, setShowQuotaModal } = useAppStore();

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) clearAuth();
    }, 5000);

    (async () => {
      const savedUid = localStorage.getItem('coze_oauth_uid');
      if (savedUid) {
        setAuth(savedUid, '');
        clearTimeout(timeout);
      }
      try {
        const status = await getOAuthStatus();
        if (!mounted) return;
        clearTimeout(timeout);
        if (status.loggedIn && status.uid) {
          setAuth(status.uid, status.access_token || '');
          setUserId(status.uid);
        } else if (!savedUid) {
          clearAuth();
        }
      } catch {
        if (!mounted) return;
        clearTimeout(timeout);
        if (!savedUid) clearAuth();
      }
    })();

    return () => { mounted = false; clearTimeout(timeout); };
  }, [setAuth, clearAuth, setLoadingAuth]);

  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'radar': return <HotRadar />;
      case 'explore': return <TopicExplorer />;
      case 'forge': return <ContentForge />;
      case 'profile': return <CreatorProfile />;
      case 'analyze': return <HitAnalyzer />;
      case 'theme': return <ThemeSelector />;
      default: return <HotRadar />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-base">
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-surface border-t border-border flex items-center justify-around px-2 py-1 z-40">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => useAppStore.getState().setActivePage(item.id)}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-md transition-all duration-120',
                isActive ? 'text-accent' : 'text-text-tertiary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-caption">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Toast />

      {showQuotaModal && quota && (
        <QuotaModal
          quota={quota}
          onClose={() => setShowQuotaModal(false)}
          onLogin={async () => {
            setShowQuotaModal(false);
            try {
              const url = await getOAuthLoginUrl();
              window.location.href = url;
            } catch {
              useAppStore.getState().showToast('获取登录链接失败', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

export default App;