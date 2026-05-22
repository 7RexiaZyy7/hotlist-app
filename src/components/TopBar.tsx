import { useState } from 'react';
import { useAppStore } from '../store';
import { Settings, Zap, Scissors } from 'lucide-react';
import { clsx } from 'clsx';

export function TopBar() {
  const { 
    isConnected, 
    setConnected,
    creationStats,
    activePage 
  } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  const pageLabels: Record<string, string> = {
    radar: '热榜驾驶舱',
    explore: '话题勘探',
    forge: '文案工坊',
    profile: '创作档案',
    analyze: '爆款拆解',
  };

  return (
    <>
      <header className="h-16 bg-surface border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-semibold">
            {pageLabels[activePage] || '内容引力引擎'}
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm text-gray-400">今日文案</span>
              <span className="font-mono text-lg font-semibold text-accent">
                {creationStats.todayCopies}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-accent-alt" />
              <span className="text-sm text-gray-400">拆解数</span>
              <span className="font-mono text-lg font-semibold text-accent-alt">
                {creationStats.todayAnalysis}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                isConnected ? 'bg-success' : 'bg-warning'
              )}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? '已连接' : '未连接'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-card rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 w-96 border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">连接状态</h2>
            <p className="text-sm text-gray-400 mb-4">
              {isConnected 
                ? 'API 代理已连接，Token 由服务端管理'
                : '请在 Vercel 环境变量中配置 COZE_PAT_TOKEN'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConnected(false);
                  setShowSettings(false);
                }}
                className="flex-1 px-4 py-2 bg-surface border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                断开
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-accent to-orange-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
