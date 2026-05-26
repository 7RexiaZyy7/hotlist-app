import { useState } from 'react';
import { useAppStore } from '../store';
import { Search, ArrowRight, Hash } from 'lucide-react';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { 
  callCozeChat, 
  buildTopicSearchQuery 
} from '../services/cozeApi';

export function TopicExplorer() {
  const { 
    isConnected,
    setSelectedTopic,
    setActivePage,
    showToast,
    cozeUid,
  } = useAppStore();
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

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

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setActivePage('forge');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">话题勘探</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-card border border-gray-700 rounded-xl px-5 py-3 text-lg focus:outline-none focus:border-accent"
            placeholder="输入你想探索的话题，例如：AI+创业..."
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-gradient-to-r from-accent to-orange-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <Search className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} />
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      {isSearching && (
        <LoadingState steps={['正在搜索相关话题', '正在分析平台数据', '正在整理结果']} currentStep={loadingStep} />
      )}

      {!isSearching && searched && results.length === 0 && (
        <EmptyState icon={<Hash className="w-10 h-10 text-gray-500 opacity-40" />} title="暂无结果" description="试试换个关键词，或者检查 API 连接状态" />
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`bg-card border ${
                result.matched ? 'border-gray-700' : 'border-gray-800 opacity-60'
              } rounded-2xl p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{result.platform}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  result.matched ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-400'
                }`}>
                  {result.matched ? '已命中' : '无结果'}
                </span>
              </div>
              {result.matched && (
                <div className="space-y-2">
                  {result.topics.map((topic: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full text-left px-3 py-2 bg-surface rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      {topic}
                      <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSearching && !searched && (
        <EmptyState icon={<Search className="w-10 h-10 text-gray-500 opacity-40" />} title="搜索你感兴趣的话题" description="看看各大平台上大家都在聊什么" />
      )}
    </div>
  );
}