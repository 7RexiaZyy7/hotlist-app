import { useState } from 'react';
import { useAppStore } from '../store';
import { Search, ArrowRight, Hash, Sparkles } from 'lucide-react';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { 
  callCozeChat, 
  buildTopicSearchQuery,
  buildTopicAnalysisQuery,
} from '../services/cozeApi';

export function TopicExplorer() {
  const { 
    isConnected,
    setSelectedTopic,
    setActivePage,
    showToast,
    savedTopics,
    clearSavedTopics,
    setLastAnalysis,
  } = useAppStore();
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // 结构化分析相关
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{topic: string; analysis: string}[]>([]);

  const parseResults = (content: string): any[] => {
    const lines = content.split('\n').filter(l => l.trim());
    const platforms: any[] = [];
    let currentPlatform: any = null;

    for (const line of lines) {
      const platformMatch = line.match(/^(?:#+\s*)?【?(.+?)】?(?:平台|热榜|话题)?：?$/);
      if (platformMatch) {
        if (currentPlatform) platforms.push(currentPlatform);
        currentPlatform = { platform: platformMatch[1].trim(), matched: false, topics: [] };
        continue;
      }

      const topicMatch = line.match(/^[-*]\s*(.+?)(?:\s*\((\d+)\))?$/);
      if (topicMatch && currentPlatform) {
        currentPlatform.matched = true;
        currentPlatform.topics.push(topicMatch[1].trim());
      } else if (line.includes(':') || line.includes('：')) {
        const [p, ...rest] = line.split(/[：:]/);
        const topicList = rest.join('：').split(/[,，、]/).map(t => t.trim()).filter(Boolean);
        if (topicList.length > 0) {
          platforms.push({ platform: p.trim(), matched: true, topics: topicList });
        }
      }
    }
    if (currentPlatform) platforms.push(currentPlatform);

    return platforms.length > 0 ? platforms : [{
      platform: '搜索结果',
      matched: true,
      topics: content.split('\n').filter(l => l.trim()).slice(0, 10),
    }];
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }

    setIsSearching(true);
    setSearched(true);
    setResults([]);
    setLoadingStep(0);
    const stepTimer = setInterval(() => setLoadingStep(s => Math.min(s + 1, 2)), 8000);
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setIsSearching(false); clearInterval(stepTimer); return; }

      const searchQuery = buildTopicSearchQuery(query);
      const content = await callCozeChat(searchQuery);
      
      if (!content.trim()) {
        showToast('未搜索到相关话题', 'info');
        setResults([]);
        return;
      }

      const parsed = parseResults(content);
      setResults(parsed);
      showToast(`找到 ${parsed.length} 个平台的相关话题`);
    } catch (error) {
      showToast('搜索失败，请稍后重试', 'error');
    } finally {
      setIsSearching(false);
      clearInterval(stepTimer);
    }
  };

  // 分析收藏池的话题
  const handleAnalyzeSaved = async () => {
    if (savedTopics.length === 0) return;
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults([]);
    
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      
      for (const topic of savedTopics) {
        const allowed = await checkAndIncrementQuota();
        if (!allowed) break;

        const query = buildTopicAnalysisQuery(topic.title);
        const analysis = await callCozeChat(query);
        setAnalysisResults(prev => [...prev, { topic: topic.title, analysis }]);
      }
      
      showToast(`${analysisResults.length + savedTopics.length} 个话题分析完成`);
    } catch (error) {
      showToast('分析失败，请稍后重试', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setActivePage('forge');
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1">话题勘探</h2>
        <p className="text-body-sm text-text-secondary">探索各平台热门话题，发现创作灵感</p>
      </div>

      {/* 收藏池提示 */}
      {savedTopics.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-sm font-medium text-accent">
              已收藏 {savedTopics.length} 个话题，来自热榜
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleAnalyzeSaved}
                disabled={isAnalyzing}
                className="btn-primary !py-1.5 !px-3 !text-body-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAnalyzing ? '分析中...' : '结构化分析'}
              </button>
              <button
                onClick={clearSavedTopics}
                className="btn-ghost !py-1.5 !px-3 !text-body-sm text-text-tertiary"
              >
                清空
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {savedTopics.map((item, i) => (
              <span key={i} className="badge">
                {item.title}
                <span className="ml-1 text-text-tertiary">·{item.platform}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 结构化分析结果 */}
      {analysisResults.length > 0 && (
        <div className="mb-6 space-y-4">
          <h3 className="text-body font-semibold text-text-primary">结构化分析结果</h3>
          {analysisResults.map((item, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-body font-medium text-text-primary">{item.topic}</h4>
                <button
                  onClick={() => { setLastAnalysis(item.analysis); handleSelectTopic(item.topic); }}
                  className="btn-primary !py-1 !px-2 !text-caption flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  写文案
                </button>
              </div>
              <div className="text-body-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {item.analysis}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="input-field flex-1"
          placeholder="输入你想探索的话题，例如：AI+创业..."
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="btn-primary"
        >
          <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      {isSearching && (
        <LoadingState steps={['正在搜索相关话题', '正在分析平台数据', '正在整理结果']} currentStep={loadingStep} />
      )}

      {!isSearching && searched && results.length === 0 && (
        <EmptyState icon={<Hash className="w-10 h-10" />} title="暂无结果" description="试试换个关键词，或者检查 API 连接状态" />
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`card p-5 ${!result.matched ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-body font-medium text-text-primary">{result.platform}</span>
                <span className={`badge ${
                  result.matched ? '!text-accent !border-accent' : '!text-text-tertiary'
                }`}>
                  {result.matched ? '已命中' : '无结果'}
                </span>
              </div>
              {result.matched && (
                <div className="space-y-1">
                  {result.topics.map((topic: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full text-left px-3 py-2 rounded-md text-body-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-120 flex items-center justify-between"
                    >
                      <span className="truncate">{topic}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-tertiary shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSearching && !searched && (
        <EmptyState icon={<Search className="w-10 h-10" />} title="搜索你感兴趣的话题" description="看看各大平台上大家都在聊什么" />
      )}
    </div>
  );
}