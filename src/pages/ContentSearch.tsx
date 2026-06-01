import { useState, useMemo } from 'react';
import { Search, ExternalLink, MessageSquare, ThumbsUp, Sparkles, TrendingUp, ShieldAlert, Lightbulb, Brain, RefreshCw, Clock, User, Flame, PenSquare } from 'lucide-react';
import { useAppStore } from '../store';

const SUGGESTIONS = [
  { label: 'AI 替代人工', icon: Brain },
  { label: '35岁危机', icon: ShieldAlert },
  { label: '转行方向', icon: TrendingUp },
  { label: '新兴职业', icon: Lightbulb },
  { label: '技能提升', icon: Sparkles },
  { label: '行业焦虑', icon: ShieldAlert },
];

type Platform = 'zhihu' | 'maimai';

interface SearchItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  author?: string;
  votes?: number;
  comments?: number;
  date?: string;
  type?: string;
  platform: Platform;
}

export function ContentSearch() {
  const [platform, setPlatform] = useState<Platform>('zhihu');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hotList = useAppStore((s) => s.hotList);
  const trendingTopics = useMemo(() => {
    if (!hotList.length) return [];
    const seen = new Set<string>();
    return hotList
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .slice(0, 8)
      .map((item) => item.title);
  }, [hotList]);

  const doSearch = async (searchKeyword?: string) => {
    const kw = searchKeyword || keyword;
    if (!kw.trim()) return;
    setKeyword(kw);
    setIsLoading(true);
    setHasSearched(true);
    setResults([]);
    setOffset(0);
    setHasMore(false);

    try {
      const action = platform === 'zhihu' ? 'zhihu_search' : 'maimai_search';
      const r = await fetch(`/api/proxy?action=${action}&keyword=${encodeURIComponent(kw)}&count=10`);
      if (!r.ok) throw new Error(`搜索请求失败: ${r.status}`);
      const data = await r.json();

      if (platform === 'zhihu') {
        if (data.Code === 0 && data.Data?.Items) {
          const items: SearchItem[] = data.Data.Items.map((item: any, i: number) => ({
            id: `zh-${i}`,
            title: item.Title || item.ContentText || '知乎回答',
            url: item.Url || '#',
            summary: item.ContentText || '',
            author: item.AuthorName,
            votes: item.VoteUpCount,
            comments: item.CommentCount,
            date: item.EditTime,
            type: item.TypeName || item.Type || '',
            platform: 'zhihu',
          }));
          setResults(items);
          setHasMore(!!data.Data.HasMore);
          setOffset(items.length);
        } else {
          setResults([]);
        }
      } else {
        if (data.items && Array.isArray(data.items)) {
          const items: SearchItem[] = data.items.map((item: any, i: number) => ({
            id: `mm-${i}`,
            title: item.title || '脉脉讨论',
            url: item.url || '#',
            summary: item.summary || '',
            author: item.author,
            date: item.date,
            platform: 'maimai',
          }));
          setResults(items);
        } else {
          setResults([]);
        }
      }
    } catch (e: any) {
      console.log('搜索失败:', e.message);
      setResults([]);
    }
    setIsLoading(false);
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const action = platform === 'zhihu' ? 'zhihu_search' : 'maimai_search';
    try {
      const r = await fetch(`/api/proxy?action=${action}&keyword=${encodeURIComponent(keyword)}&count=10&offset=${offset}`);
      if (!r.ok) throw new Error(`加载更多失败: ${r.status}`);
      const data = await r.json();

      if (platform === 'zhihu') {
        if (data.Code === 0 && data.Data?.Items) {
          const items: SearchItem[] = data.Data.Items.map((item: any, i: number) => ({
            id: `zh-${offset + i}`,
            title: item.Title || item.ContentText || '知乎回答',
            url: item.Url || '#',
            summary: item.ContentText || '',
            author: item.AuthorName,
            votes: item.VoteUpCount,
            comments: item.CommentCount,
            date: item.EditTime,
            type: item.TypeName || item.Type || '',
            platform: 'zhihu',
          }));
          setResults((prev) => [...prev, ...items]);
          setHasMore(!!data.Data.HasMore);
          setOffset((prev) => prev + items.length);
        }
      }
    } catch (e: any) {
      console.log('加载更多失败:', e.message);
    }
    setIsLoadingMore(false);
  };

  const displayedSuggestions = showAllSuggestions ? SUGGESTIONS : SUGGESTIONS.slice(0, 3);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-caption font-medium mb-4">
          <Brain className="w-3.5 h-3.5" />
          {platform === 'zhihu' ? '知乎深度搜索' : '脉脉话题搜索'}
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-3 leading-tight">
          搜索你感兴趣的话题
        </h1>
        <p className="text-body-md text-text-secondary max-w-xl mx-auto">
          {platform === 'zhihu' 
            ? '搜索知乎上的真实讨论，发现热门观点和深度内容'
            : '通过搜索引擎查找脉脉上的相关讨论，职场话题'}
        </p>
      </div>

      {/* Platform switch */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg bg-bg-elevated p-1 border border-border">
          <button
            onClick={() => { setPlatform('zhihu'); if (hasSearched) doSearch(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-120 ${
              platform === 'zhihu'
                ? 'bg-bg-surface text-accent shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            知乎
          </button>
          <button
            onClick={() => { setPlatform('maimai'); if (hasSearched) doSearch(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-120 ${
              platform === 'maimai'
                ? 'bg-bg-surface text-accent shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            脉脉
          </button>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {displayedSuggestions.map((sub) => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.label}
                onClick={() => doSearch(sub.label)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg-surface border border-border text-body-sm text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-all duration-120 active:scale-95"
              >
                <Icon className="w-3.5 h-3.5" />
                {sub.label}
              </button>
            );
          })}
          {SUGGESTIONS.length > 3 && (
            <button
              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
              className="text-caption text-text-tertiary hover:text-accent px-2"
            >
              {showAllSuggestions ? '收起' : `+${SUGGESTIONS.length - 3} 更多`}
            </button>
          )}
        </div>
      </div>

      {/* Trending from HotRadar */}
      {trendingTopics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-caption font-medium text-text-tertiary">实时热榜趋势</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => doSearch(topic)}
                className="px-3 py-1.5 rounded-full bg-orange-50/60 border border-orange-200/50 text-caption text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-all duration-120 active:scale-95"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-8 max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder={`输入关键词，搜索${platform === 'zhihu' ? '知乎' : '脉脉'}讨论...`}
          className="w-full pl-11 pr-12 py-3 bg-bg-surface border border-border rounded-xl text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
        />
        <button
          onClick={() => doSearch()}
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-white rounded-lg text-caption font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isLoading ? '搜索中' : '搜索'}
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-surface border border-border rounded-xl overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 h-5 bg-bg-elevated rounded animate-pulse" />
                <div className="w-12 h-5 bg-bg-elevated rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-3 bg-bg-elevated rounded animate-pulse" />
                <div className="w-12 h-3 bg-bg-elevated rounded animate-pulse" />
                <div className="w-20 h-3 bg-bg-elevated rounded animate-pulse" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="w-full h-3 bg-bg-elevated rounded animate-pulse" />
                <div className="w-3/4 h-3 bg-bg-elevated rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="w-24 h-3 bg-bg-elevated rounded animate-pulse" />
                <div className="w-20 h-3 bg-bg-elevated rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-body-sm text-text-tertiary">
              找到 <span className="text-text-primary font-medium">{results.length}</span> 条结果
              {results.some(r => r.votes) && (
                <span className="ml-2 text-caption">按热度排序</span>
              )}
            </p>
          </div>

          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="bg-bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-120"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex-1">
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                        {item.title}
                      </h3>
                    </a>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-caption font-medium ${
                      item.platform === 'zhihu'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}>
                      {item.platform === 'zhihu' ? '知乎' : '脉脉'}
                    </span>
                    {item.type && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-caption font-medium bg-gray-50 text-gray-500">
                        {item.type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-caption text-text-tertiary mb-2 flex-wrap">
                    {item.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.author}
                      </span>
                    )}
                    {item.votes !== undefined && item.votes > 0 && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {item.votes}
                      </span>
                    )}
                    {item.comments !== undefined && item.comments > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {item.comments}
                      </span>
                    )}
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.date}
                      </span>
                    )}
                  </div>

                  {item.summary && (
                    <>
                      <p className={`text-body-sm text-text-secondary leading-relaxed ${
                        expandedId !== item.id ? 'line-clamp-2' : ''
                      }`}>
                        {item.summary}
                      </p>
                      {item.summary.length > 120 && (
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="mt-1 text-caption text-accent hover:text-accent-hover"
                        >
                          {expandedId === item.id ? '收起' : '展开全文'}
                        </button>
                      )}
                    </>
                  )}

                  <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-caption text-accent hover:text-accent-hover"
                    >
                      在{item.platform === 'zhihu' ? '知乎' : '脉脉'}查看
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => {
                        useAppStore.getState().setSelectedTopic(item.title);
                        useAppStore.getState().setActivePage('explore');
                      }}
                      className="flex items-center gap-1 text-caption text-text-tertiary hover:text-accent transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI 分析
                    </button>
                    <button
                      onClick={() => {
                        const store = useAppStore.getState();
                        store.setSelectedTopic(item.title);
                        store.setLastAnalysis(`来自${item.platform === 'zhihu' ? '知乎' : '脉脉'}搜索结果：${item.summary || item.title}`);
                        store.setActivePage('forge');
                      }}
                      className="flex items-center gap-1 text-caption text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      <PenSquare className="w-3 h-3" />
                      直接送 forge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-xl bg-bg-surface border border-border text-body-sm text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-all duration-120 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    加载中...
                  </span>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}
        </div>
      ) : hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-text-secondary mb-2">没有搜到结果</h3>
          <p className="text-body-sm text-text-tertiary mb-6 max-w-sm">
            试试换个关键词，或检查 API 配置状态
          </p>
          <div className="flex gap-2">
            {['AI 焦虑', '转行', '职业发展'].map(tag => (
              <button
                key={tag}
                onClick={() => doSearch(tag)}
                className="px-3 py-1.5 rounded-full bg-bg-surface border border-border text-caption text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
              推荐搜索方向
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'AI 会取代哪些行业？', desc: '看看热门平台上关于 AI 替代的讨论' },
                { title: '35 岁遇上 AI 时代', desc: '中年职场人在 AI 浪潮中的困境与出路' },
                { title: '热门转行方向', desc: 'AI 时代哪些行业值得投身' },
                { title: 'AI 焦虑怎么破', desc: '高赞回答教你应对 AI 焦虑' },
              ].map((suggestion) => (
                <button
                  key={suggestion.title}
                  onClick={() => doSearch(suggestion.title)}
                  className="group text-left p-4 rounded-xl bg-bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all duration-120 active:scale-[0.98]"
                >
                  <h4 className="text-body-sm font-medium text-text-primary group-hover:text-accent transition-colors mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-caption text-text-tertiary">{suggestion.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl bg-bg-elevated border border-border">
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-body-sm font-medium text-text-primary mb-1">关于本工具</h4>
            <p className="text-caption text-text-secondary leading-relaxed">
              知乎通过开放平台 API 搜索，脉脉通过搜索引擎查找相关内容。搜到的结果可以直接跳到「话题勘探」进行 AI 深度分析，或到「文案创作」生成内容。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
