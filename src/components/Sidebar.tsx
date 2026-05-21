import { useAppStore } from '../store';
import { 
  Flame, 
  Search, 
  Sparkles, 
  User, 
  Scissors 
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

  return (
    <aside className="w-16 bg-surface border-r border-gray-800 flex flex-col items-center py-6 gap-6">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center">
        <Flame className="w-6 h-6 text-white" />
      </div>
      
      <nav className="flex flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-card'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-accent rounded-r-full" />
              )}
              
              <span className="absolute left-16 bg-card text-white px-3 py-1.5 rounded text-sm rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 text-sm rounded-md">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
