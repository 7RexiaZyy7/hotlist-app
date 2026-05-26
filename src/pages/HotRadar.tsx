import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { RefreshCw, ExternalLink, TrendingUp, Sparkles, Crown, Zap } from 'lucide-react';
import { callCozeChat, buildHotListQuery } from '../services/cozeApi';
import { LoadingState, EmptyState } from '../components/LoadingState';

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
    setSelectedAngles,
    setActivePage,
    showToast,
  } = useAppStore();

  const [displayCount, setDisplayCount] = useState(15);
  const [pulseRefresh, setPulseRefresh] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (hotList.length === 0) {
      const savedHotList = localStorage.getItem('savedHotList');
      if (savedHotList) {
        try {
          setHotList(JSON.parse(savedHotList));
          return;
        } catch {}
      }
      setHotList(mockHotList as any);
    }
  }, []);

  const formatHeatScore = (score: number): string => {
    if (score >= 10000) return (score / 10000).toFixed(1) + '万';
    return score.toString();
  };

  const parseItem = (item: any, index: number, platform: string): HotItem => ({
    rank: item.rank || item.index || index + 1,
    title: item.title || item.topic || item.name || item.text || item.content || '',
    platform: item.platform || item.source || platform,
    heatScore: parseHeatValue(item),
    url: item.url || item.link || item.href || undefined,
  });

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
          if (firstItem.title || firstItem.topic || firstItem.name) return obj[key];
        }
      }
    }
    return null;
  };

  const parseHotList = (content: string): HotItem[] => {
    const platform = selectedPlatform === 'all' ? '综合' : selectedPlatform;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.map((item: any, index: number) => parseItem(item, index, platform));
      const arrayFields = ['items', 'data', 'hotList', 'list', 'result', 'content', 'topics', 'trends'];
      for (const field of arrayFields) {
        if (parsed[field] && Array.isArray(parsed[field])) return parsed[field].map((item: any, index: number) => parseItem(item, index, platform));
      }
      const objectArray = findObjectArray(parsed);
      if (objectArray) return objectArray.map((item: any, index: number) => parseItem(item, index, platform));
    } catch {}

    const lines = content.split('\n');
    const result: HotItem[] = [];
    const parseHeatScore = (heatStr: string): number => {
      heatStr = heatStr.trim();
      const millionMatch = heatStr.match(/(\d+(?:\.\d+)?)\s*万/);
      if (millionMatch) return parseFloat(millionMatch[1]) * 10000;
      const playMatch = heatStr.match(/(\d+)\s*播放/);
      if (playMatch) return parseInt(playMatch[1]);
      const numMatch = heatStr.match(/(\d+)/);
      if (numMatch) return parseInt(numMatch[1]);
      return 0;
    };

    for (const line of lines) {
      const matchWithUrl = line.match(/^(?:\d+\.\s*)?(.+?)\s*——\s*来自(\S+)(?:热榜|热点)\s*\|\s*热度:\s*([^\|]+)\s*\|\s*`?(https?:\/\/\S+)`?/);
      if (matchWithUrl) { result.push({ rank: result.length + 1, title: matchWithUrl[1].trim(), platform: matchWithUrl[2], heatScore: parseHeatScore(matchWithUrl[3]), url: matchWithUrl[4] }); continue; }
      const matchSimple = line.match(/^(\d+)\.\s*(.+?)\s*——\s*来自(\S+)(?:热榜|热点)/);
      if (matchSimple) { result.push({ rank: parseInt(matchSimple[1]), title: matchSimple[2].trim(), platform: matchSimple[3], heatScore: Math.floor(Math.random() * 500000) + 500000 }); continue; }
      const matchNoNum = line.match(/^(?:\d+\.\s*)?(.+?)\s*——\s*来自(\S+)(?:热榜|热点)/);
      if (matchNoNum && !line.includes('🔍') && !line.includes('🔥') && !line.includes('📌') && !line.includes('可选角度')) { result.push({ rank: result.length + 1, title: matchNoNum[1].trim(), platform: matchNoNum[2], heatScore: Math.floor(Math.random() * 500000) + 500000 }); continue; }
      const matchPlainNum = line.match(/^(\d+)\.\s*(.+)$/);
      if (matchPlainNum && !line.includes('🔍') && !line.includes('🔥') && !line.includes('📌') && !line.includes('可选角度') && !line.includes('选用框架') && !line.includes('切入逻辑') && !line.includes('▎') && !line.includes('**')) {
        const title = matchPlainNum[2].trim();
        if (title.length > 2 && title.length < 100) result.push({ rank: parseInt(matchPlainNum[1]), title, platform, heatScore: Math.floor(Math.random() * 500000) + 500000 });
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
    if (!isConnected) { showToast('API 代理未连接', 'error'); return; }
    setLoadingHotList(true);
    setLoadingStep(0);
    const stepTimer = setInterval(() => setLoadingStep(s => Math.min(s + 1, 2)), 8000);
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setLoadingHotList(false); clearInterval(stepTimer); return; }
      setLoadingStep(1);
      let parsedList: any[];
      if (selectedPlatform === 'all') {
        const query = buildHotListQuery(selectedPlatform);
        const content = await callCozeChat(query);
        parsedList = parseHotList(content);
      } else {
        const type = platformTypeMap[selectedPlatform];
        if (!type) { showToast('不支持的平台', 'error'); setLoadingHotList(false); clearInterval(stepTimer); return; }
        const url = `https://uapis.cn/api/v1/misc/hotboard?type=${type}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = data?.list || [];
        parsedList = items.map((item: any, index: number) => ({
          rank: index + 1, title: item.title || '', platform: selectedPlatform,
          heatScore: parseHeatItemValue(item.hot_value), url: item.url || '',
        }));
      }
      setLoadingStep(2);
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
      clearInterval(stepTimer);
    }
  };

  const handleSelectTopic = (title: string) => {
    setSelectedTopic(title);
    const recommended = (() => {
      const t = title.toLowerCase();
      if (/情感|恋爱|关系|婚姻/.test(t)) return ['共鸣型', '替用户说话型', '观点型'];
      if (/赚钱|副业|投资|理财/.test(t)) return ['实用型', '填补盲区型', '关联型'];
      if (/科技|AI|数码|产品/.test(t)) return ['知识型', '填补盲区型', '关联型'];
      if (/职场|成长|学习|自律/.test(t)) return ['实用型', '共鸣型', '决策纠结型'];
      return ['共鸣型', '实用型', '观点型'];
    })();
    setSelectedAngles(recommended);
    setActivePage('forge');
  };

  const handlePlatformClick = (platformId: string) => {
    setSelectedPlatform(platformId);
    if (platformId !== 'all') {
      setPulseRefresh(true);
      setTimeout(() => setPulseRefresh(false), 4000);
    }
  };

  const handleViewMore = () => setDisplayCount(prev => Math.min(prev + 15, hotList.length));

  const displayedList = hotList.slice(0, displayCount);
  const hasMore = displayCount < hotList.length;
  const top3 = displayedList.slice(0, 3);
  const restList = displayedList.slice(3);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-accent" /><span className="text-sm text-gray-400">今日热榜</span></div>
          <div className="text-2xl font-bold text-white">{hotList.length}</div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-sm text-gray-400">最高热度</span></div>
          <div className="text-2xl font-bold text-green-400">{hotList.length > 0 ? formatHeatScore(hotList[0]?.heatScore || 0) : '-'}</div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="w-4 h-4 bg-red-500 rounded-full" /><span className="text-sm text-gray-400">微博</span></div>
          <div className="text-2xl font-bold text-blue-400">{hotList.filter(h => h.platform === '微博').length}</div>
        </div>
        <div className="bg-card border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="w-4 h-4 bg-cyan-500 rounded-full" /><span className="text-sm text-gray-400">抖音</span></div>
          <div className="text-2xl font-bold text-cyan-400">{hotList.filter(h => h.platform === '抖音').length}</div>
        </div>
      </div>

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

      {isLoadingHotList && (
        <LoadingState
          steps={['正在获取热榜数据', '正在分析热点趋势', '正在整理排行']}
          currentStep={loadingStep}
        />
      )}

      {!isLoadingHotList && top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {top3.map((item, i) => {
            const gradients = [
              'from-amber-500/20 via-yellow-500/10 to-orange-500/5',
              'from-gray-400/15 via-gray-300/5 to-gray-500/5',
              'from-orange-700/15 via-amber-600/5 to-orange-800/5',
            ];
            const rankColors = [
              'from-yellow-400 to-orange-500',
              'from-gray-300 to-gray-400',
              'from-amber-600 to-amber-700',
            ];
            return (
              <div
                key={`top-${item.rank}-${item.title}`}
                className={`group relative bg-gradient-to-br ${gradients[i]} border border-gray-700/50 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/10`}
                onClick={() => handleSelectTopic(item.title)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br ${rankColors[i]} text-white font-bold text-sm`}>
                    {i === 0 ? <Crown className="w-4 h-4" /> : item.rank}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${platformColors[item.platform] || 'bg-gray-600'} text-white`}>
                    {item.platform}
                  </span>
                </div>
                <h3 className="text-gray-100 font-semibold text-base leading-snug mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {formatHeatScore(item.heatScore)}
                  </span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-accent transition-colors" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoadingHotList && restList.length > 0 && (
        <div className="space-y-2">
          {restList.map((item) => (
            <div
              key={`${item.rank}-${item.title}`}
              className="group flex items-center gap-4 p-3 bg-card border border-gray-800 rounded-xl cursor-pointer transition-all hover:-translate-x-1 hover:shadow-lg hover:border-gray-600"
              onClick={() => handleSelectTopic(item.title)}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-700 text-gray-400`}>
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-200 text-sm font-medium truncate group-hover:text-accent transition-colors">{item.title}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platformColors[item.platform] || 'bg-gray-600'} text-white`}>{item.platform}</span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{formatHeatScore(item.heatScore)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-accent transition-colors" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoadingHotList && hasMore && (
        <div className="mt-6 flex justify-center">
          <button onClick={handleViewMore} className="px-6 py-2 bg-card border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
            查看更多 ({hotList.length - displayCount} 条)
          </button>
        </div>
      )}
    </div>
  );
}
