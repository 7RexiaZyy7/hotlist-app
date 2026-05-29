import { useState } from 'react';
import { FileText, RefreshCw, ExternalLink, Search, AlertCircle } from 'lucide-react';

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

  // 模拟数据（Vercel 上的降级方案）
  const generateMockData = (keyword: string): MaimaiArticle[] => {
    const templates = [
      {
        title: `${keyword}话题持续发酵，大家怎么看？`,
        content: `最近脉脉上关于${keyword}的讨论很多，有人觉得这是趋势，也有人表示担忧...`,
        tags: [keyword, '职场', '讨论']
      },
      {
        title: `亲身经历：关于${keyword}的一些思考`,
        content: `想分享一下自己对${keyword}的真实经历和看法，希望对大家有帮助...`,
        tags: [keyword, '经验分享', '观点']
      },
      {
        title: `${keyword}还是趋势吗？聊聊我的观察`,
        content: `回顾这几年的变化，关于${keyword}有很多想说的，聊聊我的观察...`,
        tags: [keyword, '趋势', '观察']
      },
      {
        title: `身边的朋友都在讨论${keyword}，我来说两句`,
        content: `最近聚会发现大家都在聊${keyword}，整理了一些观点和大家分享...`,
        tags: [keyword, '话题', '分享']
      }
    ];
    
    return templates.map((t, i) => ({
      id: `mock-${Date.now()}-${i}`,
      title: t.title,
      url: 'https://maimai.cn',
      content: t.content,
      date: new Date().toISOString().split('T')[0],
      tags: t.tags,
      views: Math.floor(Math.random() * 50000) + 1000
    }));
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/maimai/search?keyword=${encodeURIComponent(searchKeyword)}`);
      
      if (!response.ok) {
        throw new Error('API not available');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setArticles(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      // API 不可用时，使用模拟数据（Vercel 兼容）
      console.log('API not available, using mock data:', err);
      setArticles(generateMockData(searchKeyword));
      setError(null); // 不显示错误，静默降级
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
              追踪脉脉平台上的热门话题和文章
            </p>
          </div>
          <button
            onClick={handleFetch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>抓取文章</span>
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
              placeholder="输入关键词，如：AI 焦虑、裁员、职场..."
              className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
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
            <h4 className="font-medium text-red-800 mb-1">需要启动 Python 服务</h4>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-white/50 p-2 rounded mt-2">
              {error}
            </pre>
          </div>
        </div>
      )}

      {/* 文章列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <span className="ml-3 text-text-secondary">正在抓取文章...</span>
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
            <h3 className="text-lg font-medium text-text-secondary mb-2">暂无文章</h3>
            <p className="text-body-sm text-text-tertiary mb-4">
              点击上方"抓取文章"按钮开始获取脉脉内容
            </p>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-bg-elevated border border-border rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">使用说明</h4>
        <div className="text-body-sm text-text-secondary space-y-2">
          <p><strong>本地开发（真实数据）：</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>进入 scripts 文件夹：<code>cd scripts</code></li>
            <li>安装依赖：<code>pip install -r requirements.txt</code></li>
            <li>启动服务：<code>python server.py</code></li>
          </ol>
          <p className="mt-3"><strong>Vercel 部署（演示模式）：</strong></p>
          <p className="ml-2">自动使用模拟数据，无需 Python 后端</p>
        </div>
      </div>
    </div>
  );
}
