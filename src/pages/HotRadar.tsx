import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { RefreshCw, ExternalLink, TrendingUp, Sparkles } from 'lucide-react';

const platforms = [
  { id: 'all', label: '综合热榜', color: 'from-purple-500 to-pink-500' },
  { id: '微博', label: '微博', color: 'from-red-500 to-orange-500' },
  { id: '抖音', label: '抖音', color: 'from-cyan-500 to-blue-500' },
  { id: '知乎', label: '知乎', color: 'from-blue-500 to-indigo-500' },
  { id: 'B站', label: 'B站', color: 'from-pink-500 to-red-500' },
  { id: '掘金', label: '掘金', color: 'from-green-500 to-emerald-500' },
];

const platformTypeMap: Record<string, string> = {
  '微博': 'weibo',
  '抖音': 'douyin',
  '知乎': 'zhihu',
  'B站': 'bilibili',
  '掘金': 'juejin',
};

const platformColors: Record<string, string> = {
  '微博': 'bg-red-500',
  '抖音': 'bg-cyan-500',
  '知乎': 'bg-blue-500',
  'B站': 'bg-pink-500',
  '掘金': 'bg-green-500',
  '小红书': 'bg-orange-500',
};

interface HotItem {
  rank: number;
  title: string;
  platform: string;
  heatScore: number;
  url?: string;
}

const mockHotList: HotItem[] = [
  { rank: 1, title: 'AI 大模型应用落地实践分享', platform: '知乎', heatScore: 985000 },
  { rank: 2, title: '2024 年最火的 10 个技术趋势', platform: '微博', heatScore: 920000 },
  { rank: 3, title: '内容创作者如何高效利用 AI 工具', platform: '抖音', heatScore: 870000 },
  { rank: 4, title: '小红书爆款标题公式拆解', platform: '小红书', heatScore: 810000 },
  { rank: 5, title: 'B 站百万播放视频的核心密码', platform: 'B站', heatScore: 760000 },
  { rank: 6, title: '微博热搜背后的传播逻辑', platform: '微博', heatScore: 720000 },
  { rank: 7, title: '如何用 AI 快速完成一篇深度文章', platform: '知乎', heatScore: 680000 },
  { rank: 8, title: '短视频运营的黄金法则', platform: '抖音', heatScore: 650000 },
  { rank: 9, title: 'ChatGPT 插件生态爆发', platform: '知乎', heatScore: 620000 },
  { rank: 10, title: '直播带货新玩法揭秘', platform: '抖音', heatScore: 580000 },
  { rank: 11, title: '私域流量运营实战指南', platform: '小红书', heatScore: 550000 },
  { rank: 12, title: '知识付费产品设计技巧', platform: '知乎', heatScore: 520000 },
  { rank: 13, title: '短视频脚本创作方法论', platform: '抖音', heatScore: 490000 },
  { rank: 14, title: 'B站UP主成长之路', platform: 'B站', heatScore: 460000 },
  { rank: 15, title: '社交媒体算法解密', platform: '微博', heatScore: 430000 },
];

