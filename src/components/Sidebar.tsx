import { useAppStore } from '../store';
import { Flame, Search, Sparkles, Globe, UserCircle2, Box } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { id: 'radar', label: '热点雷达', icon: Flame },
  { id: 'search', label: '内容搜索', icon: Globe },
  { id: 'explore', label: '话题勘探', icon: Search },
  { id: 'forge', label: '文案创作', icon: Sparkles },
  { id: 'assets', label: '素材库', icon: Box },
  { id: 'profile', label: '创作者档案', icon: UserCircle2 },
];

export function Sidebar() {
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);

  return (
    <aside className="w-60 h-full bg-bg-surface border-r border-border flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-text-primary leading-tight">热点工坊</h1>
            <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-caption text-text-tertiary font-mono leading-tight">v0.1</span>
          </div>
          <p className="text-caption text-text-tertiary">爆款文案生成器</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-120',
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-border shrink-0">
        <p className="text-caption text-text-tertiary">Powered by Coze</p>
      </div>
    </aside>
  );
}