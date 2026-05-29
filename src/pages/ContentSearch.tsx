import { useState } from 'react';
import { Search, ExternalLink, RefreshCw, MessageSquare, ThumbsUp, AlertCircle, FileText, Globe, ChevronDown, Sparkles } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: 'zhihu' | 'maimai';
  author?: string;
  votes?: number;
  comments?: number;
  date?: string;
}

export function ContentSearch() {
  const [keyword, setKeyword] = useState('AI 行业焦虑');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'all' | 'zhihu' | 'maimai'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    const allResults: SearchResult[] = [];

    // 并行搜索知乎和脉脉
    const promises: Promise<void>[] = [];

    // 知乎搜索
    promises.push((async () => {
      try {
        const r = await fetch(`/api/proxy?action=zhihu_search&keyword=${encodeURIComponent(keyword)}&count=10`);
        if (!r.ok) throw new Error(`Zhihu API: ${r.status}`);
        const data = await r.json();
        if (data.Code === 0 && data.Data?.Items) {
          data.Data.Items.forEach((item: any, i: number) => {
            allResults.push({
              id: `zh-${i}-${Date.now()}`,
              title: item.Title || item.ContentText || '知乎回答',
              url: item.Url || '#',
              summary: item.ContentText || '',
              source: 'zhihu',
              author: item.AuthorName,
              votes: item.VoteUpCount,
              comments: item.CommentCount,
              date: item.EditTime,
            });
          });
        }
      } catch (e: any) {
        console.log('Zhihu search failed:', e.message);
      }
    })());

    // 脉脉搜索
    promises.push((async () => {
      try {
        const r = await fetch(`/api/proxy?action=maimai_search&keyword=${encodeURIComponent(keyword)}`);
        if (!r.ok) throw new Error(`Maimai API: ${r.status}`);
        const data = await r.json();
        if (data.success && data.data) {
          data.data.forEach((item: any, i: number) => {
            allResults.push({
              id: `mm-${i}-${Date.now()}`,
              title: item.title,
              url: item.url,
              summary: item.content,
              source: 'maimai',
              date: item.date,
            });
          });
        }
      } catch (e: any) {
        console.log('Maimai search failed:', e.message);
      }
    })());

    await Promise.allSettled(promises);

    if (allResults.length === 0) {
      setError('暂无搜索结果，请尝试其他关键词');
    } else {
      setResults(allResults);
    }
    setIsLoading(false);
  };

  const filteredResults = results.filter(r => {
    if (activeSource === 'all') return true;
    return r.source === activeSource;
  });

  const zhihuCount = results.filter(r => r.source === 'zhihu').length;
  const maimaiCount = results.filter(r => r.source === 'maimai').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">内容搜索</h1>
        </div>
        <p className="text-body-md text-text-secondary">
          一站式搜索知乎问答 + 脉脉职场讨论，找到目标话题的真实讨论
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入关键词，如：AI 焦虑、裁员、副业..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>搜索</span>
        </button>
      </div>

      {/* 来源切换 */}
      {results.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSource('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeSource === 'all' ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            全部 ({results.length})
          </button>
          <button
            onClick={() => setActiveSource('zhihu')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeSource === 'zhihu' ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            知乎 ({zhihuCount})
          </button>
          <button
            onClick={() => setActiveSource('maimai')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeSource === 'maimai' ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            脉脉 ({maimaiCount})
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-bg-elevated border border-border rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-text-tertiary shrink-0 mt-0.5" />
          <p className="text-body-sm text-text-secondary">{error}</p>
        </div>
      )}

      {/* 结果列表 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <span className="ml-3 text-text-secondary">正在搜索知乎和脉脉...</span>
          </div>
        ) : filteredResults.length > 0 ? (
          filteredResults.map((item) => (
            <div
              key={item.id}
              className="bg-bg-surface border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* 主内容 */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex-1"
                  >
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                      {item.title}
                    </h3>
                  </a>
                  <span className={`ml-3 shrink-0 px-2 py-0.5 rounded text-caption font-medium ${
                    item.source === 'zhihu'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {item.source === 'zhihu' ? '知乎' : '脉脉'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-caption text-text-tertiary mb-2 flex-wrap">
                  {item.author && (
                    <span className="flex items-center gap-1">
                      <span>{item.author}</span>
                    </span>
                  )}
                  {item.votes !== undefined && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {item.votes}
                    </span>
                  )}
                  {item.comments !== undefined && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {item.comments}
                    </span>
                  )}
                  {item.date && <span>{item.date}</span>}
                </div>

                {/* 摘要（可展开） */}
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
                        className="mt-1 text-caption text-accent hover:text-accent-hover flex items-center gap-0.5"
                      >
                        {expandedId === item.id ? '收起' : '展开'}
                        <ChevronDown className={`w-3 h-3 transition-transform ${
                          expandedId === item.id ? 'rotate-180' : ''
                        }`} />
                      </button>
                    )}
                  </>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-caption text-accent hover:text-accent-hover"
                  >
                    查看原文
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => {
                      const store = (window as any).__useAppStore;
                      if (store) {
                        store.getState().setSelectedTopic(item.title);
                        store.getState().setActivePage('explore');
                      }
                    }}
                    className="flex items-center gap-1 text-caption text-text-tertiary hover:text-accent transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    分析这个
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-text-tertiary mb-4" />
            <h3 className="text-lg font-medium text-text-secondary mb-2">搜索内容</h3>
            <p className="text-body-sm text-text-tertiary mb-4 max-w-md">
              输入关键词，一键搜索知乎问答和脉脉职场讨论，找到真实用户的观点和讨论
            </p>
          </div>
        )}
      </div>

      {/* 底部说明 */}
      <div className="mt-8 p-4 bg-bg-elevated border border-border rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">数据来源说明</h4>
        <ul className="text-body-sm text-text-secondary space-y-1 list-disc list-inside">
          <li><strong>知乎</strong>：通过知乎开放平台 API 搜索，需要配置 ZHIHU_API_TOKEN 环境变量</li>
          <li><strong>脉脉</strong>：通过 Bing 搜索抓取脉脉公开内容，无法获取需要登录的帖子正文</li>
        </ul>
      </div>
    </div>
  );
}
