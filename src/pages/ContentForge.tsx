import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { callCozeChat, buildCopyGenerateQuery, checkUserQuota, incrementUserQuota, getUserVariables, getUserProfileFromStorage, formatProfileForPrompt } from '../services/cozeApi';
import { Sparkles, Copy, Check, RefreshCw, Wand2, FileText, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare } from 'lucide-react';
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [convertingPlatform, setConvertingPlatform] = useState<string | null>(null);
  const [convertedCopies, setConvertedCopies] = useState<Record<string, GeneratedCopy[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
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
    if (!selectedTopic.trim()) {
      showToast('请输入话题关键词', 'warning');
      return;
    }
    if (selectedAngles.length === 0) {
      showToast('请至少选择一个创作角度', 'warning');
      return;
    }

    // 原子操作：检查 + 消费 + 同步 store（避免双调用 race + UI 状态不同步）
    const ok = await checkAndIncrementQuota();
    if (!ok) return;

    setGenerating(true);
    setGeneratedCopies([]);

    try {
      const profileVars = getUserVariables() || {};
      const query = buildCopyGenerateQuery(selectedTopic, selectedAngles, profileVars, lastAnalysis);
      const result = await callCozeChat(query);

      const parsed = parseGeneratedCopies(result);
      if (parsed.length === 0) {
        // 解析失败：不再造假数据，避免显示 N 段相同内容误导用户
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
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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
        <p className="text-body-sm text-text-secondary">输入话题，AI 帮你生成爆款文案</p>
      </div>

      {/* Search input */}
      <div className="card p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            placeholder="输入热点话题或关键词..."
            className="input-field flex-1"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={clsx(
              'btn-primary',
              isGenerating && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成文案
              </>
            )}
          </button>
        </div>
        {/* 档案状态提示 */}
        {userProfile?.niche || userProfile?.audience || userProfile?.style ? (
          <div className="mt-3 flex items-center gap-1.5 text-caption text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>生成时将使用你的「创作者档案」让文案更贴近你</span>
            <button
              onClick={() => setActivePage('profile')}
              className="text-accent hover:text-accent-hover ml-1"
            >
              编辑
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 text-caption text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5 text-text-tertiary" />
            <span>没填「创作者档案」？</span>
            <button
              onClick={() => setActivePage('profile')}
              className="text-accent hover:text-accent-hover"
            >
              花 30 秒填一下，AI 文案会对你口味的 2 倍
            </button>
          </div>
        )}
      </div>

      {/* Angle selection */}
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

      {isGenerating ? (
        <LoadingState steps={['正在分析热点话题...', '正在构思创作角度...', '正在生成爆款文案...', '正在优化内容质量...']} />
      ) : generatedCopies.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-subtle mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
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
        </div>
      ) : (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-body font-semibold text-text-primary">生成结果</h3>
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

          <div className="grid gap-3">
            {currentCopies.map((copy, index) => {
              const { title, body } = splitTitleBody(copy.content);
              return (
                <div key={index} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
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
