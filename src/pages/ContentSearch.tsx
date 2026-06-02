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
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto min-h-screen">
      {/* Header - 与其他页面统一：左对齐 h2 + 副标题 + 交叉链接 */}
      <div className="mb-5">
        <h2 className="text-display text-text-primary mb-1">内容搜索</h2>
        <p className="text-body-sm text-text-secondary">
          平台搜原始帖子：直接从 {platform === 'zhihu' ? '知乎开放接口' : '搜索引擎'} 搜讨论素材（标题/点赞/评论）。
        </p>
        <p className="text-caption text-text-tertiary mt-1">
          想让 AI 跨平台分析「哪些平台在聊这个话题」？去「话题勘探」页
        </p>
      </div>

      {/* Platform switch + search bar - 同一行 */}
      <div className="card p-4 mb-5">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="inline-flex rounded-lg bg-bg-elevated p-1 border border-border shrink-0">
            <button
              onClick={() => { setPlatform('zhihu'); if (hasSearched) doSearch(); }}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all duration-120 ${
                platform === 'zhihu'
                  ? 'bg-bg-surface text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              知乎
            </button>
            <button
              onClick={() => { setPlatform('maimai'); if (hasSearched) doSearch(); }}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all duration-120 ${
                platform === 'maimai'
                  ? 'bg-bg-surface text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              脉脉
            </button>
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder={`输入关键词，搜索${platform === 'zhihu' ? '知乎' : '脉脉'}讨论...`}
              className="input-field !rounded-md !pl-10 !pr-20"
            />
            <button
              onClick={() => doSearch()}
              disabled={isLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary !py-1 !px-3 !text-caption"
            >
              {isLoading ? '搜索中' : '搜索'}
            </button>
          </div>
        </div>

        {/* Quick suggestions + trending inline */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-caption text-text-tertiary shrink-0">热门方向：</span>
          {displayedSuggestions.map((sub) => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.label}
                onClick={() => doSearch(sub.label)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-caption text-text-secondary hover:text-text-primary hover:border-accent/40 transition-all duration-120"
              >
                <Icon className="w-3 h-3" />
                {sub.label}
              </button>
            );
          })}
          {SUGGESTIONS.length > 3 && (
            <button
              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
              className="text-caption text-text-tertiary hover:text-accent px-1"
            >
              {showAllSuggestions ? '收起' : `+${SUGGESTIONS.length - 3}`}
            </button>
          )}
        </div>

        {/* Trending from HotRadar - 复用统一色（去橙色） */}
        {trendingTopics.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-border">
            <span className="text-caption text-text-tertiary flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3 text-accent" />
              实时热榜：
            </span>
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => doSearch(topic)}
                className="px-2.5 py-1 rounded-md bg-accent-subtle border border-accent/20 text-caption text-accent hover:bg-accent hover:text-white hover:border-accent transition-all duration-120"
              >
                {topic}
              </button>
            ))}
          </div>
        )}
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
                className="card p-0 overflow-hidden hover:border-accent/40"
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
                        : 'bg-accent-subtle text-accent'
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
                      className="flex items-center gap-1 text-caption text-accent hover:text-accent-hover transition-colors"
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
                className="btn-ghost"
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
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-subtle mx-auto mb-3 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-body font-semibold text-text-primary mb-1">没有搜到结果</h3>
          <p className="text-body-sm text-text-secondary mb-4">试试换个关键词，或检查 API 配置状态</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {['AI 焦虑', '转行', '职业发展'].map(tag => (
              <button
                key={tag}
                onClick={() => doSearch(tag)}
                className="px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-caption text-text-secondary hover:text-text-primary hover:border-accent/40 transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-body-sm font-medium text-text-secondary mb-3">推荐搜索方向</h3>
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
                className="card p-4 text-left hover:border-accent/40 transition-all duration-120"
              >
                <h4 className="text-body-sm font-medium text-text-primary mb-1 group-hover:text-accent">
                  {suggestion.title}
                </h4>
                <p className="text-caption text-text-tertiary">{suggestion.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 card p-4">
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
