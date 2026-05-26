import { useState } from 'react';
import { useAppStore } from '../store';
import {
  Flame,
  Search,
  Sparkles,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { id: 'radar', label: '热榜驾驶舱', icon: Flame },
  { id: 'explore', label: '话题勘探', icon: Search },
  { id: 'forge', label: '文案工坊', icon: Sparkles },
  { id: 'profile', label: '创作档案', icon: User },
  { id: 'analyze', label: '爆款拆解', icon: Scissors },
];

export function Sidebar() {
  const { activePage, setActivePage } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={clsx(
        'bg-surface border-r border-gray-800 flex flex-col transition-all duration-300 shrink-0',
        expanded ? 'w-48' : 'w-16'
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-white" />
        </div>
        {expanded && (
          <span className="text-sm font-semibold text-gray-300 ml-2 truncate">内容引力</span>
        )}
      </div>

      <nav className="flex flex-col gap-1 px-2 py-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'relative flex items-center gap-3 rounded-xl transition-all duration-200',
                expanded ? 'px-3 py-2.5' : 'w-12 h-12 justify-center mx-auto',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-card'
              )}
            >
              {isActive && !expanded && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1 h-6 bg-accent rounded-r-full" />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && (
                <span className={clsx('text-sm truncate', isActive ? 'font-medium' : '')}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-card transition-colors',
            expanded ? 'w-full py-2' : 'w-12 h-10 mx-auto'
          )}
        >
          {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
