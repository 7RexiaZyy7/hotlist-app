import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { PROXY_BASE } from '../services/cozeApi';
import { Flame, RefreshCw, TrendingUp, Clock, ExternalLink, Check, X, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { PlatformIcon } from '../components/PlatformIcon';

const platforms = [
  { id: 'douyin', label: '抖音' },
  { id: 'xiaohongshu', label: '小红书' },
  { id: 'zhihu', label: '知乎' },
  { id: 'bilibili', label: 'B站' },
  { id: 'maimai', label: '脉脉' },
];

const ANGLE_KEYWORDS: { pattern: string; angles: string[] }[] = [
  { pattern: '科技|AI|智能|数码|互联网|GPT|大模型', angles: ['知识科普', '未来趋势', '深度分析'] },
  { pattern: '娱乐|明星|综艺|电影|音乐|游戏|八卦', angles: ['趣味解读', '情感共鸣', '热点追踪'] },
  { pattern: '经济|创业|职场|就业|裁员|工资|副业|搞钱', angles: ['观点评论', '深度分析', '实用建议'] },
  { pattern: '健康|养生|健身|饮食|中医|运动', angles: ['知识科普', '实用建议', '情感共鸣'] },
  { pattern: '教育|学习|高考|考研|留学|育儿|亲子', angles: ['实用建议', '情感共鸣', '深度分析'] },
  { pattern: '情感|两性|恋爱|婚姻|家庭|社交', angles: ['情感共鸣', '观点评论', '提问互动'] },
  { pattern: '美食|探店|旅行|旅游|摄影|穿搭|美妆', angles: ['趣味解读', '实用建议', '故事叙述'] },
  { pattern: '政治|社会|民生|法律|政策|新闻', angles: ['深度分析', '观点评论', '热点追踪'] },
];

function recommendAngles(topic: string): string[] {
  for (const { pattern, angles } of ANGLE_KEYWORDS) {
    if (new RegExp(pattern).test(topic)) {
      return angles;
    }
  }
  return ['情感共鸣', '观点评论', '热点追踪'];
}

export function HotRadar() {
  const { hotList, setHotList, isLoadingHotList, setLoadingHotList, setSelectedTopic, setSelectedAngles, setActivePage, showToast, savedTopics, toggleSaveTopic } = useAppStore();
  const [selectedPlatform, setSelectedPlatform] = useState('douyin');
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem('hotRadar_guideShown'));
  const [showCount, setShowCount] = useState(20);

  const fetchHotList = useCallback(async (platform: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingHotList(true);
    setError(null);

    try {
      const r = await fetch(`${PROXY_BASE}?action=hotboard&type=${platform}`);
      const data = await r.json();
      const items = parseUapiHotList(data, platform);

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
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.items && data.items.length > 0) {
          setHotList(data.items);
          setSelectedPlatform(data.platform || 'douyin');
        }
        return;
      } catch {
        console.error('热榜缓存解析失败');
      }
    }
    fetchHotList('douyin');
  }, []);

  const handleRefresh = () => {
    if (isLoadingRef.current) return;
    fetchHotList(selectedPlatform);
  };

  const handlePlatformChange = (platformId: string) => {
    setShowCount(20);
    setSelectedPlatform(platformId);
    fetchHotList(platformId);
  };

  const handleToggleSave = (item: typeof hotList[0]) => {
    const isSaved = savedTopics.some((t) => t.title === item.title);
    toggleSaveTopic(item);
    if (!isSaved) {
      showToast('已收藏！可在「收藏池」查看并提交分析', 'success');
    }
  };

  const handleItemClick = (item: typeof hotList[0]) => {
    setSelectedTopic(item.title);
    const angles = recommendAngles(item.title);
    setSelectedAngles(angles);
    setActivePage('forge');
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1">热点雷达</h2>
        <p className="text-body-sm text-text-secondary">实时追踪全网热点，发现爆款选题</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide">
        {platforms.map((platform) => {
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
              <PlatformIcon platform={platform.id} />
              <span className="text-body-sm">{platform.label}</span>
            </button>
          );
        })}
      </div>

      {showGuide && (
        <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-between">
          <span className="text-body-sm text-text-secondary">勾选感兴趣的话题 → 收藏池 → 批量分析 → 生成文案</span>
          <button onClick={() => { setShowGuide(false); localStorage.setItem('hotRadar_guideShown', '1'); }} className="text-caption text-accent hover:text-accent-hover shrink-0">知道了</button>
        </div>
      )}

      {isLoadingHotList ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <LoadingState />
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
          description="当前平台暂无热榜数据，试试切换平台"
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
                  onClick={() => setShowPoolModal(true)}
                  className={clsx(
                    'btn-ghost !py-1.5 !px-3 !text-body-sm',
                    showPoolModal && 'bg-accent-subtle text-accent'
                  )}
                >
                  收藏池 ({savedTopics.length})
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoadingHotList}
                className="btn-ghost !py-1.5 !px-3 !text-body-sm"
              >
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
                  index >= 1 && 'bg-bg-elevated text-text-secondary'
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
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors shrink-0"
                        title="查看原文"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="text-caption">查看</span>
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-caption text-text-tertiary mt-0.5">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-accent" />
                      {item.heatScore > 0 ? `${item.heatScore}` : '-'}
                    </span>
                    <PlatformIcon platform={item.platform} className="!w-3.5 !h-3.5" />
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
                    handleToggleSave(item);
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

      {showPoolModal && savedTopics.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl p-4 z-50 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-body font-semibold text-text-primary">收藏池 ({savedTopics.length})</h3>
            <button onClick={() => setShowPoolModal(false)} className="p-1 rounded hover:bg-bg-elevated">
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
            onClick={() => {
              if (savedTopics.length === 0) return;
              showToast(`已选择 ${savedTopics.length} 个话题，即将开始分析`, 'info');
              setActivePage('explore');
            }}
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
