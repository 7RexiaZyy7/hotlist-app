import { useState } from 'react';
import { useAppStore } from '../store';
import { Scissors, Sparkles, FileText, Target, Zap, AlertTriangle, Copy, Check, Video, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { 
  callCozeChat, 
  buildAnalysisQuery,
  buildRewriteQuery,
  transcribeDouyin,
} from '../services/cozeApi';

const rewriteStyles = [
  '轻松幽默',
  '专业理性',
  '温暖治愈',
  '犀利观点',
  '知识科普',
];

const sectionLabels: Record<string, { icon: typeof Zap; label: string; color: string }> = {
  hook: { icon: Zap, label: '钩子分析', color: 'text-accent' },
  structure: { icon: Target, label: '结构拆解', color: 'text-accent-alt' },
  keyElements: { icon: Sparkles, label: '关键元素', color: 'text-success' },
  reusableModel: { icon: Sparkles, label: '可复用模型', color: 'text-success' },
  warnings: { icon: AlertTriangle, label: '风险提示', color: 'text-warning' },
};

function parseAnalysis(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = text.split('\n').filter(l => l.trim());

  const sectionMap: Record<string, string> = {
    '钩子': 'hook',
    '钩子分析': 'hook',
    '结构': 'structure',
    '结构拆解': 'structure',
    '关键元素': 'keyElements',
    '可复用模型': 'reusableModel',
    '风险提示': 'warnings',
    '风险': 'warnings',
  };

  let currentKey = '';
  const values: string[] = [];

  function normalizeHeader(raw: string): string {
    return raw.replace(/^\d+[\.\s、]+/, '').trim();
  }

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s*(.+?)$/);
    const colonMatch = line.match(/^(.+?)[：:]\s*(.+)$/);

    if (headerMatch) {
      if (currentKey && values.length > 0) {
        result[currentKey] = values.length === 1 ? values[0] : [...values];
      }
      values.length = 0;
      currentKey = sectionMap[normalizeHeader(headerMatch[1])] || '';
      continue;
    }

    if (colonMatch) {
      const key = sectionMap[normalizeHeader(colonMatch[1])];
      if (key) {
        if (currentKey && values.length > 0) {
          result[currentKey] = values.length === 1 ? values[0] : [...values];
        }
        values.length = 0;
        currentKey = key;
        if (colonMatch[2].trim()) values.push(colonMatch[2].trim());
        continue;
      }
    }

    if (currentKey) {
      const item = line.replace(/^[-*]\s*/, '').trim();
      if (item) values.push(item);
    }
  }

  if (currentKey && values.length > 0) {
    result[currentKey] = values.length === 1 ? values[0] : [...values];
  }

  return result;
}

