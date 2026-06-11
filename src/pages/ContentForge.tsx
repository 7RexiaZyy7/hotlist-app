import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { callCozeChat, buildCopyGenerateQuery, buildDeconstructQuery, buildRewriteQuery, buildInspirationPrompt, checkUserQuota, incrementUserQuota, getUserVariables, getUserProfileFromStorage, formatProfileForPrompt } from '../services/cozeApi';
import { loadAnalysisHistory } from '../store';
import { Sparkles, Copy, Check, RefreshCw, Wand2, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare, Columns3, X, Star, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';

interface GeneratedCopy {
  angle: string;
  content: string;
}

const angles = [
  { id: 'emotional', label: '情感共鸣', icon: Heart, desc: '触发情绪共鸣，更易转发和评论' },
  { id: 'knowledge', label: '知识科普', icon: BookOpen, desc: '干货拆解 + 通俗解释，建立信任' },
  { id: 'opinion', label: '观点评论', icon: MessageSquare, desc: '鲜明立场 + 论据，引发站队讨论' },
  { id: 'trend', label: '热点追踪', icon: Flame, desc: '借势当前热点，吃流量' },
  { id: 'future', label: '未来趋势', icon: Rocket, desc: '前瞻视角，吸引关注趋势的用户' },
  { id: 'analysis', label: '深度分析', icon: Search, desc: '多角度拆解，凸显专业感' },
  { id: 'funny', label: '趣味解读', icon: Smile, desc: '段子/梗/反讽，病毒传播潜力高' },
  { id: 'story', label: '故事叙述', icon: Book, desc: '真实故事/经历，最强代入感' },
  { id: 'suggestion', label: '实用建议', icon: Lightbulb, desc: '可操作的清单/方法论，收藏率高' },
  { id: 'question', label: '提问互动', icon: HelpCircle, desc: '结尾设问，引导评论' },
  { id: 'comparison', label: '对比分析', icon: GitCompare, desc: 'A vs B 对比，结构清晰易读' },
];

const platformStyles = [
  { id: 'xiaohongshu', label: '小红书版', description: '适合小红书平台风格' },
  { id: 'douyin', label: '抖音脚本', description: '适合抖音短视频' },
  { id: 'gongzhonghao', label: '公众号版', description: '适合公众号文章' },
  { id: 'weibo', label: '微博版', description: '适合微博短文案' },
];

export function ContentForge() {
  const { selectedTopic, setSelectedTopic, selectedAngles, setSelectedAngles, lastAnalysis, setLastAnalysis, setGenerating, isGenerating, generatedCopies, setGeneratedCopies, setShowQuotaModal, showToast, userProfile, setActivePage, checkAndIncrementQuota } = useAppStore();
  type ForgeMode = 'create' | 'deconstruct' | 'rewrite';
  const [forgeMode, setForgeMode] = useState<ForgeMode>('create');
  const [rewriteSource, setRewriteSource] = useState('');
  const [deconstructResult, setDeconstructResult] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [convertingPlatform, setConvertingPlatform] = useState<string | null>(null);
  const [convertedCopies, setConvertedCopies] = useState<Record<string, GeneratedCopy[]>>({});
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisHistory] = useState(() => loadAnalysisHistory());
  const resultsRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('copyHistory') || '[]');
    } catch {
      return [];
    }
  });
  const refreshHistory = () => {
    try {
      setHistory(JSON.parse(localStorage.getItem('copyHistory') || '[]'));
    } catch {}
  };

  // ─── Inspiration panel state ───
  const [inspirationSuggestions, setInspirationSuggestions] = useState<string[]>([]);
  const [isInspirationLoading, setIsInspirationLoading] = useState(false);
  const [inspirationError, setInspirationError] = useState<string | null>(null);
  const [generationHint, setGenerationHint] = useState('');
  const inspirationCacheRef = useRef<Record<string, string[]>>({});

  const [savedCopies, setSavedCopies] = useState<{ content: string; angle: string; topic: string; timestamp: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('savedCopies') || '[]');
    } catch { return []; }
  });

  const saveCopyToStorage = (content: string, angle: string) => {
    setSavedCopies(prev => {
      const existing = prev.find(c => c.content === content);
      if (existing) return prev;
      const updated = [...prev, { content, angle, topic: selectedTopic, timestamp: Date.now() }].slice(0, 50);
      localStorage.setItem('savedCopies', JSON.stringify(updated));
      return updated;
    });
  };

  const unsaveCopy = (content: string) => {
    setSavedCopies(prev => {
      const updated = prev.filter(c => c.content !== content);
      localStorage.setItem('savedCopies', JSON.stringify(updated));
      return updated;
    });
  };

  const isCopySaved = (content: string) => savedCopies.some(c => c.content === content);

  const getInspirationCacheKey = () => {
    const sorted = [...selectedAngles].sort();
    return `${selectedTopic}||${sorted.join(',')}`;
  };

  const handleGetInspiration = async () => {
    if (!selectedTopic.trim() || selectedAngles.length === 0) {
      showToast('请先输入话题并选择角度', 'warning');
      return;
    }

    const cacheKey = getInspirationCacheKey();
    if (inspirationCacheRef.current[cacheKey]) {
      setInspirationSuggestions(inspirationCacheRef.current[cacheKey]);
      setInspirationError(null);
      return;
    }

    const ok = await checkAndIncrementQuota();
    if (!ok) return;

    setIsInspirationLoading(true);
    setInspirationError(null);
    try {
      const query = buildInspirationPrompt(selectedTopic, selectedAngles);
      const result = await callCozeChat(query);
      const parsed = result.split('\n').filter(l => l.trim() && l.includes('【') && l.includes('】'));
      if (parsed.length === 0) {
        setInspirationError('AI 未返回有效建议，请重试');
      } else {
        inspirationCacheRef.current[cacheKey] = parsed;
        setInspirationSuggestions(parsed);
      }
    } catch {
      setInspirationError('获取灵感失败，请稍后重试');
    } finally {
      setIsInspirationLoading(false);
    }
  };

  const parseSuggestionAngle = (suggestion: string): string => {
    const m = suggestion.match(/【(.+?)】/);
    return m ? m[1] : '';
  };

  const applySuggestion = (suggestion: string) => {
    const clean = suggestion.replace(/【.+?】/g, '').trim();
    setGenerationHint(clean);
    showToast('已采纳灵感方向');
  };

  const clearGenerationHint = () => setGenerationHint('');

  // Reset inspiration cache when topic or angles change
  const prevCacheKeyRef = useRef('');
  const cacheKey = getInspirationCacheKey();
  if (cacheKey !== prevCacheKeyRef.current) {
    prevCacheKeyRef.current = cacheKey;
    if (inspirationCacheRef.current[cacheKey]) {
      setInspirationSuggestions(inspirationCacheRef.current[cacheKey]);
    } else {
      setInspirationSuggestions([]);
    }
    setGenerationHint('');
  }

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const handleAngleToggle = (angle: string) => {
    if (selectedAngles.includes(angle)) {
      setSelectedAngles(selectedAngles.filter(a => a !== angle));
    } else if (selectedAngles.length < 5) {
      setSelectedAngles([...selectedAngles, angle]);
    } else {
      showToast('最多选择 5 个角度', 'warning');
    }
  };

  const handleGenerate = async () => {
    if (forgeMode === 'create') {
      if (!selectedTopic.trim()) { showToast('请输入话题关键词', 'warning'); return; }
      if (selectedAngles.length === 0) { showToast('请至少选择一个创作角度', 'warning'); return; }
    } else if (forgeMode === 'deconstruct') {
      if (!selectedTopic.trim()) { showToast('请输入要拆解的话题或文案', 'warning'); return; }
    } else if (forgeMode === 'rewrite') {
      if (!rewriteSource.trim()) { showToast('请粘贴要改写的文案', 'warning'); return; }
    }

    const ok = await checkAndIncrementQuota();
    if (!ok) return;

    setGenerating(true);
    setGeneratedCopies([]);
    setDeconstructResult(null);

    try {
      if (forgeMode === 'deconstruct') {
        const query = buildDeconstructQuery(selectedTopic);
        const result = await callCozeChat(query);
        setDeconstructResult(result);
        useAppStore.getState().addAnalysisHistory(selectedTopic.slice(0, 30), result);
        showToast('拆解完成');
      } else if (forgeMode === 'rewrite') {
        const style = selectedTopic.trim() || '保持原风格';
        const query = buildRewriteQuery(rewriteSource, style);
        const result = await callCozeChat(query);
        const parsed = [{ angle: `改写版·${style}`, content: result }];
        setGeneratedCopies(parsed);
        showToast('改写完成');
      } else {
        const profileVars = getUserVariables() || {};
        const hintPrefix = generationHint ? `【灵感方向】${generationHint}\n\n请围绕这个方向进行创作。\n\n` : '';
        const query = hintPrefix + buildCopyGenerateQuery(selectedTopic, selectedAngles, profileVars, lastAnalysis);
        const result = await callCozeChat(query);

        const parsed = parseGeneratedCopies(result);
        if (parsed.length === 0) {
          console.warn('[ContentForge] parseGeneratedCopies 失败, 原始返回:', result.slice(0, 200));
          showToast('AI 返回内容格式异常，请换个角度或话题再试', 'error');
          return;
        }

        setGeneratedCopies(parsed);
        setLastAnalysis('');

        saveHistory({
          topic: selectedTopic,
          angles: selectedAngles,
          copies: parsed,
          timestamp: Date.now(),
        });
        refreshHistory();

        showToast(`已生成 ${parsed.length} 种角度的文案`);
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      console.error('generate error:', e);
      showToast('生成失败，请稍后重试', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleConvert = async (platform: string) => {
    if (!generatedCopies.length || convertingPlatform) return;

    const quota = await checkUserQuota();
    if (!quota.allowed) {
      setShowQuotaModal(true);
      return;
    }

    setConvertingPlatform(platform);
    try {
      await incrementUserQuota();

      const copiesText = generatedCopies
        .map((c, i) => `【角度${i + 1}：${c.angle}】\n${c.content}`)
        .join('\n\n---\n\n');
      const platformLabels = platformStyles.map(p => p.label).join(' / ');

      const profileText = formatProfileForPrompt(getUserProfileFromStorage());
      const profileSection = profileText ? `\n用户偏好（请在转换中保持统一的语气和风格）：\n${profileText}\n` : '';

      const query = `请将以下 ${generatedCopies.length} 段文案，同时转换为以下 4 个平台版本：${platformStyles.map(p => p.label).join('、')}。${profileSection}

要求每个平台版本按以下顺序输出，用「==平台名==」作为分隔：
==${platformStyles.map(p => p.label).join('==\n==') + '=='}

原文：
${copiesText}

输出格式（严格遵守）：
==${platformStyles[0].label}==
[${platformStyles[0].label}版本的角度1文案]
[${platformStyles[0].label}版本的角度2文案]
...
==${platformStyles[1].label}==
[${platformStyles[1].label}版本的角度1文案]
...`;

      const result = await callCozeChat(query);
      const parsed = parseAllPlatformCopies(result, platformStyles, generatedCopies);

      setConvertedCopies(prev => ({ ...prev, [platform]: parsed[platformStyles[0].label] || generatedCopies }));
      setConvertedCopies(prev => {
        const next = { ...prev };
        platformStyles.forEach(p => {
          if (parsed[p.label]) next[p.id] = parsed[p.label];
        });
        return next;
      });
      showToast(`已生成 ${platformLabels} 4 个平台版本`);
    } catch {
      showToast('转换失败，请稍后重试', 'error');
    } finally {
      setConvertingPlatform(null);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    showToast('已复制到剪贴板');
  };

  const saveHistory = (item: any) => {
    try {
      const current = JSON.parse(localStorage.getItem('copyHistory') || '[]');
      const updated = [item, ...current].slice(0, 10);
      localStorage.setItem('copyHistory', JSON.stringify(updated));
    } catch {}
  };

  const loadHistory = (item: any) => {
    setSelectedTopic(item.topic);
    setSelectedAngles(item.angles);
    setGeneratedCopies(item.copies);
    setShowHistory(false);
  };

  const currentCopies = convertingPlatform ? (convertedCopies[convertingPlatform] || generatedCopies) : generatedCopies;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1">文案工坊</h2>
        <p className="text-body-sm text-text-secondary">
          {forgeMode === 'create' && '输入话题，AI 帮你生成爆款文案'}
          {forgeMode === 'deconstruct' && '输入话题或文案，AI 深度拆解其创作逻辑'}
          {forgeMode === 'rewrite' && '输入现有文案，AI 用你的风格重新改写'}
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 mb-4">
        {([
          { id: 'create' as ForgeMode, label: '创作', desc: '生成原创文案' },
          { id: 'deconstruct' as ForgeMode, label: '拆解', desc: '深度分析创作逻辑' },
          { id: 'rewrite' as ForgeMode, label: '洗稿', desc: '改写现有文案' },
        ]).map(mode => (
          <button
            key={mode.id}
            onClick={() => { setForgeMode(mode.id); setGeneratedCopies([]); setDeconstructResult(null); setRewriteSource(''); }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-all',
              forgeMode === mode.id
                ? 'bg-accent-subtle text-accent border border-accent'
                : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
            )}
            title={mode.desc}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Input section */}
      <div className="card p-4 mb-6">
        {forgeMode === 'create' ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="输入热点话题或关键词..."
              className="input-field flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={clsx('btn-primary', isGenerating && 'opacity-40 cursor-not-allowed')}>
              {isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" />生成中...</> : <><Sparkles className="w-4 h-4" />生成文案</>}
            </button>
          </div>
        ) : forgeMode === 'rewrite' ? (
          <div className="space-y-3">
            <textarea
              value={rewriteSource}
              onChange={(e) => setRewriteSource(e.target.value)}
              placeholder="粘贴要改写的原始文案..."
              className="input-field w-full min-h-[120px] resize-y"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="改写方向提示（可选，如：更口语化、更专业）"
                className="input-field flex-1"
              />
              <button onClick={handleGenerate} disabled={isGenerating || !rewriteSource.trim()} className={clsx('btn-primary', (isGenerating || !rewriteSource.trim()) && 'opacity-40 cursor-not-allowed')}>
                {isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" />改写中...</> : <><Sparkles className="w-4 h-4" />开始改写</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="输入要拆解的话题或文案（可粘贴长文本）..."
              className="input-field w-full min-h-[120px] resize-y"
            />
            <div className="flex justify-end">
              <button onClick={handleGenerate} disabled={isGenerating || !selectedTopic.trim()} className={clsx('btn-primary', (isGenerating || !selectedTopic.trim()) && 'opacity-40 cursor-not-allowed')}>
                {isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" />拆解中...</> : <><Sparkles className="w-4 h-4" />开始拆解</>}
              </button>
            </div>
          </div>
        )}
        {forgeMode === 'create' && (userProfile?.niche || userProfile?.audience || userProfile?.style ? (
          <div className="mt-3 flex items-center gap-1.5 text-caption text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>生成时将使用你的「创作者档案」让文案更贴近你</span>
            <button onClick={() => setActivePage('profile')} className="text-accent hover:text-accent-hover ml-1">编辑</button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 text-caption text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-text-tertiary" />
            <span>没填「创作者档案」？</span>
            <button onClick={() => setActivePage('profile')} className="text-accent hover:text-accent-hover">花 30 秒填一下，AI 文案会对你口味的 2 倍</button>
          </div>
        ))}
      </div>

      {/* Angle selection (only for create mode) */}
      {forgeMode === 'create' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-body-sm font-medium text-text-secondary">选择创作角度</h3>
            <span className="text-caption text-text-tertiary">已选 {selectedAngles.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {angles.map((angle) => {
              const Icon = angle.icon;
              return (
                <button
                  key={angle.id}
                  onClick={() => handleAngleToggle(angle.label)}
                  title={angle.desc}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-all duration-120',
                    selectedAngles.includes(angle.label)
                      ? 'bg-accent-subtle text-accent border border-accent'
                      : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{angle.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspiration panel (create mode only) */}
      {forgeMode === 'create' && selectedTopic.trim() && selectedAngles.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleGetInspiration}
              disabled={isInspirationLoading}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-all',
                inspirationSuggestions.length > 0
                  ? 'bg-accent-subtle text-accent border border-accent'
                  : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
              )}
            >
              {isInspirationLoading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" />获取中...</>
              ) : (
                <><Lightbulb className="w-3.5 h-3.5" />灵感启发</>
              )}
            </button>
            {inspirationSuggestions.length > 0 && (
              <>
                <span className="text-caption text-text-tertiary">{inspirationSuggestions.length} 条建议</span>
                <button
                  onClick={clearGenerationHint}
                  className="ml-auto text-caption text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {generationHint ? '清除灵感方向' : ''}
                </button>
              </>
            )}
          </div>

          {inspirationError && (
            <div className="text-caption text-red mb-2">{inspirationError}</div>
          )}

          {inspirationSuggestions.length > 0 && (
            <div className="space-y-1.5">
              {inspirationSuggestions.map((s, i) => {
                const angle = parseSuggestionAngle(s);
                const clean = s.replace(/【.+?】/g, '').trim();
                const isActive = generationHint === clean;
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex items-start gap-2 p-2.5 rounded-md border transition-all cursor-pointer',
                      isActive
                        ? 'bg-accent-subtle border-accent'
                        : 'bg-bg-surface border-border hover:bg-bg-elevated'
                    )}
                    onClick={() => applySuggestion(s)}
                  >
                    <Lightbulb className={clsx('w-3.5 h-3.5 mt-0.5 shrink-0', isActive ? 'text-accent' : 'text-text-tertiary')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-text-primary leading-relaxed">{clean}</p>
                      {angle && (
                        <span className="inline-block mt-1 text-caption text-accent">{angle}</span>
                      )}
                    </div>
                    {angle && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGenerationHint(clean); showToast('已设为此角度'); }}
                        className="shrink-0 px-2 py-0.5 rounded text-caption bg-bg-elevated text-text-tertiary hover:text-accent hover:bg-accent-subtle transition-all"
                        title="使用此角度"
                      >
                        使用此角度
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved copies section */}
          {savedCopies.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5 text-yellow" />
                <span className="text-body-sm font-medium text-text-secondary">收藏的文案方向</span>
                <span className="text-caption text-text-tertiary">{savedCopies.length}/50</span>
              </div>
              <div className="grid gap-1.5">
                {savedCopies.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-bg-surface"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-text-secondary leading-relaxed line-clamp-2">{item.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-caption text-accent">{item.angle}</span>
                        <span className="text-caption text-text-tertiary">{item.topic}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => unsaveCopy(item.content)}
                      className="shrink-0 p-1 rounded text-text-tertiary hover:text-red transition-colors"
                      title="取消收藏"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {savedCopies.length > 5 && (
                <button className="mt-2 text-caption text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
                  查看全部 <ChevronDown className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isGenerating ? (
        <LoadingState steps={
          forgeMode === 'deconstruct'
            ? ['正在读取输入...', '正在深度分析...', '正在生成拆解报告...']
            : forgeMode === 'rewrite'
              ? ['正在理解原文...', '正在风格转换...', '正在生成改写版...']
              : ['正在分析热点话题...', '正在构思创作角度...', '正在生成爆款文案...', '正在优化内容质量...']
        } />
      ) : forgeMode === 'deconstruct' && deconstructResult ? (
        <div ref={resultsRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              拆解报告
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(deconstructResult).then(() => showToast('已复制'))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-caption bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
              >
                <Copy className="w-3 h-3" />
                复制
              </button>
              <button
                onClick={() => { setSelectedTopic(selectedTopic); setSelectedAngles(['深度分析']); setLastAnalysis(deconstructResult); setActivePage('forge'); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-caption bg-accent-subtle text-accent border border-accent"
              >
                <Sparkles className="w-3 h-3" />
                基于此创作
              </button>
            </div>
          </div>
          <div className="text-body-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{deconstructResult}</div>
        </div>
      ) : generatedCopies.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-subtle mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          {forgeMode === 'create' ? (
            <>
              <h3 className="text-body font-semibold text-text-primary mb-1">选个话题开始创作</h3>
              <p className="text-body-sm text-text-secondary mb-6">从下面 3 个热门方向选一个，AI 立刻生成爆款文案</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {[
                  { topic: '35岁职场危机', angle: 'emotional', label: '35 岁危机', desc: '情感共鸣', emoji: '😰' },
                  { topic: 'AI 替代人工', angle: 'future', label: 'AI 替代人工', desc: '未来趋势', emoji: '🤖' },
                  { topic: '2026 新兴职业', angle: 'knowledge', label: '新兴职业', desc: '知识科普', emoji: '💼' },
                ].map((ex) => (
                  <button
                    key={ex.topic}
                    onClick={() => {
                      setSelectedTopic(ex.topic);
                      setSelectedAngles([ex.angle]);
                      setTimeout(() => handleGenerate(), 50);
                    }}
                    className="card p-4 text-left hover:border-accent transition-all duration-120 group"
                  >
                    <div className="text-2xl mb-2">{ex.emoji}</div>
                    <div className="text-body-sm font-medium text-text-primary mb-1 group-hover:text-accent">{ex.label}</div>
                    <div className="text-caption text-text-tertiary">{ex.desc}</div>
                  </button>
                ))}
              </div>
            </>
          ) : forgeMode === 'deconstruct' ? (
            <>
              <h3 className="text-body font-semibold text-text-primary mb-1">输入要拆解的内容</h3>
              <p className="text-body-sm text-text-secondary">粘贴你的文案或输入话题，AI 会分析其创作逻辑和可复用的模型</p>
            </>
          ) : (
            <>
              <h3 className="text-body font-semibold text-text-primary mb-1">粘贴要改写的文案</h3>
              <p className="text-body-sm text-text-secondary">输入现有文案，AI 会用你的风格重新表达</p>
            </>
          )}
        </div>
      ) : (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-body font-semibold text-text-primary">生成结果</h3>
            <div className="flex items-center gap-1.5">
              {/* 一键复制全部 */}
              <button
                onClick={() => {
                  const text = currentCopies.map((c, i) => `【${c.angle}】\n${c.content}`).join('\n\n---\n\n');
                  navigator.clipboard.writeText(text).then(() => showToast('已复制全部文案'));
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-caption font-medium bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-all"
                title="一键复制所有结果"
              >
                <Copy className="w-3 h-3" />
                一键复制
              </button>
              <button
                onClick={() => handleConvert('all')}
                disabled={convertingPlatform !== null}
                className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-medium transition-all duration-120',
                convertingPlatform
                  ? 'bg-accent-subtle text-accent'
                  : Object.keys(convertedCopies).length > 0
                    ? 'bg-accent-subtle text-accent border border-accent'
                    : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
              )}
              title="一次生成 4 个平台版本（仅消耗 1 次额度）"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {convertingPlatform ? '转换中...' : Object.keys(convertedCopies).length > 0 ? '已生成多平台版本 · 重新转换' : '一键转换为多平台版本'}
            </button>
          </div>
          </div>

          {/* 平台切换 tab：原版 + 已转换的平台 */}
          {Object.keys(convertedCopies).length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              <button
                onClick={() => setConvertingPlatform(null)}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-120',
                  !convertingPlatform
                    ? 'bg-accent-subtle text-accent border border-accent'
                    : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                )}
              >
                原版
              </button>
              {platformStyles.map((p) => (
                convertedCopies[p.id] && (
                  <button
                    key={p.id}
                    onClick={() => setConvertingPlatform(p.id)}
                    className={clsx(
                      'px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-120',
                      convertingPlatform === p.id
                        ? 'bg-accent-subtle text-accent border border-accent'
                        : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {p.label}
                  </button>
                )
              ))}
            </div>
          )}

          {/* Compare button */}
          {selectedForCompare.size >= 2 && !showComparison && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowComparison(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-medium bg-accent-subtle text-accent border border-accent"
              >
                <Columns3 className="w-3.5 h-3.5" />
                对比 {selectedForCompare.size} 个版本
              </button>
            </div>
          )}

          <div className="grid gap-3">
            {currentCopies.map((copy, index) => {
              const { title, body } = splitTitleBody(copy.content);
              const isSelected = selectedForCompare.has(index);
              return (
                <div key={index} className={clsx('card p-4 relative', isSelected && 'ring-2 ring-accent')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForCompare(prev => {
                            const next = new Set(prev);
                            if (next.has(index)) next.delete(index); else next.add(index);
                            return next;
                          });
                          setShowComparison(false);
                        }}
                        className={clsx(
                          'w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0',
                          isSelected
                            ? 'bg-accent border-accent text-white'
                            : 'border-border hover:border-accent'
                        )}
                        title={isSelected ? '取消选择' : '选择对比'}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                      <span className="text-caption font-mono text-text-tertiary">#{index + 1}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-body-sm font-medium border border-accent text-accent bg-accent-subtle">
                        {copy.angle}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(copy.content, index)}
                      className={clsx(
                        'flex items-center gap-1 px-2.5 py-1 rounded-md text-caption transition-all duration-120',
                        copiedIndex === index
                          ? 'bg-accent-subtle text-accent'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          复制
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); isCopySaved(copy.content) ? unsaveCopy(copy.content) : saveCopyToStorage(copy.content, copy.angle); }}
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded-md text-caption transition-all duration-120',
                        isCopySaved(copy.content) ? 'text-yellow bg-yellow-subtle' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      )}
                      title={isCopySaved(copy.content) ? '取消收藏' : '收藏此文案'}
                    >
                      <Star className={clsx('w-3 h-3', isCopySaved(copy.content) && 'fill-current')} />
                    </button>
                  </div>
                  {title && (
                    <h3
                      onClick={() => handleCopy(title, index)}
                      className="text-heading-m text-text-primary leading-snug mb-2 cursor-pointer hover:text-accent transition-colors"
                      title="点击复制标题"
                    >
                      {title}
                    </h3>
                  )}
                  {body && (
                    <p className="text-body text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {body}
                    </p>
                  )}
                  {!body && !title && (
                    <p className="text-body text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {copy.content}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-border text-caption text-text-tertiary">
                    {copy.content.length} 字
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison view */}
      {showComparison && selectedForCompare.size >= 2 && (
        <div className="modal-overlay" onClick={() => setShowComparison(false)}>
          <div className="modal-card max-w-4xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-semibold text-text-primary flex items-center gap-2">
                <Columns3 className="w-4 h-4 text-accent" />
                多版本对比
              </h3>
              <button onClick={() => setShowComparison(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-elevated">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedForCompare.size, 3)}, 1fr)` }}>
              {[...selectedForCompare].sort().map((idx) => {
                const copy = (convertingPlatform ? (convertedCopies[convertingPlatform] || generatedCopies) : generatedCopies)[idx];
                if (!copy) return null;
                const { title, body } = splitTitleBody(copy.content);
                return (
                  <div key={idx} className="bg-bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-caption font-mono text-text-tertiary">#{idx + 1}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-sm bg-accent-subtle text-accent font-medium">{copy.angle}</span>
                    </div>
                    {title && <h4 className="text-body-sm font-medium text-text-primary mb-2">{title}</h4>}
                    <p className="text-body-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{body || copy.content}</p>
                    <div className="mt-3 pt-2 border-t border-border text-caption text-text-tertiary flex items-center justify-between">
                      <span>{(body || copy.content).length} 字</span>
                      <button
                        onClick={() => handleCopy(copy.content, idx)}
                        className="flex items-center gap-1 text-accent hover:text-accent-hover"
                      >
                        <Copy className="w-3 h-3" />
                        复制
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Copy history */}
      {history.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-ghost"
          >
            <Wand2 className="w-4 h-4" />
            <span>历史记录</span>
            <span className="text-caption bg-bg-elevated px-2 py-0.5 rounded-full ml-1">{history.length}</span>
          </button>

          {showHistory && (
            <div className="mt-3 space-y-1.5">
              {history.map((item: any, index: number) => (
                <div
                  key={index}
                  onClick={() => loadHistory(item)}
                  className="interactive-row"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium text-text-primary truncate">{item.topic}</span>
                    <span className="text-caption text-text-tertiary shrink-0 ml-2">{item.angles.join('、')}</span>
                  </div>
                  <div className="text-caption text-text-tertiary mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis history */}
      {analysisHistory.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAnalysisHistory(!showAnalysisHistory)}
            className="btn-ghost"
          >
            <Sparkles className="w-4 h-4" />
            <span>最近分析</span>
            <span className="text-caption bg-bg-elevated px-2 py-0.5 rounded-full ml-1">{analysisHistory.length}</span>
          </button>

          {showAnalysisHistory && (
            <div className="mt-3 space-y-1.5">
              {analysisHistory.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedTopic(item.topic);
                    setLastAnalysis(item.analysis);
                    showToast('已加载分析上下文');
                  }}
                  className="interactive-row"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium text-text-primary truncate">{item.topic}</span>
                    <span className="text-caption text-text-tertiary shrink-0 ml-2">分析结果</span>
                  </div>
                  <div className="text-caption text-text-tertiary mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseGeneratedCopies(text: string): GeneratedCopy[] {
  const lines = text.split('\n').filter(line => line.trim());
  const copies: GeneratedCopy[] = [];
  let currentAngle = '';
  let currentContent = '';

  for (const line of lines) {
    const angleMatch = line.match(/^(【|《|\[|#)\s*([^】》\]#]+?)\s*(】|》|\]|#)/);
    if (angleMatch) {
      if (currentAngle && currentContent) {
        copies.push({ angle: currentAngle.trim(), content: currentContent.trim() });
      }
      currentAngle = angleMatch[2].trim();
      currentContent = '';
    } else if (line.match(/^\d+[\.\uff0e、]/)) {
      const contentMatch = line.match(/^\d+[\.\uff0e、]\s*(.+)/);
      if (contentMatch) {
        if (!currentAngle) {
          currentAngle = `角度${copies.length + 1}`;
        }
        if (currentContent) currentContent += '\n';
        currentContent += contentMatch[1];
      }
    } else if (currentAngle) {
      if (currentContent) currentContent += '\n';
      currentContent += line;
    }
  }

  if (currentAngle && currentContent) {
    copies.push({ angle: currentAngle.trim(), content: currentContent.trim() });
  }

  return copies.length > 0 ? copies : [];
}

function parseAllPlatformCopies(
  text: string,
  platforms: { id: string; label: string }[],
  fallbackAngles: { angle: string; content: string }[]
): Record<string, GeneratedCopy[]> {
  const result: Record<string, GeneratedCopy[]> = {};
  const lines = text.split('\n');
  let currentPlatform: string | null = null;
  let currentAngleIndex = 0;
  let currentContent = '';

  const flush = () => {
    if (currentPlatform && currentContent.trim()) {
      const angle = fallbackAngles[currentAngleIndex]?.angle || `角度${currentAngleIndex + 1}`;
      if (!result[currentPlatform]) result[currentPlatform] = [];
      result[currentPlatform].push({ angle, content: currentContent.trim() });
    }
    currentContent = '';
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // 匹配 ==小红书版== / 【小红书版】 / # 小红书版 # 等分隔符
    const sep = line.match(/^==\s*(.+?)\s*==$/)
      || line.match(/^【\s*(.+?)\s*】$/)
      || line.match(/^#\s*(.+?)\s*#$/);
    if (sep) {
      flush();
      const matched = platforms.find(p => sep[1].includes(p.label) || p.label.includes(sep[1]));
      currentPlatform = matched?.label || sep[1].trim();
      currentAngleIndex = 0;
      continue;
    }

    // 数字开头的算新角度
    const numMatch = line.match(/^\d+[\.\uff0e、]\s*(.+)/);
    if (numMatch) {
      flush();
      currentContent = numMatch[1];
      currentAngleIndex = result[currentPlatform || '']?.length || 0;
      continue;
    }

    if (currentPlatform) {
      if (currentContent) currentContent += '\n';
      currentContent += raw;
    }
  }
  flush();

  // 如果没解析出任何平台，回退到原版
  if (Object.keys(result).length === 0) {
    platforms.forEach(p => { result[p.label] = fallbackAngles; });
  }
  return result;
}

function splitTitleBody(content: string): { title: string; body: string } {
  const trimmed = content.trim();
  if (!trimmed) return { title: '', body: '' };

  const newlineIdx = trimmed.indexOf('\n');
  if (newlineIdx > 0) {
    const firstLine = trimmed.substring(0, newlineIdx).trim();
    if (firstLine.length >= 4 && firstLine.length <= 50) {
      return {
        title: firstLine,
        body: trimmed.substring(newlineIdx + 1).trim(),
      };
    }
  }

  const sentenceMatch = trimmed.match(/^([\s\S]{4,60}?[。！？])/);
  if (sentenceMatch && sentenceMatch[1].length <= 50) {
    return {
      title: sentenceMatch[1].trim(),
      body: trimmed.substring(sentenceMatch[0].length).trim(),
    };
  }

  return { title: '', body: trimmed };
}
