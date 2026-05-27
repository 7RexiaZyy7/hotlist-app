import { useState } from 'react';
import { useAppStore } from '../store';
import { Flame, Palette, Sparkles, Moon, Sun, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface Theme {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceCard: string;
  textPrimary: string;
  textSecondary: string;
  gradient: string;
  icon: React.ReactNode;
}

const themes: Theme[] = [
  {
    id: 'cyber-dark',
    name: '赛博深色',
    description: '深邃的科技感，适合夜间使用',
    primary: '#a855f7',
    secondary: '#06b6d4',
    accent: '#f97316',
    surface: '#0f0f10',
    surfaceCard: '#19191a',
    textPrimary: '#f0f0f0',
    textSecondary: '#9b9b9b',
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
    icon: <Moon className="w-5 h-5" />
  },
  {
    id: 'light-clean',
    name: '清新浅色',
    description: '明亮清爽，适合白天使用',
    primary: '#6366f1',
    secondary: '#0ea5e9',
    accent: '#f59e0b',
    surface: '#f8fafc',
    surfaceCard: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    gradient: 'from-blue-50 via-indigo-50 to-purple-50',
    icon: <Sun className="w-5 h-5" />
  },
  {
    id: 'neon-cyber',
    name: '霓虹朋克',
    description: '炫酷的霓虹效果，个性十足',
    primary: '#ff00ff',
    secondary: '#00ffff',
    accent: '#ffff00',
    surface: '#0a0a0f',
    surfaceCard: '#1a1a2e',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b0',
    gradient: 'from-purple-950 via-pink-950 to-cyan-950',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'minimal-light',
    name: '极简纯白',
    description: '极简主义，干净利落',
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#ef4444',
    surface: '#ffffff',
    surfaceCard: '#fafafa',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    gradient: 'from-white via-gray-50 to-white',
    icon: <Palette className="w-5 h-5" />
  },
  {
    id: 'warm-cozy',
    name: '温暖橙调',
    description: '温馨舒适的暖色调',
    primary: '#f97316',
    secondary: '#ec4899',
    accent: '#84cc16',
    surface: '#1c1917',
    surfaceCard: '#292524',
    textPrimary: '#fef3c7',
    textSecondary: '#d6d3d1',
    gradient: 'from-orange-950 via-amber-950 to-yellow-950',
    icon: <Flame className="w-5 h-5" />
  },
  {
    id: 'forest-green',
    name: '森林绿意',
    description: '自然清新的绿色主题',
    primary: '#22c55e',
    secondary: '#14b8a6',
    accent: '#f59e0b',
    surface: '#0f172a',
    surfaceCard: '#1e293b',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    gradient: 'from-green-900 via-emerald-900 to-teal-900',
    icon: <Sparkles className="w-5 h-5" />
  },
];

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('selectedTheme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return themes[0];
  });
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const showToast = useAppStore((s) => s.showToast);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg-base', theme.surface);
    root.style.setProperty('--color-bg-surface', theme.surfaceCard);
    root.style.setProperty('--color-text-primary', theme.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.textSecondary);
    root.style.setProperty('--color-accent', theme.primary);
    localStorage.setItem('selectedTheme', JSON.stringify(theme));
    showToast(`已应用「${theme.name}」风格，刷新页面完全生效`, 'success');
  };

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-2">设计风格选择器</h2>
        <p className="text-body-sm text-text-secondary">
          选择你喜欢的界面风格，实时预览效果
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {themes.map((theme) => (
          <div
            key={theme.id}
            onClick={() => setSelectedTheme(theme)}
            onMouseEnter={() => setHoveredTheme(theme.id)}
            onMouseLeave={() => setHoveredTheme(null)}
            className={clsx(
              'relative overflow-hidden rounded-xl p-5 cursor-pointer transition-all duration-200',
              hoveredTheme === theme.id && 'transform scale-[1.02]'
            )}
            style={{
              background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.surfaceCard} 100%)`,
              border: selectedTheme.id === theme.id ? `2px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
              style={{ background: theme.primary }}
            />

            <div className="relative z-10">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform duration-200"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                  transform: hoveredTheme === theme.id ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                <span style={{ color: '#ffffff' }}>{theme.icon}</span>
              </div>

              <h3 className="text-base font-semibold mb-1" style={{ color: theme.textPrimary }}>
                {theme.name}
              </h3>

              <p className="text-sm" style={{ color: theme.textSecondary }}>
                {theme.description}
              </p>

              <div className="flex gap-2 mt-3">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.primary }} />
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.secondary }} />
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.accent }} />
              </div>

              {selectedTheme.id === theme.id && (
                <div className="absolute top-2 right-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                      color: '#ffffff'
                    }}
                  >
                    ✓
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: `linear-gradient(135deg, ${selectedTheme.surface} 0%, ${selectedTheme.surfaceCard} 100%)`,
          border: `1px solid ${selectedTheme.primary}20`
        }}
      >
        <h3 className="text-base font-semibold" style={{ color: selectedTheme.textPrimary }}>
          实时预览
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <button
            className="p-3 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.secondary} 100%)`,
              color: '#ffffff'
            }}
          >
            主要按钮
          </button>
          <button
            className="p-3 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: selectedTheme.surface,
              border: `1px solid ${selectedTheme.primary}40`,
              color: selectedTheme.textPrimary
            }}
          >
            次要按钮
          </button>
          <button
            className="p-3 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: `${selectedTheme.accent}20`,
              color: selectedTheme.accent
            }}
          >
            强调按钮
          </button>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg transition-all duration-200 hover:translate-x-1"
              style={{
                background: selectedTheme.surface,
                border: `1px solid ${selectedTheme.primary}10`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${selectedTheme.primary}30 0%, ${selectedTheme.secondary}30 100%)`
                  }}
                >
                  <span style={{ color: selectedTheme.primary }}>
                    {i === 1 ? '🔥' : i === 2 ? '💡' : '✨'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: selectedTheme.textPrimary }}>
                    示例内容 {i}
                  </p>
                  <p className="text-xs" style={{ color: selectedTheme.textSecondary }}>
                    描述文字
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => applyTheme(selectedTheme)}
          className="w-full py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-[1.01]"
          style={{
            background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.secondary} 100%)`,
            color: '#ffffff'
          }}
        >
          应用此风格
        </button>
      </div>
    </div>
  );
}