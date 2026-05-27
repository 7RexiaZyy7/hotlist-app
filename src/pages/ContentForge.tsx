import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Sparkles, Copy, Check, Wand2, MessageSquare, Clock, Type, ArrowRight, RotateCcw } from 'lucide-react';
import { callCozeChat, buildCopyGenerateQuery } from '../services/cozeApi';
import { LoadingState, EmptyState } from '../components/LoadingState';

const copyAngles = [
  { id: '共鸣型', label: '共鸣型', desc: '唤起情感共鸣', color: 'from-purple-500 to-pink-500' },
  { id: '知识型', label: '知识型', desc: '传递有价值信息', color: 'from-blue-500 to-cyan-500' },
  { id: '观点型', label: '观点型', desc: '表达鲜明态度', color: 'from-orange-500 to-red-500' },
  { id: '趣味型', label: '趣味型', desc: '轻松幽默风格', color: 'from-green-500 to-emerald-500' },
  { id: '实用型', label: '实用型', desc: '提供具体方法', color: 'from-indigo-500 to-purple-500' },
  { id: '关联型', label: '关联型', desc: '跨界联想组合', color: 'from-teal-500 to-cyan-500' },
  { id: '决策纠结型', label: '决策纠结型', desc: '引发选择焦虑', color: 'from-rose-500 to-pink-500' },
  { id: '问题背后原因型', label: '问题原因型', desc: '深挖问题本质', color: 'from-amber-500 to-orange-500' },
  { id: '填补盲区型', label: '填补盲区型', desc: '揭示认知盲区', color: 'from-violet-500 to-purple-500' },
  { id: '替用户说话型', label: '替用户说话', desc: '表达用户心声', color: 'from-sky-500 to-blue-500' },
  { id: '行业发心型', label: '行业发心型', desc: '传递行业使命感', color: 'from-emerald-500 to-teal-500' },
];

const topicAngleMap: Record<string, string[]> = {
  default: ['共鸣型', '实用型', '观点型'],
};

const platformFormats = [
  { id: '小红书', label: '小红书版', icon: '📕', desc: 'emoji标题+分段+标签' },
  { id: '抖音', label: '抖音脚本', icon: '🎬', desc: '画面+口播+BGM' },
  { id: '公众号', label: '公众号版', icon: '📰', desc: '深度长文格式' },
  { id: '微博', label: '微博版', icon: '💬', desc: '短平快+话题标签' },
];

function splitByAngles(content: string, angles: string[]): { angle: string; content: string }[] {
  const results: { angle: string; content: string }[] = [];
  let remaining = content;

  for (const angle of angles) {
    const regex = new RegExp(`(?:【${angle}】|#+\\s*${angle}|\\d+\\.\\s*${angle})`, 'i');
    const match = remaining.match(regex);
    if (match) {
      const startIdx = match.index!;
      const nextAngle = angles.find((a, i) => {
        if (a === angle) return false;
        const nextRegex = new RegExp(`(?:【${a}】|#+\\s*${a}|\\d+\\.\\s*${a})`, 'i');
        const nextMatch = remaining.slice(startIdx + match[0].length).match(nextRegex);
        return nextMatch;
      });

      let sectionEnd = remaining.length;
      if (nextAngle) {
        const nextRegex = new RegExp(`(?:【${nextAngle}】|#+\\s*${nextAngle}|\\d+\\.\\s*${nextAngle})`, 'i');
        const nextMatch = remaining.slice(startIdx + match[0].length).match(nextRegex);
        if (nextMatch) {
          sectionEnd = startIdx + match[0].length + nextMatch.index!;
        }
      }

      results.push({
        angle,
        content: remaining.slice(startIdx + match[0].length, sectionEnd).trim(),
      });
      remaining = remaining.slice(0, startIdx) + remaining.slice(sectionEnd);
    }
  }

  if (results.length === 0 && content.trim()) {
    return angles.map(angle => ({ angle, content }));
  }

  return results;
}

function estimateReadingTime(text: string): string {
  const chars = text.length;
  const minutes = Math.max(1, Math.ceil(chars / 500));
  return `${minutes}分钟`;
}

function countWords(text: string): number {
  return text.replace(/\s/g, '').length;
}

interface HistoryItem {
  topic: string;
  angles: string[];
  copies: { angle: string; content: string }[];
  timestamp: number;
}

