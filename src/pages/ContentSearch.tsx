import { useState } from 'react';
import { Search, ExternalLink, MessageSquare, ThumbsUp, Sparkles, TrendingUp, ShieldAlert, Lightbulb, Brain, RefreshCw, Clock, User } from 'lucide-react';
import { useAppStore } from '../store';

const SUBTOPICS = [
  { label: 'AI 替代人工', icon: Brain },
  { label: '35岁危机', icon: ShieldAlert },
  { label: '转行方向', icon: TrendingUp },
  { label: '新兴职业', icon: Lightbulb },
  { label: '技能提升', icon: Sparkles },
  { label: '行业焦虑', icon: ShieldAlert },
];

interface ZhihuItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  author?: string;
  votes?: number;
  comments?: number;
  date?: string;
}

export function ContentSearch() {
  const [keyword, setKeyword] = useState('AI 行业焦虑');
  const [results, setResults] = useState<ZhihuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllSubtopics, setShowAllSubtopics] = useState(false);

  const handleSearch = async (searchKeyword?: string) => {
    const kw = searchKeyword || keyword;
    if (!kw.trim()) return;
    setKeyword(kw);
    setIsLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const r = await fetch(`/api/proxy?action=zhihu_search&keyword=${encodeURIComponent(kw)}&count=10`);
      if (!r.ok) throw new Error(`Zhihu API: ${r.status}`);
      const data = await r.json();
      if (data.Code === 0 && data.Data?.Items) {
        const items: ZhihuItem[] = data.Data.Items.map((item: any, i: number) => ({
          id: `zh-${i}`,
          title: item.Title || item.ContentText || '知乎回答',
          url: item.Url || '#',
          summary: item.ContentText || '',
          author: item.AuthorName,
          votes: item.VoteUpCount,
          comments: item.CommentCount,
          date: item.EditTime,
        }));
        setResults(items);
      } else {
        setResults([]);
      }
    } catch (e: any) {
      console.log('Zhihu search failed:', e.message);
      setResults([]);
    }
    setIsLoading(false);
  };

  const displayedSubtopics = showAllSubtopics ? SUBTOPICS : SUBTOPICS.slice(0, 3);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ─── Hero 区：AI + 行业焦虑 ─── */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-caption font-medium mb-4">
          <Brain className="w-3.5 h-3.5" />
          知乎深度搜索
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-3 leading-tight">
          AI + 行业焦虑
        </h1>
        <p className="text-body-md text-text-secondary max-w-xl mx-auto">
          搜索知乎上关于 AI 对行业冲击、职业焦虑、转行方向的真实讨论
        </p>
      </div>

      {/* ─── 快捷话题入口 ─── */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {displayedSubtopics.map((sub) => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.label}
                onClick={() => handleSearch(sub.label)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg-surface border border-border text-body-sm text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-all duration-120 active:scale-95"
              >
                <Icon className="w-3.5 h-3.5" />
                {sub.label}
              </button>
            );
          })}
          {SUBTOPICS.length > 3 && (
            <button
              onClick={() => setShowAllSubtopics(!showAllSubtopics)}
              className="text-caption text-text-tertiary hover:text-accent px-2"
            >
              {showAllSubtopics ? '收起' : `+${SUBTOPICS.length - 3} 更多`}
            </button>
          )}
        </div>
      </div>

      {/* ─── 搜索栏 ─── */}
      <div className="relative mb-8 max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入关键词，搜索知乎讨论..."
          className="w-full pl-11 pr-12 py-3 bg-bg-surface border border-border rounded-xl text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
        />
        <button
          onClick={() => handleSearch()}
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-white rounded-lg text-caption font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isLoading ? '搜索中' : '搜索'}
        </button>
      </div>

      {/* ─── 结果区 ─── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-accent animate-spin mb-4" />
          <p className="text-body-sm text-text-secondary">正在搜索知乎...</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          {/* 结果统计 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-body-sm text-text-tertiary">
              找到 <span className="text-text-primary font-medium">{results.length}</span> 条结果
              {results.some(r => r.votes) && (
                <span className="ml-2 text-caption">按热度排序</span>
              )}
            </p>
          </div>

          {/* 结果列表 */}
          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="bg-bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-120"
              >
                <div className="p-5">
                  {/* 标题 + 来源 */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex-1">
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                        {item.title}
                      </h3>
                    </a>
                    <span className="shrink-0 px-2 py-0.5 rounded text-caption font-medium bg-blue-50 text-blue-600">
                      知乎
                    </span>
                  </div>

                  {/* 元信息 */}
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

                  {/* 摘要 */}
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

                  {/* 操作按钮 */}
                  <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-caption text-accent hover:text-accent-hover"
                    >
                      在知乎查看
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
                      AI 分析这个话题
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasSearched ? (
        /* ─── 空结果 ─── */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-text-secondary mb-2">没有搜到结果</h3>
          <p className="text-body-sm text-text-tertiary mb-6 max-w-sm">
            知乎 API 需要配置 ZHIHU_API_TOKEN 环境变量才能使用，试试换个关键词
          </p>
          <div className="flex gap-2">
            {['AI 焦虑', '转行', '职业发展'].map(tag => (
              <button
                key={tag}
                onClick={() => handleSearch(tag)}
                className="px-3 py-1.5 rounded-full bg-bg-surface border border-border text-caption text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ─── 初始状态 ─── */
        <div className="py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
              推荐搜索方向
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'AI 会取代哪些行业？', desc: '看看知乎上关于 AI 替代的热门讨论' },
                { title: '35岁遇上AI时代', desc: '中年职场人在 AI 浪潮中的困境与出路' },
                { title: '2025热门转行方向', desc: 'AI 时代哪些行业值得投身' },
                { title: 'AI 焦虑怎么破', desc: '知乎高赞回答教你应对 AI 焦虑' },
              ].map((suggestion) => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSearch(suggestion.title)}
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

      {/* ─── 底部说明 ─── */}
      <div className="mt-8 p-4 rounded-xl bg-bg-elevated border border-border">
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-body-sm font-medium text-text-primary mb-1">关于本工具</h4>
            <p className="text-caption text-text-secondary leading-relaxed">
              通过知乎开放平台 API 搜索有关 AI + 行业焦虑的讨论。搜索到的内容可以直接跳到「话题勘探」进行 AI 深度分析，或到「文案创作」生成内容。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
