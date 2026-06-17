import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { PROXY_BASE } from '../services/cozeApi';
import {
  Flame,
  RefreshCw,
  TrendingUp,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  X,
  Send,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { PlatformIcon } from '../components/PlatformIcon';
import { AnalysisRenderer } from '../components/AnalysisRenderer';
import { callCozeChat, buildTopicAnalysisQuery } from '../services/cozeApi';

const platforms = [
  { id: 'douyin', label: '抖音' },
  { id: 'xiaohongshu', label: '小红书' },
  { id: 'zhihu', label: '知乎' },
  { id: 'bilibili', label: 'B站' },
  { id: 'maimai', label: '脉脉' },
];

const NICHES: { pattern: string; label: string; color: string }[] = [
  { pattern: 'AI|GPT|大模型|人工智能|算法|科技|数码|互联网|编程|代码|芯片|机器人|智能|自动驾驶|VR|AR|元宇宙|区块链', label: 'AI科技', color: '#06b6d4' },
  { pattern: '职场|创业|裁员|工资|副业|面试|简历|升职|管理|运营|打工|就业|涨薪|跳槽|裸辞|加班|内卷|摆烂|KPI|OKR', label: '职场成长', color: '#f59e0b' },
  { pattern: '情感|恋爱|婚姻|两性|家庭|相亲|分手|出轨|社交|关系|催婚|丁克|离婚|彩礼|婆媳', label: '情感关系', color: '#ec4899' },
  { pattern: '教育|高考|考研|留学|学习|读书|英语|考试|大学|育儿|亲子|中考|高考|上岸|学历|985|211|课|老师', label: '教育学习', color: '#10b981' },
  { pattern: '健康|养生|健身|减肥|饮食|中医|运动|瑜伽|跑步|睡眠|焦虑|体检|医美|整容|抗衰|早睡|失眠|抑郁|心理', label: '健康生活', color: '#22c55e' },
  { pattern: '美食|探店|烹饪|菜谱|烘焙|咖啡|茶|零食|好吃|早餐|晚餐|火锅|奶茶|蛋糕|外卖|吃货', label: '美食探店', color: '#f97316' },
  { pattern: '旅行|旅游|摄影|户外|露营|自驾|酒店|风景|攻略|打卡|拍照|景点|周末|度假|出国|签证', label: '旅行户外', color: '#8b5cf6' },
  { pattern: '娱乐|明星|综艺|电影|音乐|游戏|八卦|网红|主播|短视频|电视剧|选秀|演唱会|偶像|粉丝|热搜|吃瓜', label: '娱乐八卦', color: '#ef4444' },
  { pattern: '经济|投资|理财|股票|基金|买房|楼市|消费|省钱|搞钱|攒钱|存钱|房贷|利率|GDP|通胀|物价|比特币', label: '财经投资', color: '#14b8a6' },
  { pattern: '时尚|穿搭|美妆|护肤|发型|奢侈品|变美|OOTD|口红|眼影|精华|面霜|防晒|显瘦', label: '时尚美妆', color: '#d946ef' },
  { pattern: '法律|政治|政策|民生|社会|新闻|热点|时事|特朗普|美国|中国|日本|战争|冲突|外交|改革|罚款|维权', label: '社会时事', color: '#6b7280' },
  { pattern: '宠物|猫|狗|动物|萌宠|猫咪|狗狗|宠物', label: '萌宠生活', color: '#f472b6' },
  { pattern: '游戏|电竞|LOL|王者|原神|主机|Steam|switch|PS5|Xbox|手游|PC|DLC|皮肤|副本|职业赛', label: '游戏电竞', color: '#e5a93c' },
];

function detectNiche(topic: string): { label: string; color: string } {
  for (const n of NICHES) {
    if (new RegExp(n.pattern, 'i').test(topic)) return { label: n.label, color: n.color };
  }
  return { label: '综合', color: '#78716c' };
}

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

function formatHeat(score: number): string {
  if (score >= 10000) return `${(score / 10000).toFixed(1)}万`;
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

interface HotItem {
  rank: number;
  title: string;
  platform: string;
  heatScore: number;
  url?: string;
}

function parseUapiHotList(data: any, platform: string): HotItem[] {
  const items: HotItem[] = [];
  if (!data) return items;
  const list = data.list || data.data?.list || data.data || [];
  if (!Array.isArray(list)) return items;
  list.forEach((item: any, index: number) => {
    const title = (item.title || item.name || '').trim();
    if (!title || title.length < 3 || /[a-z]{3,}[0-9]{2,}/.test(title)) return;
    items.push({
      rank: parseInt(item.index) || index + 1,
      title,
      platform,
      heatScore: parseInt(item.hot_value || item.hot || item.heat || item.count || 0) || 0,
      url: item.url || undefined,
    });
  });
  return items;
}

export function HotRadar() {
  const {
    hotList,
    setHotList,
    isLoadingHotList,
    setLoadingHotList,
    setSelectedTopic,
    setSelectedAngles,
    setActivePage,
    showToast,
    savedTopics,
    toggleSaveTopic,
    showHotRadarGuide,
    setShowHotRadarGuide,
    isConnected,
  } = useAppStore();
  const [selectedPlatform, setSelectedPlatform] = useState('douyin');
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showCount, setShowCount] = useState(20);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [inlineAnalysis, setInlineAnalysis] = useState<{topic: string; analysis: string; isLoading: boolean} | null>(null);
  const analysisCacheRef = useRef<Map<string, string>>(new Map());
  const filteredList = selectedNiche
    ? hotList.filter(item => detectNiche(item.title).label === selectedNiche)
    : hotList;

  const fetchHotList = useCallback(
    async (platform: string) => {
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
    },
    [setHotList, setLoadingHotList, showToast],
  );

  useEffect(() => {
    const cached = localStorage.getItem('hotList');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.items?.length > 0) {
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
    setInlineAnalysis(null);
    analysisCacheRef.current.clear();
    fetchHotList(platformId);
  };

  const handleToggleSave = (item: HotItem) => {
    const isSaved = savedTopics.some((t) => t.title === item.title);
    toggleSaveTopic(item);
    if (!isSaved) {
      showToast('已收藏！可前往收藏池提交分析', 'success');
    }
  };

  const handleAnalyze = (item: HotItem) => {
    setSelectedTopic(item.title);
    const angles = recommendAngles(item.title);
    setSelectedAngles(angles);
    setActivePage('forge');
  };

  const handleInlineAnalysis = async (e: React.MouseEvent, item: HotItem) => {
    e.stopPropagation();
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }
    // Toggle off if already open
    if (inlineAnalysis?.topic === item.title && !inlineAnalysis.isLoading) {
      setInlineAnalysis(null);
      return;
    }
    // Restore from cache if available
    const cached = analysisCacheRef.current.get(item.title);
    if (cached) {
      setInlineAnalysis({ topic: item.title, analysis: cached, isLoading: false });
      return;
    }
    setInlineAnalysis({ topic: item.title, analysis: '', isLoading: true });
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setInlineAnalysis(null); return; }
      const query = buildTopicAnalysisQuery(item.title);
      const result = await callCozeChat(query);
      analysisCacheRef.current.set(item.title, result);
      setInlineAnalysis({ topic: item.title, analysis: result, isLoading: false });
      useAppStore.getState().addAnalysisHistory(item.title, result);
      showToast(`「${item.title}」分析完成`);
    } catch {
      showToast('分析失败，请稍后重试', 'error');
      setInlineAnalysis(null);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#e07832]" />
          <h2 className="text-[1.375rem] font-semibold text-[#f0ede8] tracking-tight">热点雷达</h2>
        </div>
        <p className="text-sm text-[#9b968f] ml-4">发现热点，创作爆款</p>
      </div>

      {/* Top bar: platform pills + actions */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 flex-1 min-w-0">
          {platforms.map((platform) => {
            const isActive = selectedPlatform === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => handlePlatformChange(platform.id)}
                disabled={isLoadingHotList}
                className={clsx('pill-tab', isActive && 'active')}
              >
                <PlatformIcon platform={platform.id} />
                <span>{platform.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {savedTopics.length > 0 && (
            <button
              onClick={() => setShowPoolModal(true)}
              className="pill-tab"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              收藏池
              <span className="ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#e07832] text-white">
                {savedTopics.length}
              </span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoadingHotList}
            className="pill-tab"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isLoadingHotList && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 赛道筛选 */}
      {!isLoadingHotList && hotList.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            onClick={() => setSelectedNiche(null)}
            className={clsx(
              'px-2.5 py-1 rounded-md text-caption font-medium transition-all shrink-0',
              !selectedNiche
                ? 'bg-accent-subtle text-accent border border-accent'
                : 'bg-bg-surface border border-border text-text-tertiary hover:text-text-secondary'
            )}
          >
            全部
          </button>
          {hotList.map(item => detectNiche(item.title).label).filter((n, i, a) => a.indexOf(n) === i).slice(0, 8).map(niche => (
            <button
              key={niche}
              onClick={() => setSelectedNiche(selectedNiche === niche ? null : niche)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-caption font-medium transition-all shrink-0',
                selectedNiche === niche
                  ? 'bg-accent-subtle text-accent border border-accent'
                  : 'bg-bg-surface border border-border text-text-tertiary hover:text-text-secondary'
              )}
            >
              {niche}
            </button>
          ))}
        </div>
      )}

      {/* 3 步工作流引导卡（可折叠，可从 TopBar Settings 重新显示） */}
      {showHotRadarGuide && (
        <div className="card p-4 mb-5 border-l-2 border-l-[#e07832]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#e07832] shrink-0" />
              <span className="text-body-sm font-medium text-text-primary">3 步找到爆款选题</span>
            </div>
            <button
              onClick={() => setShowHotRadarGuide(false)}
              className="text-caption text-text-tertiary hover:text-text-primary shrink-0"
              title="收起引导（可从右上角设置重新显示）"
            >
              收起
            </button>
          </div>
          <ol className="space-y-2 text-body-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-subtle text-accent text-caption font-semibold flex items-center justify-center">1</span>
              <span>浏览热榜 / 切换平台，找到感兴趣的话题</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-subtle text-accent text-caption font-semibold flex items-center justify-center">2</span>
              <span>点击话题旁的 <Bookmark className="w-3.5 h-3.5 inline -mt-0.5 text-accent" /> 收藏到「收藏池」（可攒多个一起分析）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-subtle text-accent text-caption font-semibold flex items-center justify-center">3</span>
              <span>到「文案工坊」选角度，一键生成多平台爆款文案</span>
            </li>
          </ol>
        </div>
      )}

      {/* Content */}
      {isLoadingHotList ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingState />
        </div>
      ) : error ? (
        <EmptyState
          icon={<RefreshCw className="w-8 h-8 text-[#e07832]" />}
          title="获取热榜失败"
          description={error}
          action={{ label: '重新加载', onClick: handleRefresh }}
        />
      ) : hotList.length === 0 ? (
        <EmptyState
          icon={<Flame className="w-8 h-8 text-[#e07832]" />}
          title="暂无热榜数据"
          description="当前平台暂无热榜数据，试试切换平台"
          action={{ label: '刷新热榜', onClick: handleRefresh }}
        />
      ) : (
        <div>
          {/* List header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#e07832]" />
              <span className="text-sm text-[#9b968f]">
                实时热点 · <span className="text-[#f0ede8] font-medium">{selectedNiche ? filteredList.length : hotList.length}</span> 条
                {selectedNiche && (
                  <span className="text-text-tertiary ml-1">(赛道: {selectedNiche})</span>
                )}
              </span>
            </div>
          </div>

          {/* Hot list */}
          <div className="space-y-2">
            {filteredList.slice(0, showCount).map((item, index) => {
              const isSaved = savedTopics.some((t) => t.title === item.title);
              const isHero = index < 3;
              const isCompact = index >= 10;
              const isAnalyzing = inlineAnalysis?.topic === item.title;
              return (
                <div key={index}>
                  <div
                    onClick={() => handleAnalyze(item)}
                    className={clsx('hot-card group', isCompact && 'compact')}
                  >
                    {/* Rank */}
                    {isCompact ? (
                      <span className="text-xs text-[#6b6863] min-w-[18px] text-right shrink-0 tabular-nums">
                        {index + 1}
                      </span>
                    ) : (
                      <div className={clsx('rank-badge', isHero && 'top')}>
                        {index + 1}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className={clsx(
                        'flex items-start justify-between gap-2',
                        isCompact && 'items-center'
                      )}>
                        <span className={clsx(
                          'truncate text-left flex-1 min-w-0',
                          isCompact
                            ? 'text-sm text-[#f0ede8]'
                            : 'text-sm font-medium text-[#f0ede8] group-hover:text-[#e07832] transition-colors'
                        )}>
                          {item.title}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={(e) => handleInlineAnalysis(e, item)}
                            className={clsx(
                              'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                              isAnalyzing && !inlineAnalysis?.isLoading
                                ? 'text-[#e07832] bg-[#e07832]/10'
                                : isCompact
                                  ? 'text-[#6b6863] hover:text-[#9b968f] hover:bg-[#232220]'
                                  : 'text-[#6b6863] hover:text-[#9b968f] hover:bg-[#232220]'
                            )}
                            title="AI 分析话题"
                          >
                            <Sparkles className={clsx(
                              'w-3 h-3',
                              inlineAnalysis?.isLoading && isAnalyzing && 'animate-pulse'
                            )} />
                            <span>{isCompact ? '' : '分析'}</span>
                          </button>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={clsx(
                                'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                                isCompact
                                  ? 'text-[#6b6863] hover:text-[#9b968f] hover:bg-[#232220]'
                                  : 'text-[#6b6863] hover:text-[#9b968f] hover:bg-[#232220]'
                              )}
                              title="查看原文"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>查看</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Metadata row (compact: only heat inline) */}
                      {isCompact ? (
                        <span className="text-xs text-[#6b6863] ml-1">
                          {item.heatScore > 0 ? formatHeat(item.heatScore) : '-'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1 text-xs text-[#6b6863]">
                            <Flame className="w-3 h-3 text-[#e07832]" />
                            <span className={item.heatScore > 0 ? 'text-[#9b968f]' : ''}>
                              {item.heatScore > 0 ? formatHeat(item.heatScore) : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#6b6863]">
                            <PlatformIcon platform={item.platform} />
                            <span className="text-[#9b968f]">
                              {platforms.find((p) => p.id === item.platform)?.label || item.platform}
                            </span>
                          </div>
                          {(() => { const n = detectNiche(item.title); return (
                            <span
                              className={clsx('text-[11px] px-2 py-0.5 rounded-sm font-medium', n.label === '综合' ? 'text-text-tertiary border border-border' : 'border')}
                              style={n.label !== '综合' ? { backgroundColor: n.color + '18', color: n.color, borderColor: n.color + '40' } : undefined}
                            >
                              {n.label}
                            </span>
                          ); })()}
                          <span className="text-xs text-[#6b6863]">刚刚</span>
                        </div>
                      )}

                      {/* Angles (all non-compact) */}
                      {!isCompact && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {recommendAngles(item.title)
                            .slice(0, 3)
                            .map((angle, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-sm bg-[#1c1b19] border border-[#2c2b29] text-[#6b6863]"
                              >
                                {angle}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Save button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSave(item);
                      }}
                      className={clsx('save-btn', isSaved && 'saved', isCompact && '!w-6 !h-6')}
                      title={isSaved ? '取消收藏' : '收藏话题'}
                    >
                      {isSaved ? <BookmarkCheck className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} /> : <Bookmark className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />}
                    </button>
                  </div>

                  {/* Inline analysis panel */}
                  {isAnalyzing && (
                    <div className="mt-2">
                      {inlineAnalysis!.isLoading ? (
                        <div className="card p-4 flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#e07832]" />
                          <span className="text-sm text-[#9b968f]">AI 分析中...</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-end mb-1">
                            <button
                              onClick={() => setInlineAnalysis(null)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[#6b6863] hover:text-[#f0ede8] hover:bg-[#232220] transition-colors"
                            >
                              <X className="w-3 h-3" />
                              收起分析
                            </button>
                          </div>
                          <AnalysisRenderer
                            topic={item.title}
                            analysis={inlineAnalysis!.analysis}
                            onWriteCopy={() => {
                              useAppStore.getState().setLastAnalysis(inlineAnalysis!.analysis);
                              handleAnalyze(item);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hotList.length > showCount && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => setShowCount((c) => c + 20)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#2c2b29] text-sm text-[#9b968f] hover:bg-[#1c1b19] hover:text-[#f0ede8] hover:border-[#3a3937] transition-all duration-120"
              >
                <ChevronDown className="w-4 h-4" />
                加载更多 ({hotList.length - showCount}条)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collection pool modal */}
      {showPoolModal && savedTopics.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowPoolModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#e07832]" />
                <h3 className="text-sm font-semibold text-[#f0ede8]">收藏池</h3>
                <span className="text-xs text-[#6b6863] ml-1">({savedTopics.length})</span>
              </div>
              <button
                onClick={() => setShowPoolModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b6863] hover:text-[#f0ede8] hover:bg-[#1c1b19] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
              {savedTopics.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1c1b19] border border-[#2c2b29]"
                >
                  <span className="text-sm text-[#f0ede8] flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-[#6b6863] shrink-0">
                    {platforms.find((p) => p.id === item.platform)?.label || item.platform}
                  </span>
                  <button
                    onClick={() => toggleSaveTopic(item)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[#6b6863] hover:text-[#ef4444] hover:bg-[#232220] transition-all shrink-0"
                    title="移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={() => {
                if (savedTopics.length === 0) return;
                useAppStore.getState().setAutoAnalyze(true);
                showToast(`已选择 ${savedTopics.length} 个话题，即将开始分析`, 'info');
                setActivePage('explore');
              }}
              className="btn-accent w-full"
            >
              <Send className="w-4 h-4" />
              提交分析 ({savedTopics.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
