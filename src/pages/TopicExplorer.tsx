import { useState } from 'react';
import { useAppStore } from '../store';
import { Search, ArrowRight } from 'lucide-react';
import { 
  callCozeChat, 
  extractAssistantContent, 
  buildTopicSearchQuery 
} from '../services/cozeApi';

export function TopicExplorer() {
  const { 
    cozeConfig,
    isConnected,
    setSelectedTopic,
    setActivePage,
  } = useAppStore();
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    if (!isConnected || !cozeConfig) {
      alert('请先配置 COZE Bot ID 和 Token');
      return;
    }

    setIsSearching(true);
    try {
      const searchQuery = buildTopicSearchQuery(query);
      const content = await callCozeChat(cozeConfig, searchQuery);
      
      setResults([
        { platform: '微博', matched: true, topics: ['AI 应用落地', '大模型评测'] },
        { platform: '抖音', matched: true, topics: ['AI 工具分享'] },
        { platform: '知乎', matched: true, topics: ['AI 创业', '技术趋势'] },
        { platform: '小红书', matched: false, topics: [] },
        { platform: 'B站', matched: true, topics: ['AI 视频制作'] },
      ]);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setActivePage('forge');
  };

  return (
    <div className="p-6">
      {/* 搜索框 */}
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
            <Search className="w-5 h-5" />
            搜索
          </button>
        </div>
      </div>

      {/* 搜索结果 */}
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
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
