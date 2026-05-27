import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { callCozeChat, buildCopyGenerateQuery, checkUserQuota, incrementUserQuota, getUserVariables } from '../services/cozeApi';
import { Sparkles, Copy, Check, RefreshCw, Wand2, FileText, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';

interface GeneratedCopy {
  angle: string;
  content: string;
}

const angles = [
  { id: 'emotional', label: '情感共鸣', icon: Heart },
  { id: 'knowledge', label: '知识科普', icon: BookOpen },
  { id: 'opinion', label: '观点评论', icon: MessageSquare },
  { id: 'trend', label: '热点追踪', icon: Flame },
  { id: 'future', label: '未来趋势', icon: Rocket },
  { id: 'analysis', label: '深度分析', icon: Search },
  { id: 'funny', label: '趣味解读', icon: Smile },
  { id: 'story', label: '故事叙述', icon: Book },
  { id: 'suggestion', label: '实用建议', icon: Lightbulb },
  { id: 'question', label: '提问互动', icon: HelpCircle },
  { id: 'comparison', label: '对比分析', icon: GitCompare },
];

const platformStyles = [
  { id: 'xiaohongshu', label: '小红书版', description: '适合小红书平台风格' },
  { id: 'douyin', label: '抖音脚本', description: '适合抖音短视频' },
  { id: 'gongzhonghao', label: '公众号版', description: '适合公众号文章' },
  { id: 'weibo', label: '微博版', description: '适合微博短文案' },
];

export function ContentForge() {
  const { selectedTopic, setSelectedTopic, selectedAngles, setSelectedAngles, setGenerating, isGenerating, generatedCopies, setGeneratedCopies, setShowQuotaModal, showToast } = useAppStore();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [convertingPlatform, setConvertingPlatform] = useState<string | null>(null);
  const [convertedCopies, setConvertedCopies] = useState<Record<string, GeneratedCopy[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

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
      showToast('最多选择5个角度', 'warning');
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

    const quota = await checkUserQuota();
    if (!quota.allowed) {
      setShowQuotaModal(true);
      return;
    }

    await incrementUserQuota();

    setGenerating(true);
    setGeneratedCopies([]);

    try {
      const userProfile = getUserVariables() || {};
      const query = buildCopyGenerateQuery(selectedTopic, selectedAngles, userProfile);
      const result = await callCozeChat(query);

      const parsed = parseGeneratedCopies(result);
      if (parsed.length > 0) {
        setGeneratedCopies(parsed);
      } else {
        setGeneratedCopies(selectedAngles.map(angle => ({ angle, content: result })));
      }

      saveHistory({
        topic: selectedTopic,
        angles: selectedAngles,
        copies: parsed.length > 0 ? parsed : selectedAngles.map(a => ({ angle: a, content: result })),
        timestamp: Date.now(),
      });

      showToast(`已生成 ${selectedAngles.length} 种角度的文案`);
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

    setConvertingPlatform(platform);
    try {
      const results: GeneratedCopy[] = [];
      for (const copy of generatedCopies) {
        const query = `请将以下文案转换为${platformStyles.find(p => p.id === platform)?.label || platform}风格：\n\n${copy.content}`;
        const result = await callCozeChat(query);
        results.push({ angle: copy.angle, content: result });
      }
      setConvertedCopies(prev => ({ ...prev, [platform]: results }));
      showToast('转换完成');
    } catch {
      showToast('转换失败', 'error');
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

  const history = JSON.parse(localStorage.getItem('copyHistory') || '[]');

  const saveHistory = (item: any) => {
    const current = JSON.parse(localStorage.getItem('copyHistory') || '[]');
    const updated = [item, ...current].slice(0, 10);
    localStorage.setItem('copyHistory', JSON.stringify(updated));
  };

  const loadHistory = (item: any) => {
    setSelectedTopic(item.topic);
    setSelectedAngles(item.angles);
    setGeneratedCopies(item.copies);
    setShowHistory(false);
  };

  const currentCopies = convertedCopies[convertingPlatform || ''] || generatedCopies;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1">文案工坊</h2>
        <p className="text-body-sm text-text-secondary">输入话题，AI帮你生成爆款文案</p>
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
        <EmptyState
          icon={<FileText className="w-10 h-10" />}
          title="还没有生成文案"
          description="输入话题并选择创作角度，AI 帮你生成爆款文案"
          action={{ label: '开始创作', onClick: () => document.querySelector('input')?.focus() }}
        />
      ) : (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-body font-semibold text-text-primary">生成结果</h3>
            <div className="flex gap-1.5">
              {platformStyles.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleConvert(platform.id)}
                  disabled={convertingPlatform !== null}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-120',
                    convertingPlatform === platform.id
                      ? 'bg-accent-subtle text-accent'
                      : convertedCopies[platform.id]
                        ? 'bg-accent-subtle text-accent'
                        : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                  )}
                  title={platform.description}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {currentCopies.map((copy, index) => (
              <div key={index} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge !text-accent !border-accent">{copy.angle}</span>
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
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-body text-text-primary leading-relaxed whitespace-pre-wrap">
                  {copy.content}
                </p>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-caption text-text-tertiary">
                  <span>{copy.content.length} 字</span>
                  <span>预计阅读 {Math.ceil(copy.content.length / 500)} 分钟</span>
                </div>
              </div>
            ))}
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
              {history.map((item: any, index) => (
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