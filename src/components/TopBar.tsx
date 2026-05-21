import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Settings, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const STORAGE_KEY = 'coze_config';

export function TopBar() {
  const { 
    isConnected, 
    cozeConfig, 
    setCozeConfig, 
    setConnected,
    creationStats,
    activePage 
  } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [botId, setBotId] = useState(cozeConfig?.botId || '');
  const [token, setToken] = useState(cozeConfig?.token || '');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setCozeConfig({
          botId: config.botId,
          token: config.token,
          baseUrl: config.baseUrl || 'https://api.coze.cn',
        });
        setConnected(true);
        setBotId(config.botId);
        setToken(config.token);
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
  }, [setCozeConfig, setConnected]);

  const handleSaveConfig = () => {
    const config = {
      botId,
      token,
      baseUrl: 'https://api.coze.cn',
    };
    setCozeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setConnected(true);
    setShowSettings(false);
  };

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
          {/* 创作能量仪表盘 */}
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

          {/* 连接状态 */}
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

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 w-96 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">COZE 配置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bot ID</label>
                <input
                  type="text"
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  className="w-full bg-card border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
                  placeholder="输入你的 Bot ID"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Token (PAT)</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-card border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
                  placeholder="输入你的 Token"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-card border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-accent to-orange-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Scissors } from 'lucide-react';
