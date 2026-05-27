import { useAppStore } from '../store';
import { Flame, Search, Sparkles, User, Scissors, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export function Sidebar() {
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const quota = useAppStore((s) => s.quota);
  const setShowQuotaModal = useAppStore((s) => s.setShowQuotaModal);

  const navItems = [
    { id: 'radar', label: '热榜', icon: Flame },
    { id: 'explore', label: '勘探', icon: Search },
    { id: 'forge', label: '文案', icon: Sparkles },
    { id: 'analyze', label: '拆解', icon: Scissors },
    { id: 'profile', label: '档案', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:bottom-0 md:w-20 z-20 md:z-10">
      <div className="md:glass-card mx-4 md:mx-0 md:mt-4 rounded-t-2xl md:rounded-l-2xl md:rounded-r-none p-2 md:p-4 flex md:flex-col items-center justify-around md:justify-start gap-2 md:gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'relative flex flex-col md:flex-col items-center gap-1 md:gap-1 p-2 md:p-3 rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-gradient-to-br from-primary/30 to-secondary/30 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {isActive && (
                <span className="absolute -top-1 -right-1 md:top-2 md:-right-2 w-2 h-2 rounded-full bg-primary pulse-glow" />
              )}
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}

        <div className="hidden md:block mt-auto">
          <button
            onClick={() => setShowQuotaModal(true)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 w-full"
          >
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-xs text-text-muted">
              {quota ? `${quota.used}/${quota.limit}` : '--'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}