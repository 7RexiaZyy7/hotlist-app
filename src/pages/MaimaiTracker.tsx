import { useState } from 'react';
import { FileText, RefreshCw, ExternalLink, Search, AlertCircle, Globe } from 'lucide-react';

interface MaimaiArticle {
  id: string;
  title: string;
  url: string;
  content: string;
  date: string;
  tags: string[];
  views?: number;
}

export function MaimaiTracker() {
  const [articles, setArticles] = useState<MaimaiArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('AI 焦虑');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<'real' | 'demo'>('real');

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proxy?action=maimai_search&keyword=${encodeURIComponent(searchKeyword)}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setArticles(result.data);
        setSearchSource(result.source === 'bing_search' ? 'real' : 'demo');
      } else {
        throw new Error(result.error || 'No results');
      }
    } catch (err) {
      console.log('Search API unavailable:', err);
      setError(null);
      setSearchSource('demo');
      setArticles(generateFallbackData(searchKeyword));
    } finally {
      setIsLoading(false);
    }
  };

  const allTags = Array.from(new Set(articles.flatMap(a => a.tags)));
  const filteredArticles = articles.filter(article => {
    if (selectedTag && !article.tags.includes(selectedTag)) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">脉脉内容追踪</h1>
            <p className="text-body-md text-text-secondary">
              搜索脉脉平台上关于特定话题的讨论和热帖
            </p>
          </div>
          <button
            onClick={handleFetch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>搜索</span>
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="输入关键词，如：AI 焦虑、裁员、行业趋势..."
              className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>

        {/* 数据来源提示 */}
        {articles.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-caption text-text-tertiary">
            <Globe className="w-3.5 h-3.5" />
            <span>
              {searchSource === 'real'
                ? '数据来源：Bing 搜索（脉脉）'
                : '数据来源：AI 生成（搜索未返回结果时的演示数据）'}
            </span>
          </div>
        )}
      </div>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !selectedTag ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === tag ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 mb-1">搜索失败</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 文章列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <span className="ml-3 text-text-secondary">正在搜索...</span>
          </div>
        ) : filteredArticles.length > 0 ? (
          filteredArticles.map(article => (
            <article key={article.id} className="bg-bg-surface border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-text-primary flex-1 mr-4">
                  {article.title}
                </h3>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent hover:text-accent-hover text-body-sm shrink-0"
                >
                  原文
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-body-sm text-text-secondary mb-4 line-clamp-3">
                {article.content}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {article.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-bg-elevated text-text-tertiary text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-caption text-text-tertiary">
                  {article.views && (
                    <span>{article.views.toLocaleString()} 浏览</span>
                  )}
                  <span>{article.date}</span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-text-tertiary mb-4" />
            <h3 className="text-lg font-medium text-text-secondary mb-2">暂无内容</h3>
            <p className="text-body-sm text-text-tertiary mb-4">
              输入关键词，点击"搜索"获取脉脉相关讨论
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function generateFallbackData(keyword: string): MaimaiArticle[] {
  const templates = [
    { title: `${keyword}话题在脉脉持续发酵，你怎么看？`, snippet: `脉脉上关于${keyword}的讨论越来越热，有用户分享了深度分析帖，引发大量跟帖讨论职场人的真实困境和应对策略。` },
    { title: `聊聊${keyword}对职场人的影响`, snippet: `一位资深职场人在脉脉发帖分享了自己对${keyword}趋势的观察，从行业变化到个人职业规划，引发广泛共鸣。` },
    { title: `${keyword}趋势下，哪些岗位正在消失？`, snippet: `脉脉用户整理了一份受${keyword}冲击最大的岗位清单，并给出了转型建议，收藏量过万。` },
    { title: `亲身经历：${keyword}时代如何提升竞争力`, snippet: `从被裁到转型成功，一位脉脉用户分享了自己的真实经历和心路历程，干货满满。` },
    { title: `大家都在聊${keyword}，我来说说我的观察`, snippet: `结合身边案例，深度分析${keyword}对不同行业、不同年龄段职场人的差异化影响。` },
  ];
  return templates.map((t, i) => ({
    id: `demo-${Date.now()}-${i}`,
    title: t.title,
    url: `https://maimai.cn/search?keyword=${encodeURIComponent(keyword)}`,
    content: t.snippet,
    date: new Date().toISOString().split('T')[0],
    tags: [keyword, '脉脉', '职场'],
    views: Math.floor(Math.random() * 50000) + 1000,
  }));
}
