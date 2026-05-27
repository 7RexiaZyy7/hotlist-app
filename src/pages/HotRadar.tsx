import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { callCozeChat, buildHotListQuery } from '../services/cozeApi';
import { Flame, RefreshCw, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import LoadingState from '../components/LoadingState';
import Empty from '../components/Empty';

interface HotItem {
  rank: number;
  title: string;
  heat: string;
  url?: string;
  platform?: string;
}

const platforms = [
  { id: 'all', label: '综合', icon: Flame },
  { id: 'weibo', label: '微博', icon: Flame },
  { id: 'douyin', label: '抖音', icon: Flame },
  { id: 'zhihu', label: '知乎', icon: Flame },
  { id: 'bilibili', label: 'B站', icon: Flame },
  { id: 'juejin', label: '掘金', icon: Flame },
];

export function HotRadar() {
  const { hotList, setHotList, isLoadingHotList, setLoadingHotList, setSelectedTopic, setSelectedAngles, setActivePage } = useAppStore();
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchHotList = useCallback(async () => {
    if (isLoadingHotList) return;
    setLoadingHotList(true);
    setError(null);
    try {
      const query = buildHotListQuery(selectedPlatform);
      const result = await callCozeChat(query);
      const items = parseHotList(result);
      setHotList(items);
      localStorage.setItem('hotList', JSON.stringify({ items, platform: selectedPlatform, timestamp: Date.now() }));
    } catch (e) {
      console.error('fetchHotList error:', e);
      setError('获取热榜失败，请稍后重试');
      const cached = localStorage.getItem('hotList');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 3600000) {
            setHotList(data.items);
          }
        } catch {}
      }
    } finally {
      setLoadingHotList(false);
    }
  }, [isLoadingHotList, selectedPlatform, setHotList, setLoadingHotList]);

  useEffect(() => {
    const cached = localStorage.getItem('hotList');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 3600000) {
          setHotList(data.items);
          setSelectedPlatform(data.platform);
        }
      } catch {}
    }
    fetchHotList();
  }, []);

  const handleRefresh = () => {
    fetchHotList();
  };

  const handleItemClick = (item: HotItem) => {
    setSelectedTopic(item.title);
    const angles = recommendAngles(item.title);
    setSelectedAngles(angles);
    setActivePage('forge');
  };

  const recommendAngles = (topic: string): string[] => {
    const keywords = ['科技', 'AI', '人工智能', '创业', '互联网', '经济', '政策', '教育', '健康', '娱乐', '明星', '体育'];
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('科技') || topicLower.includes('ai') || topicLower.includes('智能')) {
      return ['知识科普', '未来趋势', '深度分析'];
    }
    if (topicLower.includes('娱乐') || topicLower.includes('明星') || topicLower.includes('综艺')) {
      return ['趣味解读', '情感共鸣', '热点追踪'];
    }
    if (topicLower.includes('经济') || topicLower.includes('创业') || topicLower.includes('职场')) {
      return ['观点评论', '深度分析', '实用建议'];
    }
    return ['情感共鸣', '观点评论', '热点追踪'];
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold gradient-text mb-2">热榜驾驶舱</h2>
        <p className="text-text-secondary text-sm">实时追踪全网热点，发现爆款选题</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.id}
              onClick={() => {
                setSelectedPlatform(platform.id);
                fetchHotList();
              }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300',
                selectedPlatform === platform.id
                  ? 'glow-button'
                  : 'glass-card text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{platform.label}</span>
            </button>
          );
        })}
      </div>

      {isLoadingHotList ? (
        <LoadingState message="正在扫描全网热榜..." />
      ) : error ? (
        <Empty message={error} actionText="重新加载" onAction={handleRefresh} />
      ) : hotList.length === 0 ? (
        <Empty message="暂无热榜数据" actionText="刷新热榜" onAction={handleRefresh} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-sm text-text-secondary">实时热点</span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <RefreshCw className={clsx('w-4 h-4', isLoadingHotList && 'animate-spin')} />
              <span className="text-sm text-text-secondary">刷新</span>
            </button>
          </div>

          <div className="grid gap-4">
            {hotList.slice(0, 15).map((item: HotItem, index) => (
              <div
                key={index}
                onClick={() => handleItemClick(item)}
                className={clsx(
                  'hot-item glass-card p-4 cursor-pointer transition-all duration-300',
                  index < 3 && 'ring-1 ring-primary/30'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
                    index === 0 && 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
                    index === 1 && 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700',
                    index === 2 && 'bg-gradient-to-br from-amber-600 to-amber-700 text-white',
                    index > 2 && 'bg-white/5 text-text-secondary'
                  )}>
                    {index === 0 ? '👑' : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate mb-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-accent" />
                        {item.heat}
                      </span>
                      {item.platform && (
                        <span>{item.platform}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        刚刚
                      </span>
                    </div>
                  </div>

                  <ExternalLink className="w-4 h-4 text-text-muted shrink-0" />
                </div>

                {index < 3 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {recommendAngles(item.title).slice(0, 3).map((angle, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                      >
                        {angle}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseHotList(text: string): HotItem[] {
  const items: HotItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*([^\s]+)\s+(.*?)(?:\s*\|.*)?$/);
    if (match) {
      items.push({
        rank: parseInt(match[1]),
        title: match[3] || match[2],
        heat: match[2],
      });
    } else {
      const simpleMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (simpleMatch) {
        items.push({
          rank: parseInt(simpleMatch[1]),
          title: simpleMatch[2],
          heat: '-',
        });
      }
    }
  }
  
  return items;
}