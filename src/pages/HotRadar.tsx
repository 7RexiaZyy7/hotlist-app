import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { PROXY_BASE } from '../services/cozeApi';
import { Flame, RefreshCw, TrendingUp, Clock, ExternalLink, Hash, MessageSquare, Check, X, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';

const platforms = [
  { id: 'douyin', label: '抖音', icon: MessageSquare },
  { id: 'xiaohongshu', label: '小红书', icon: Hash },
  { id: 'zhihu', label: '知乎', icon: Hash },
  { id: 'bilibili', label: 'B站', icon: MessageSquare },
  { id: 'maimai', label: '脉脉', icon: Hash },
];

export function HotRadar() {
  const { hotList, setHotList, isLoadingHotList, setLoadingHotList, setSelectedTopic, setSelectedAngles, setActivePage, showToast, savedTopics, toggleSaveTopic } = useAppStore();
  const [selectedPlatform, setSelectedPlatform] = useState('douyin');
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 15;
  const [showCount, setShowCount] = useState(20);

  const fetchHotList = useCallback(async (platform: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingHotList(true);
    setError(null);

    try {
      let items;
      
      // 热榜调用代理API
      console.log('fetchHotList: 单平台热榜, platform=%s', platform);
      const r = await fetch(`${PROXY_BASE}?action=hotboard&type=${platform}`);
      console.log('fetchHotList: proxy response status=%d', r.status);
      const data = await r.json();
      console.log('fetchHotList: proxy data source=%s:', data.source || 'unknown', JSON.stringify(data).slice(0, 500));
      items = parseUapiHotList(data, platform);
      console.log('fetchHotList: 解析后 items=%d', items.length);

      if (items.length === 0) {
        setError('热榜数据格式异常，请稍后重试');
      } else {
        setHotList(items);
        localStorage.setItem('hotList', JSON.stringify({ items, platform, timestamp: Date.now() }));
      }
    } catch (e: any) {
      console.error('fetchHotList error:', e);
      setError(e?.message || '获取热榜失败，请稍后重试');
      const cached = localStorage.getItem('hotList');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setHotList(data.items);
          showToast('网络异常，已加载缓存数据', 'warning');
          setError(null);
        } catch {}
      }
    } finally {
      isLoadingRef.current = false;
      setLoadingHotList(false);
    }
  }, [setHotList, setLoadingHotList, showToast]);

  useEffect(() => {
    const cached = localStorage.getItem('hotList');
    console.log('HotRadar init - cached exists:', !!cached);
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        console.log('HotRadar init - cached data:', data);
        
        if (data.items && data.items.length > 0) {
          console.log('HotRadar init - 使用缓存数据');
          setHotList(data.items);
          setSelectedPlatform(data.platform || 'douyin');
        } else {
          console.log('HotRadar init - 缓存存在但数据为空，不自动刷新');
        }
        // 只要有缓存记录（无论内容是否有效），都不自动调用 API
        return;
      } catch (e) {
        console.error('HotRadar init - 解析缓存失败:', e);
      }
    }
    
    console.log('HotRadar init - 无缓存，调用 API 获取热榜');
    fetchHotList('douyin');
  }, [fetchHotList]);

  const handleAnalyzePool = () => {
    if (savedTopics.length === 0) return;
    showToast(`已选择 ${savedTopics.length} 个话题，即将开始分析`, 'info');
    // 暂时跳转到话题勘探页，传入收藏的话题
    setActivePage('explore');
  };

  const handleRefresh = () => {
    fetchHotList(selectedPlatform);
  };

  const handlePlatformChange = (platformId: string) => {
    setShowCount(20);
    setSelectedPlatform(platformId);
    fetchHotList(platformId);
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

      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isActive = selectedPlatform === platform.id;
          return (
            <button
              key={platform.id}
              onClick={() => handlePlatformChange(platform.id)}
              disabled={isLoadingHotList}
              className={clsx(
                'tab whitespace-nowrap',
                isActive && 'active',
                isLoadingHotList && 'opacity-60 cursor-not-allowed'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-body-sm">{platform.label}</span>
            </button>
          );
        })}
      </div>

      {isLoadingHotList ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <LoadingState />
          <button
            onClick={handleRefresh}
            className="mt-6 btn-ghost !py-1.5 !px-4 !text-body-sm text-text-tertiary hover:text-text-primary"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            请求中，点击重新获取
          </button>
        </div>
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
          description="当前没有可用的热榜数据"
          action={{ label: '刷新热榜', onClick: handleRefresh }}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-body-sm text-text-secondary">实时热点 · {hotList.length}条</span>
            </div>
            <div className="flex items-center gap-2">
              {savedTopics.length > 0 && (
                <button
                  onClick={() => setShowPool(!showPool)}
                  className={clsx(
                    'btn-ghost !py-1.5 !px-3 !text-body-sm',
                    showPool && 'bg-accent-subtle text-accent'
                  )}
                >
                  收藏池 ({savedTopics.length})
                </button>
              )}
              <button onClick={handleRefresh} className="btn-ghost !py-1.5 !px-3 !text-body-sm">
                <RefreshCw className={clsx('w-3.5 h-3.5', isLoadingHotList && 'animate-spin')} />
                刷新
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {hotList.slice(0, showCount).map((item, index) => {
              const isSaved = savedTopics.some((t) => t.title === item.title);
              return (
              <div
                key={index}
                className="interactive-row flex items-start gap-3"
              >
                <div className={clsx(
                  'w-7 h-7 rounded-md flex items-center justify-center text-body-sm font-bold shrink-0 mt-0.5',
                  index === 0 && 'bg-accent text-white',
                  index === 1 && 'bg-bg-elevated text-text-secondary',
                  index === 2 && 'bg-bg-elevated text-text-secondary',
                  index > 2 && 'bg-bg-elevated text-text-tertiary'
                )}>
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleItemClick(item)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-body font-medium text-text-primary truncate">
                      {item.title}
                    </h3>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors shrink-0"
                        title="跳转到原平台查看详情"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="text-caption">查看</span>
                      </a>
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5" />
                    )}
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

                  {index < 3 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {recommendAngles(item.title).slice(0, 3).map((angle, i) => (
                        <span key={i} className="badge">{angle}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaveTopic(item);
                  }}
                  className={clsx(
                    'shrink-0 mt-1 w-7 h-7 rounded-md flex items-center justify-center transition-all duration-120',
                    isSaved
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-tertiary hover:text-accent hover:bg-accent/10'
                  )}
                  title={isSaved ? '取消收藏' : '收藏话题'}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              );
            })}
          </div>
          {hotList.length > showCount && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowCount((c) => c + 20)}
                className="btn-ghost !py-2 !px-6 !text-body-sm"
              >
                加载更多 ({hotList.length - showCount}条)
              </button>
            </div>
          )}
        </div>
      )}

      {showPool && savedTopics.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl p-4 z-50 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-body font-semibold text-text-primary">收藏话题池 ({savedTopics.length})</h3>
            <button onClick={() => setShowPool(false)} className="p-1 rounded hover:bg-bg-elevated">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {savedTopics.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated">
                <span className="text-body-sm text-text-primary flex-1 truncate">{item.title}</span>
                <span className="text-caption text-text-tertiary">{item.platform}</span>
                <button
                  onClick={() => toggleSaveTopic(item)}
                  className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAnalyzePool}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            提交分析 ({savedTopics.length})
          </button>
        </div>
      )}
    </div>
  );
}

function parseUapiHotList(data: any, platform: string) {
  const items: { rank: number; title: string; platform: string; heatScore: number; url?: string }[] = [];
  
  if (!data) return items;
  
  const list = data.list || data.data?.list || data.data || [];
  
  if (!Array.isArray(list)) return items;
  
  list.forEach((item: any, index: number) => {
    items.push({
      rank: parseInt(item.index) || index + 1,
      title: item.title || item.name || '',
      platform: platform,
      heatScore: parseInt(item.hot_value || item.hot || item.heat || item.count || 0) || 0,
      url: item.url || undefined,
    });
  });
  
  return items;
}