export function HitAnalyzer() {
  const { 
    isConnected,
    incrementAnalysis,
    showToast,
    cozeUid,
  } = useAppStore();
  
  const [inputCopy, setInputCopy] = useState('');
  const [douyinUrl, setDouyinUrl] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [rewriteStyle, setRewriteStyle] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleTranscribeDouyin = async () => {
    const trimmed = douyinUrl.trim();
    if (!trimmed) {
      showToast('请粘贴抖音分享链接', 'info');
      return;
    }
    setIsTranscribing(true);
    try {
      const result = await transcribeDouyin(trimmed);
      if (result.error) {
        showToast(`提取失败: ${result.error}`, 'error');
        return;
      }
      if (result.text) {
        setInputCopy(result.text);
        showToast('文案提取成功');
      } else if (result.taskId) {
        showToast('转写任务已提交，请稍后重试', 'info');
      } else {
        showToast('提取失败，未获取到文案内容', 'error');
      }
    } catch {
      showToast('提取失败，请稍后重试', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputCopy.trim()) {
      showToast('请先粘贴需要拆解的文案', 'info');
      return;
    }
    if (!isConnected) {
      showToast('API 代理未连接', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setLoadingStep(0);
    const stepTimer = setInterval(() => setLoadingStep(s => Math.min(s + 1, 2)), 8000);
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setIsAnalyzing(false); clearInterval(stepTimer); return; }

      const query = buildAnalysisQuery(inputCopy);
      const content = await callCozeChat(query);

      if (!content.trim()) {
        showToast('拆解失败，未获取到分析结果', 'error');
        return;
      }

      const askingInfo = content.length < 300 && /请.*提供|没有.*提供|缺少|需要你|告诉我|发给我/.test(content);
      if (askingInfo) {
        showToast('Bot 未识别到文案内容，请确认文案已粘贴完整后重试', 'warning');
        setAnalysis({ raw: '⚠️ Bot 未能正确识别文案内容。\n\nBot 返回内容：\n' + content.slice(0, 300) + '\n\n可能原因：粘贴的文案被 Bot 当成了指令而不是待分析内容。\n请粘贴更完整的文案后重试。' });
        return;
      }

      const parsed = parseAnalysis(content);
      if (Object.keys(parsed).length > 0) {
        setAnalysis(parsed);
      } else {
        setAnalysis({ raw: content });
      }
      incrementAnalysis();
      showToast('拆解完成');
    } catch (error) {
      showToast('拆解失败，请稍后重试', 'error');
    } finally {
      setIsAnalyzing(false);
      clearInterval(stepTimer);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteStyle) {
      showToast('请先选择洗稿风格', 'info');
      return;
    }
    setIsRewriting(true);
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setIsRewriting(false); return; }

      const query = buildRewriteQuery(inputCopy, rewriteStyle);
      const content = await callCozeChat(query);

      const askingInfo = content && content.length < 300 && /请.*提供|没有.*提供|缺少|需要你|告诉我|发给我/.test(content);
      if (askingInfo) {
        showToast('Bot 未识别到文案内容，请确认已粘贴完整', 'warning');
        setRewriteResult('⚠️ Bot 未能正确识别文案内容，请确认文案已粘贴完整后重试。');
        return;
      }

      setRewriteResult(content || '未获取到洗稿结果');
      showToast('洗稿完成');
    } catch (error) {
      showToast('洗稿失败，请稍后重试', 'error');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(rewriteResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSection = (key: string, data: any) => {
    const config = sectionLabels[key];
    if (!data || (Array.isArray(data) && data.length === 0)) return null;

    const Icon = config?.icon || FileText;

    if (key === 'structure') {
      const rows = Array.isArray(data) ? data : [data];
      const hasTable = rows.some(r => typeof r === 'string' && r.trim().startsWith('|'));
      if (hasTable) {
        const headers = rows[0]?.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim()) || [];
        const body = rows.slice(2).filter(r => r.includes('|') && !r.includes('---'));
        return (
          <div className="card p-5 overflow-x-auto" key={key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${config?.color}`} />
              <span className="font-medium text-text-primary">{config?.label || key}</span>
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h: string, i: number) => (
                    <th key={i} className="text-left py-2 px-2 text-text-secondary font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row: string, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {row.split('|').filter((c: string) => c.trim()).map((cell: string, j: number) => (
                      <td key={j} className="py-2 px-2 text-text-secondary">{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div className="card p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium text-text-primary">{config?.label || key}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {rows.map((step: string, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-bg-elevated px-3 py-1.5 rounded-md text-body-sm text-text-secondary">
                <span className="w-5 h-5 rounded-full bg-accent-subtle text-accent text-xs flex items-center justify-center font-mono">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'warnings' && Array.isArray(data)) {
      return (
        <div className="card p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium text-text-primary">{config?.label || key}</span>
          </div>
          <div className="space-y-1.5">
            {data.map((w: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-body-sm text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'keyElements' && Array.isArray(data)) {
      return (
        <div className="card p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium text-text-primary">{config?.label || key}</span>
          </div>
          <div className="space-y-1.5">
            {data.map((el: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-body-sm text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                {el}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (typeof data === 'string') {
      return (
        <div className="card p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium text-text-primary">{config?.label || key}</span>
          </div>
          <p className="text-body-sm text-text-secondary whitespace-pre-wrap">{data}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 h-full flex flex-col overflow-hidden max-w-shell mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Scissors className="w-5 h-5 text-accent" />
          <h2 className="text-display text-text-primary">爆款文案拆解</h2>
        </div>
        <div className="card p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-accent" />
            <span className="text-body-sm font-medium text-text-primary">从抖音链接提取文案</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={douyinUrl}
              onChange={(e) => setDouyinUrl(e.target.value)}
              className="input-field flex-1 min-w-0"
              placeholder="粘贴抖音分享链接，如 https://v.douyin.com/xxxxx/"
            />
            <button
              onClick={handleTranscribeDouyin}
              disabled={isTranscribing}
              className="btn-primary shrink-0"
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              {isTranscribing ? '提取中...' : '提取文案'}
            </button>
          </div>
        </div>
        <textarea
          value={inputCopy}
          onChange={(e) => setInputCopy(e.target.value)}
          rows={6}
          className="input-field resize-none"
          placeholder="在这里粘贴你想要拆解的爆款文案..."
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="btn-primary mt-3"
        >
          <Scissors className="w-4 h-4" />
          {isAnalyzing ? '拆解中...' : '开始拆解'}
        </button>
      </div>

      {analysis && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              {analysis.raw ? (
                <div className="card p-5">
                  <pre className="whitespace-pre-wrap text-body-sm text-text-secondary font-body">{analysis.raw}</pre>
                </div>
              ) : (
                Object.keys(analysis).map(key => renderSection(key, analysis[key]))
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-body font-semibold text-text-primary mb-3">智能洗稿</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {rewriteStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setRewriteStyle(style)}
                      className={clsx(
                        'px-3 py-2 rounded-md text-body-sm transition-all duration-120',
                        rewriteStyle === style
                          ? 'bg-accent text-white'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleRewrite}
                  disabled={isRewriting || !rewriteStyle}
                  className="btn-primary w-full"
                >
                  <Sparkles className="w-4 h-4" />
                  {isRewriting ? '生成中...' : '洗稿'}
                </button>
              </div>

              {rewriteResult && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-text-primary">洗稿结果</h3>
                    <button
                      onClick={handleCopyResult}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-all duration-120"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-body-sm text-text-secondary font-body">
                    {rewriteResult}
                  </pre>
                </div>
              )}

              {!rewriteResult && (
                <div className="card p-8 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                  <p className="text-body-sm text-text-tertiary">选择一种风格开始洗稿</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAnalyzing && !analysis && (
        <LoadingState steps={['正在分析文案结构', '正在拆解关键元素', '正在生成报告']} currentStep={loadingStep} />
      )}

      {!isAnalyzing && !analysis && (
        <EmptyState icon={<Scissors className="w-10 h-10" />} title="粘贴爆款文案开始拆解" description="AI 会帮你分析钩子、结构和关键元素" />
      )}
    </div>
  );
}