function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem('copy_history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(item: HistoryItem) {
  const history = getHistory();
  history.unshift(item);
  if (history.length > 10) history.length = 10;
  localStorage.setItem('copy_history', JSON.stringify(history));
}

export function ContentForge() {
  const {
    isConnected,
    selectedTopic,
    setSelectedTopic,
    selectedAngles,
    setSelectedAngles,
    generatedCopies,
    setGeneratedCopies,
    isGenerating,
    setGenerating,
    userProfile,
    incrementCopies,
    showToast,
    setActivePage,
  } = useAppStore();

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [convertingPlatform, setConvertingPlatform] = useState<string | null>(null);
  const [convertedCopies, setConvertedCopies] = useState<Record<string, { angle: string; content: string }[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiesAnimation, setCopiesAnimation] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const recommendedAngles = (() => {
    const topic = selectedTopic.toLowerCase();
    if (/情感|恋爱|关系|婚姻/.test(topic)) return ['共鸣型', '替用户说话型', '观点型'];
    if (/赚钱|副业|投资|理财/.test(topic)) return ['实用型', '填补盲区型', '关联型'];
    if (/科技|AI|数码|产品/.test(topic)) return ['知识型', '填补盲区型', '关联型'];
    if (/职场|成长|学习|自律/.test(topic)) return ['实用型', '共鸣型', '决策纠结型'];
    if (/美食|旅行|生活|穿搭/.test(topic)) return ['趣味型', '共鸣型', '实用型'];
    return topicAngleMap.default;
  })();

  const handleToggleAngle = (angle: string) => {
    setSelectedAngles(
      selectedAngles.includes(angle)
        ? selectedAngles.filter((a) => a !== angle)
        : [...selectedAngles, angle]
    );
  };

  const handleUseRecommended = () => {
    setSelectedAngles(recommendedAngles);
  };

  const handleGenerate = async () => {
    if (!selectedTopic.trim()) {
      showToast('请先选择或输入一个话题', 'info');
      return;
    }
    if (selectedAngles.length === 0) {
      showToast('请至少选择一种文案角度', 'info');
      return;
    }
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }

    setGenerating(true);
    setConvertedCopies({});
    setLoadingStep(0);
    const stepTimer = setInterval(() => setLoadingStep(s => Math.min(s + 1, 2)), 8000);

    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setGenerating(false); clearInterval(stepTimer); return; }

      setLoadingStep(1);
      const query = buildCopyGenerateQuery(selectedTopic, selectedAngles, userProfile);
      const content = await callCozeChat(query);

      setLoadingStep(2);
      const askingInfo = content && /赛道|受众|告诉我|先告诉我/.test(content) && content.length < 300;
      if (askingInfo) {
        setGeneratedCopies([{
          angle: '提示',
          content: 'Bot 需要你的创作档案信息才能生成精准文案。请先去"创作档案"页面填写赛道和受众信息，然后重新生成。',
        }]);
        incrementCopies();
        showToast('请先填写创作档案再生成文案', 'info');
      } else {
        const parsed = splitByAngles(content || '', selectedAngles);
        if (parsed.length > 0) {
          setGeneratedCopies(parsed);
        } else {
          setGeneratedCopies(selectedAngles.map(angle => ({
            angle,
            content: content || '',
          })));
        }
        incrementCopies();
        saveHistory({
          topic: selectedTopic,
          angles: selectedAngles,
          copies: parsed.length > 0 ? parsed : selectedAngles.map(a => ({ angle: a, content: content || '' })),
          timestamp: Date.now(),
        });
        showToast(`已生成 ${selectedAngles.length} 种角度的文案`);
        setCopiesAnimation(true);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => setCopiesAnimation(false), 600);
        }, 100);
      }
    } catch (error) {
      console.error('生成失败:', error);
      showToast(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setGenerating(false);
      clearInterval(stepTimer);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePlatformConvert = async (platform: string) => {
    if (generatedCopies.length === 0) return;
    setConvertingPlatform(platform);
    try {
      const allContent = generatedCopies.map(c => c.content).join('\n\n');
      const query = `请将以下文案改写为${platform}平台最适合的格式和风格，保持核心信息不变：\n\n${allContent}\n\n直接输出改写后的文案，不要问问题。`;
      const result = await callCozeChat(query);
      const parsed = splitByAngles(result || '', generatedCopies.map(c => c.angle));
      setConvertedCopies(prev => ({
        ...prev,
        [platform]: parsed.length > 0 ? parsed : generatedCopies.map(c => ({ angle: c.angle, content: result || '' })),
      }));
      showToast(`已转换为${platform}版`);
    } catch {
      showToast('格式转换失败', 'error');
    } finally {
      setConvertingPlatform(null);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setSelectedTopic(item.topic);
    setSelectedAngles(item.angles);
    setGeneratedCopies(item.copies);
    setConvertedCopies({});
    setShowHistory(false);
  };

  const history = getHistory();

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">当前话题</label>
          <input
            type="text"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full bg-card border border-gray-700 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-accent"
            placeholder="输入或选择一个话题..."
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-gradient-to-r from-accent to-orange-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          {isGenerating ? (
            <Wand2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? '生成中...' : `生成 (${selectedAngles.length})`}
        </button>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2.5 bg-card border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-4 bg-card border border-gray-700 rounded-xl p-3 max-h-40 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">最近生成记录</p>
          {history.map((item, i) => (
            <button
              key={i}
              onClick={() => handleLoadHistory(item)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface transition-colors flex items-center justify-between"
            >
              <span className="text-gray-300 truncate">{item.topic}</span>
              <span className="text-xs text-gray-500 shrink-0 ml-2">{new Date(item.timestamp).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-gray-400">文案角度</label>
          {selectedTopic && (
            <button
              onClick={handleUseRecommended}
              className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              推荐角度
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {copyAngles.map((angle) => {
            const isRecommended = recommendedAngles.includes(angle.id);
            return (
              <button
                key={angle.id}
                onClick={() => handleToggleAngle(angle.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-all flex items-center gap-1 ${
                  selectedAngles.includes(angle.id)
                    ? 'border-accent bg-accent/20 text-accent'
                    : isRecommended
                      ? 'border-accent/30 bg-accent/5 text-accent/60 hover:border-accent/50'
                      : 'border-gray-700 bg-card text-gray-400 hover:border-gray-500'
                }`}
              >
                {angle.label}
                {isRecommended && !selectedAngles.includes(angle.id) && (
                  <Sparkles className="w-3 h-3 text-accent/40" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isGenerating && (
        <LoadingState
          steps={['正在分析话题和角度', '正在调用 AI 生成文案', '正在整理输出结果']}
          currentStep={loadingStep}
        />
      )}

      {!isGenerating && generatedCopies.length > 0 && (
        <div ref={resultsRef} className={`flex-1 overflow-y-auto transition-all duration-500 ${copiesAnimation ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5">
              {platformFormats.map((pf) => (
                <button
                  key={pf.id}
                  onClick={() => handlePlatformConvert(pf.id)}
                  disabled={!!convertingPlatform}
                  className="px-2.5 py-1 rounded-lg bg-card border border-gray-700 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <span>{pf.icon}</span>
                  {convertingPlatform === pf.id ? '...' : pf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {generatedCopies.map((copy, index) => {
              const angleConfig = copyAngles.find((a) => a.id === copy.angle);
              const wordCount = countWords(copy.content);
              const readTime = estimateReadingTime(copy.content);
              const convertedContent = convertedCopies['小红书']?.[index]?.content || convertedCopies['抖音']?.[index]?.content || convertedCopies['公众号']?.[index]?.content || convertedCopies['微博']?.[index]?.content;
              const activePlatformConvert = Object.keys(convertedCopies)[0] || null;

              return (
                <div
                  key={index}
                  className="bg-card border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${angleConfig?.color}`} />
                      <span className="font-medium">{copy.angle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Type className="w-3 h-3" />{wordCount}字
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{readTime}
                      </span>
                      <button
                        onClick={() => handleCopy(convertedContent || copy.content, index)}
                        className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                    {activePlatformConvert && convertedContent ? convertedContent : copy.content}
                  </pre>
                  {activePlatformConvert && (
                    <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {platformFormats.find(p => p.id === activePlatformConvert)?.icon} 已转换为{activePlatformConvert}版
                      </span>
                      <button
                        onClick={() => setConvertedCopies({})}
                        className="text-xs text-accent hover:text-accent/80"
                      >
                        查看原文
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isGenerating && generatedCopies.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="w-10 h-10 text-gray-500 opacity-40" />}
          title="选择话题和角度开始创作"
          description="去热榜选个热门话题，或直接输入你想写的方向"
          action={{
            label: '去热榜看看',
            onClick: () => setActivePage('radar'),
          }}
        />
      )}
    </div>
  );
}
