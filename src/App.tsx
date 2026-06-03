import { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HotRadar } from './pages/HotRadar';
import { TopicExplorer } from './pages/TopicExplorer';
import { ContentForge } from './pages/ContentForge';
import { ContentSearch } from './pages/ContentSearch';
import { ContentPublish } from './pages/ContentPublish';
import { AuthCallback } from './pages/AuthCallback';
import { HitAnalyzer } from './pages/HitAnalyzer';
import { CreatorProfile } from './pages/CreatorProfile';
import { useAppStore } from './store';
import { getOAuthStatus, setUserId } from './services/cozeApi';
import { Check, AlertCircle, Info, Loader2, AlertTriangle, Flame, Search as SearchIcon, Sparkles, Globe, X } from 'lucide-react';
import { clsx } from 'clsx';
import QuotaModal from './components/QuotaModal';

const mobileNavItems = [
  { id: 'radar', label: '热榜', icon: Flame },
  { id: 'search', label: '搜索', icon: Globe },
  { id: 'explore', label: '话题', icon: SearchIcon },
  { id: 'forge', label: '文案', icon: Sparkles },
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
    <div className="fixed top-14 right-4 z-50 animate-fadeIn">
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-lg">
        {iconMap[toast.type]}
        <span className="text-body-sm text-text-primary">{toast.message}</span>
      </div>
    </div>
  );
}

const PATH_PAGE_MAP: Record<string, string> = {
  '/workshop': 'forge',
  '/search': 'search',
  '/explore': 'explore',
  '/publish': 'publish',
  '/analyze': 'analyze',
  '/profile': 'profile',
};

function App() {
  const { activePage, isLoggedIn, isLoadingAuth, setAuth, clearAuth, setLoadingAuth, quota, showQuotaModal, setShowQuotaModal } = useAppStore();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mapped = PATH_PAGE_MAP[window.location.pathname];
    if (mapped && mapped !== activePage) {
      useAppStore.getState().setActivePage(mapped);
    }
  }, []);

  useEffect(() => {
    const pageTitleMap: Record<string, string> = {
      radar: '热点雷达 - 热点工坊',
      search: '内容搜索 - 热点工坊',
      explore: '话题勘探 - 热点工坊',
      forge: '文案工坊 - 热点工坊',
      publish: '一键发布 - 热点工坊',
      analyze: '文案拆解 - 热点工坊',
      profile: '创作者档案 - 热点工坊',
    };
    document.title = pageTitleMap[activePage] || '热点工坊';
  }, [activePage]);

  useEffect(() => {
    const handlePopState = () => {
      const page = new URLSearchParams(window.location.search).get('page') || 'radar';
      useAppStore.getState().setActivePage(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      case 'search': return <ContentSearch />;
      case 'explore': return <TopicExplorer />;
      case 'forge': return <ContentForge />;
      case 'publish': return <ContentPublish />;
      case 'analyze': return <HitAnalyzer />;
      case 'profile': return <CreatorProfile />;
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

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed bottom-12 left-0 right-0 md:hidden bg-bg-surface border-t border-border p-3 z-40">
          <div className="relative flex items-center gap-2">
            <input
              ref={mobileSearchRef}
              type="text"
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mobileSearchQuery.trim()) {
                  useAppStore.getState().setMobileSearchQuery(mobileSearchQuery);
                  useAppStore.getState().setActivePage('search');
                  setMobileSearchOpen(false);
                }
              }}
              placeholder="搜索话题..."
              className="input-field flex-1 !rounded-md !pl-3"
              autoFocus
            />
            <button
              onClick={() => {
                if (mobileSearchQuery.trim()) {
                  useAppStore.getState().setMobileSearchQuery(mobileSearchQuery);
                  useAppStore.getState().setActivePage('search');
                  setMobileSearchOpen(false);
                }
              }}
              className="btn-primary !py-2 !px-3 !text-caption shrink-0"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setMobileSearchOpen(false); setMobileSearchQuery(''); }}
              className="p-1.5 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-surface border-t border-border flex items-center justify-around px-2 py-1 z-40">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'search') {
                  setMobileSearchOpen(!mobileSearchOpen);
                  if (!mobileSearchOpen) setTimeout(() => mobileSearchRef.current?.focus(), 100);
                } else {
                  setMobileSearchOpen(false);
                  setMobileSearchQuery('');
                  useAppStore.getState().setActivePage(item.id);
                }
              }}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-md transition-all duration-120',
                isActive || (item.id === 'search' && mobileSearchOpen)
                  ? 'text-accent'
                  : 'text-text-tertiary'
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
              const { getOAuthLoginUrl } = await import('./services/cozeApi');
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
