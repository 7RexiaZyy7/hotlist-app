import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HotRadar } from './pages/HotRadar';
import { TopicExplorer } from './pages/TopicExplorer';
import { ContentForge } from './pages/ContentForge';
import { CreatorProfile } from './pages/CreatorProfile';
import { HitAnalyzer } from './pages/HitAnalyzer';
import { AuthCallback } from './pages/AuthCallback';
import { useAppStore } from './store';
import { getOAuthStatus, setUserId } from './services/cozeApi';
import { Check, AlertCircle, Info, Loader2, AlertTriangle } from 'lucide-react';

function Toast() {
  const { toast } = useAppStore();
  if (!toast) return null;

  const iconMap: Record<string, JSX.Element> = {
    success: <Check className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-accent" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  };

  const borderMap: Record<string, string> = {
    success: 'border-success/30',
    error: 'border-red-400/30',
    info: 'border-accent/30',
    warning: 'border-yellow-400/30',
  };

  return (
    <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-2 transition-all duration-300">
      <div className={`bg-surface border ${borderMap[toast.type]} rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3`}>
        {iconMap[toast.type]}
        <span className="text-sm text-gray-200">{toast.message}</span>
      </div>
    </div>
  );
}

function App() {
  const { activePage, isLoggedIn, isLoadingAuth, setAuth, clearAuth, setLoadingAuth } = useAppStore();

  // Check login status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await getOAuthStatus();
        if (status.loggedIn && status.access_token && status.uid) {
          setAuth(status.uid, status.access_token);
          setUserId(status.uid);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    })();
  }, [setAuth, clearAuth, setLoadingAuth]);

  // Handle OAuth callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Loading state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'radar':
        return <HotRadar />;
      case 'explore':
        return <TopicExplorer />;
      case 'forge':
        return <ContentForge />;
      case 'profile':
        return <CreatorProfile />;
      case 'analyze':
        return <HitAnalyzer />;
      default:
        return <HotRadar />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default App;
