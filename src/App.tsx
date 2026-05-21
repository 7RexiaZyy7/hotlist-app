import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HotRadar } from './pages/HotRadar';
import { TopicExplorer } from './pages/TopicExplorer';
import { ContentForge } from './pages/ContentForge';
import { CreatorProfile } from './pages/CreatorProfile';
import { HitAnalyzer } from './pages/HitAnalyzer';
import { useAppStore } from './store';

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
    </div>
  );
}

export default App;