export function HotRadar() {
  const { 
    isConnected,
    hotList, 
    setHotList,
    selectedPlatform, 
    setSelectedPlatform,
    isLoadingHotList, 
    setLoadingHotList,
    setSelectedTopic,
    setActivePage,
    showToast,
  } = useAppStore();

  const [displayCount, setDisplayCount] = useState(15);
  const [pulseRefresh, setPulseRefresh] = useState(false);

  useEffect(() => {
    if (hotList.length === 0) {
      const savedHotList = localStorage.getItem('savedHotList');
      if (savedHotList) {
        try {
          setHotList(JSON.parse(savedHotList));
          return;
        } catch {
          // 解析失败，使用模拟数据
        }
      }
      setHotList(mockHotList as any);
    }
  }, []);

  const formatHeatScore = (score: number): string => {
    if (score >= 10000) {
      return (score / 10000).toFixed(1) + '万';
    }
    return score.toString();
  };

  const parseItem = (item: any, index: number, platform: string): HotItem => {
    return {
      rank: item.rank || item.index || index + 1,
      title: item.title || item.topic || item.name || item.text || item.content || '',
      platform: item.platform || item.source || platform,
      heatScore: parseHeatValue(item),
      url: item.url || item.link || item.href || undefined,
    };
  };

  const parseHeatValue = (item: any): number => {
    const heatFields = ['hot_value', 'heatValue', 'heat', 'hotScore', 'score', 'value', 'hot', 'index'];
    for (const field of heatFields) {
      if (item[field] !== undefined) {
        const val = typeof item[field] === 'number' ? item[field] : parseInt(item[field]);
        if (!isNaN(val)) return val;
      }
    }
    return Math.floor(Math.random() * 500000) + 500000;
  };

  const findObjectArray = (obj: any): any[] | null => {
    if (typeof obj !== 'object' || obj === null) return null;
    
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && obj[key].length > 0) {
        const firstItem = obj[key][0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          if (firstItem.title || firstItem.topic || firstItem.name) {
            return obj[key];
          }
        }
      }
    }
    return null;
  };

  const parseHotList = (content: string): HotItem[] => {
    const platform = selectedPlatform === 'all' ? '综合' : selectedPlatform;
    
    try {
      const parsed = JSON.parse(content);
      
      // 方法1：直接返回数组
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, index: number) => parseItem(item, index, platform));
      }
      
      // 方法2：查找常见的数组字段
      const arrayFields = ['items', 'data', 'hotList', 'list', 'result', 'content', 'topics', 'trends'];
      for (const field of arrayFields) {
        if (parsed[field] && Array.isArray(parsed[field])) {
          return parsed[field].map((item: any, index: number) => parseItem(item, index, platform));
        }
      }
      
      // 方法3：查找嵌套的对象数组
      const objectArray = findObjectArray(parsed);
      if (objectArray) {
        return objectArray.map((item: any, index: number) => parseItem(item, index, platform));
      }
    } catch {
      // 不是 JSON，尝试解析文本格式
    }

    const lines = content.split('\n');
    const result: HotItem[] = [];
    
    const parseHeatScore = (heatStr: string): number => {
      heatStr = heatStr.trim();
      
      const millionMatch = heatStr.match(/(\d+(?:\.\d+)?)\s*万/);
      if (millionMatch) {
        return parseFloat(millionMatch[1]) * 10000;
      }
      
      const playMatch = heatStr.match(/(\d+)\s*播放/);
      if (playMatch) {
        return parseInt(playMatch[1]);
      }
      
      const numMatch = heatStr.match(/(\d+)/);
      if (numMatch) {
        return parseInt(numMatch[1]);
      }
      
      return 0;
    };

    for (const line of lines) {
      const matchWithUrl = line.match(/^(?:\d+\.\s*)?(.+?)\s*——\s*来自(\S+)(?:热榜|热点)\s*\|\s*热度:\s*([^\|]+)\s*\|\s*`?(https?:\/\/\S+)`?/);
      if (matchWithUrl) {
        result.push({
          rank: result.length + 1,
          title: matchWithUrl[1].trim(),
          platform: matchWithUrl[2],
          heatScore: parseHeatScore(matchWithUrl[3]),
          url: matchWithUrl[4],
        });
        continue;
      }

      const matchSimple = line.match(/^(\d+)\.\s*(.+?)\s*——\s*来自(\S+)(?:热榜|热点)/);
      if (matchSimple) {
        result.push({
          rank: parseInt(matchSimple[1]),
          title: matchSimple[2].trim(),
          platform: matchSimple[3],
          heatScore: Math.floor(Math.random() * 500000) + 500000,
        });
        continue;
      }

      const matchNoNum = line.match(/^(?:\d+\.\s*)?(.+?)\s*——\s*来自(\S+)(?:热榜|热点)/);
      if (matchNoNum && !line.includes('🔍') && !line.includes('🔥') && !line.includes('📌') && !line.includes('可选角度')) {
        result.push({
          rank: result.length + 1,
          title: matchNoNum[1].trim(),
          platform: matchNoNum[2],
          heatScore: Math.floor(Math.random() * 500000) + 500000,
        });
      }
    }
    
    return result;
  };

  const parseHeatItemValue = (val: string | number): number => {
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    const wanMatch = str.match(/^(\d+(?:\.\d+)?)\s*万/);
    if (wanMatch) return parseFloat(wanMatch[1]) * 10000;
    const numMatch = str.match(/^(\d+)/);
    if (numMatch) return parseInt(numMatch[1], 10);
    return 0;
  };

  const handleFetchHotList = async () => {
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }

    setLoadingHotList(true);
    try {
      let parsedList: any[];

      if (selectedPlatform === 'all') {
        const platformTypes = Object.entries(platformTypeMap);
        const results = await Promise.allSettled(
          platformTypes.map(async ([label, type]) => {
            const url = `https://uapis.cn/api/v1/misc/hotboard?type=${type}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${label}`);
            const data = await res.json();
            const items = data?.list || [];
            return items.map((item: any, index: number) => ({
              rank: index + 1,
              title: item.title || '',
              platform: label,
              heatScore: parseHeatItemValue(item.hot_value),
              url: item.url || '',
            }));
          })
        );
        parsedList = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            parsedList.push(...result.value);
          }
        }
        parsedList.sort((a: any, b: any) => b.heatScore - a.heatScore);
        parsedList = parsedList.slice(0, 15);
      } else {
        const type = platformTypeMap[selectedPlatform];
        if (!type) {
          showToast('不支持的平台', 'error');
          setLoadingHotList(false);
          return;
        }

        const url = `https://uapis.cn/api/v1/misc/hotboard?type=${type}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const items = data?.list || [];
        parsedList = items.map((item: any, index: number) => ({
          rank: index + 1,
          title: item.title || '',
          platform: selectedPlatform,
          heatScore: parseHeatItemValue(item.hot_value),
          url: item.url || '',
        }));
      }

      if (parsedList.length > 0) {
        setHotList(parsedList as any);
        setDisplayCount(Math.min(15, parsedList.length));
        localStorage.setItem('savedHotList', JSON.stringify(parsedList));
        showToast(`成功获取 ${parsedList.length} 条热榜数据`);
      } else {
        showToast('未获取到热榜数据', 'info');
      }
    } catch (error: any) {
      console.error('获取热榜失败:', error);
      showToast('获取热榜失败', 'error');
    } finally {
      setLoadingHotList(false);
    }
  };

  const handleSelectTopic = (title: string) => {
    setSelectedTopic(title);
    setActivePage('forge');
  };

  const handlePlatformClick = (platformId: string) => {
    setSelectedPlatform(platformId);
    if (platformId !== 'all') {
      setPulseRefresh(true);
      setTimeout(() => setPulseRefresh(false), 4000);
    }
  };

  const handleViewMore = () => {
    setDisplayCount(prev => Math.min(prev + 15, hotList.length));
  };

  const displayedList = hotList.slice(0, displayCount);
  const hasMore = displayCount < hotList.length;

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* 头部统计 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-gray-400">今日热榜</span>
          </div>
          <div className="text-2xl font-bold text-white">{hotList.length}</div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">最高热度</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {hotList.length > 0 ? formatHeatScore(hotList[0]?.heatScore || 0) : '-'}
          </div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 bg-blue-500 rounded-full" />
            <span className="text-sm text-gray-400">微博</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {hotList.filter(h => h.platform === '微博').length}
          </div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 bg-cyan-500 rounded-full" />
            <span className="text-sm text-gray-400">抖音</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {hotList.filter(h => h.platform === '抖音').length}
          </div>
        </div>
      </div>

      {/* 平台选择 */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handlePlatformClick(platform.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedPlatform === platform.id
                ? `bg-gradient-to-r ${platform.color} text-white shadow-lg`
                : 'bg-card text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {platform.label}
          </button>
        ))}
        <button
          onClick={handleFetchHotList}
          disabled={isLoadingHotList}
          className={`ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-orange-500 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
            pulseRefresh ? 'animate-pulse shadow-lg shadow-accent/50 scale-105' : 'hover:opacity-90'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingHotList ? 'animate-spin' : ''}`} />
          {selectedPlatform === 'all' ? '刷新热榜' : `获取${platforms.find(p => p.id === selectedPlatform)?.label || ''}热榜`}
        </button>
      </div>

      {/* 热榜列表 */}
      <div className="space-y-3">
        {displayedList.map((item) => {
          const isTop3 = item.rank <= 3;
          
          return (
            <div
              key={`${item.rank}-${item.title}`}
              className={`group flex items-center gap-4 p-4 bg-card border border-gray-800 rounded-xl cursor-pointer transition-all hover:-translate-x-1 hover:shadow-lg hover:border-gray-600 ${
                isTop3 ? 'bg-gradient-to-r from-gray-800/50 to-transparent' : ''
              }`}
              onClick={() => handleSelectTopic(item.title)}
            >
              {/* 排名 */}
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg ${
                item.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                item.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' :
                item.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                'bg-gray-700 text-gray-400'
              }`}>
                {item.rank}
              </div>

              {/* 标题 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-100 font-medium truncate group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    platformColors[item.platform] || 'bg-gray-600'
                  } text-white`}>
                    {item.platform}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {formatHeatScore(item.heatScore)}
                  </span>
                </div>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleViewMore}
            className="px-6 py-2 bg-card border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            查看更多 ({hotList.length - displayCount} 条)
          </button>
        </div>
      )}
    </div>
  );
}
