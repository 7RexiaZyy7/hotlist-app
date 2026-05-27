import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { callCozeChat, buildHotListQuery } from '../services/cozeApi';
import { Flame, RefreshCw, TrendingUp, Clock, ExternalLink, Hash, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';

const platforms = [
  { id: 'all', label: '综合', icon: Flame },
  { id: 'weibo', label: '微博', icon: Hash },
  { id: 'douyin', label: '抖音', icon: MessageSquare },
  { id: 'zhihu', label: '知乎', icon: Hash },
  { id: 'bilibili', label: 'B站', icon: MessageSquare },
  { id: 'juejin', label: '掘金', icon: Hash },
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

  const handleItemClick = (item: typeof hotList[0]) => {
    setSelectedTopic(item.title);
    const angles = recommendAngles(item.title);
    setSelectedAngles(angles);
    setActivePage('forge');
  };

  const recommendAngles = (topic: string): string[] => {
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
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1">热榜驾驶舱</h2>
        <p className="text-body-sm text-text-secondary">实时追踪全网热点，发现爆款选题</p>
      </div>

      {/* Platform tabs - flat style */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide">
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
                'tab whitespace-nowrap',
                selectedPlatform === platform.id && 'active'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-body-sm">{platform.label}</span>
            </button>
          );
        })}
      </div>

      {isLoadingHotList ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon={<RefreshCw className="w-8 h-8" />}
          title="获取热榜失败"
          description={error}
          action={{ label: '重新加载', onClick: handleRefresh }}
        />
      ) : hotList.length === 0 ? (
        <EmptyState
          icon={<Flame className="w-8 h-8" />}
          title="暂无热榜数据"
          description="当前没有可用的热榜数据，请点击下方按钮刷新"
          action={{ label: '刷新热榜', onClick: handleRefresh }}
        />
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-body-sm text-text-secondary">实时热点</span>
            </div>
            <button
              onClick={handleRefresh}
              className="btn-ghost !py-1.5 !px-3 !text-body-sm"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLoadingHotList && 'animate-spin')} />
              刷新
            </button>
          </div>

          {/* Hot items */}
          <div className="grid gap-3">
            {hotList.slice(0, 15).map((item, index) => (
              <div
                key={index}
                onClick={() => handleItemClick(item)}
                className="interactive-row flex items-start gap-3"
              >
                {/* Rank */}
                <div className={clsx(
                  'w-7 h-7 rounded-md flex items-center justify-center text-body-sm font-bold shrink-0 mt-0.5',
                  index === 0 && 'bg-accent text-white',
                  index === 1 && 'bg-bg-elevated text-text-secondary',
                  index === 2 && 'bg-bg-elevated text-text-secondary',
                  index > 2 && 'bg-bg-elevated text-text-tertiary'
                )}>
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-body font-medium text-text-primary truncate">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 text-caption text-text-tertiary mt-0.5">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-accent" />
                      {item.heatScore > 0 ? `${item.heatScore}` : '-'}
                    </span>
                    {item.platform && <span>{item.platform}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      刚刚
                    </span>
                  </div>

                  {/* Angle tags for top 3 */}
                  {index < 3 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {recommendAngles(item.title).slice(0, 3).map((angle, i) => (
                        <span key={i} className="badge">{angle}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseHotList(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const items: { rank: number; title: string; platform: string; heatScore: number; url?: string }[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*([^\s]+)\s+(.*?)(?:\s*\|.*)?$/);
    if (match) {
      items.push({
        rank: parseInt(match[1]),
        title: match[3] || match[2],
        platform: '',
        heatScore: parseInt(match[2]) || 0,
      });
    } else {
      const simpleMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (simpleMatch) {
        items.push({
          rank: parseInt(simpleMatch[1]),
          title: simpleMatch[2],
          platform: '',
          heatScore: 0,
        });
      }
    }
  }
  
  return items;
}