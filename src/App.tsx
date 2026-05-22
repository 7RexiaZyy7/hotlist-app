import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HotRadar } from './pages/HotRadar';
import { TopicExplorer } from './pages/TopicExplorer';
import { ContentForge } from './pages/ContentForge';
import { CreatorProfile } from './pages/CreatorProfile';
import { HitAnalyzer } from './pages/HitAnalyzer';
import { useAppStore } from './store';
import { Check, AlertCircle, Info } from 'lucide-react';

function Toast() {
  const { toast } = useAppStore();
  if (!toast) return null;

  const iconMap = {
    success: <Check className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-accent" />,
  };

  const borderMap = {
    success: 'border-success/30',
    error: 'border-red-400/30',
    info: 'border-accent/30',
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
  const { activePage } = useAppStore();

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
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default App;
