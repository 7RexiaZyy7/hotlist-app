import { useState } from 'react';
import { useAppStore } from '../store';
import { Scissors, Sparkles, FileText, Target, Zap, AlertTriangle, Copy, Check } from 'lucide-react';
import { 
  callCozeChat, 
  buildAnalysisQuery,
  buildRewriteQuery 
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

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s*(.+?)$/);
    const colonMatch = line.match(/^(.+?)[：:]\s*(.+)$/);

    if (headerMatch) {
      if (currentKey && values.length > 0) {
        result[currentKey] = values.length === 1 ? values[0] : [...values];
      }
      values.length = 0;
      currentKey = sectionMap[headerMatch[1].trim()] || '';
      continue;
    }

    if (colonMatch) {
      const key = sectionMap[colonMatch[1].trim()];
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
  } = useAppStore();
  
  const [inputCopy, setInputCopy] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [rewriteStyle, setRewriteStyle] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState('');
  const [copied, setCopied] = useState(false);

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
    try {
      const query = buildAnalysisQuery(inputCopy);
      const content = await callCozeChat(query);

      if (!content.trim()) {
        showToast('拆解失败，未获取到分析结果', 'error');
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
    }
  };

  const handleRewrite = async () => {
    if (!rewriteStyle) {
      showToast('请先选择洗稿风格', 'info');
      return;
    }
    setIsRewriting(true);
    try {
      const query = buildRewriteQuery(inputCopy, rewriteStyle);
      const content = await callCozeChat(query);
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

    if (key === 'structure' && Array.isArray(data)) {
      return (
        <div className="bg-card border border-gray-800 rounded-xl p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium">{config?.label || key}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.map((step: string, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg text-sm">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-mono">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'warnings' && Array.isArray(data)) {
      return (
        <div className="bg-card border border-gray-800 rounded-xl p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium">{config?.label || key}</span>
          </div>
          <div className="space-y-1.5">
            {data.map((w: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                {w}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'keyElements' && Array.isArray(data)) {
      return (
        <div className="bg-card border border-gray-800 rounded-xl p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium">{config?.label || key}</span>
          </div>
          <div className="space-y-1.5">
            {data.map((el: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {el}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (typeof data === 'string') {
      return (
        <div className="bg-card border border-gray-800 rounded-xl p-5" key={key}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${config?.color}`} />
            <span className="font-medium">{config?.label || key}</span>
          </div>
          <p className="text-sm text-gray-300">{data}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">爆款文案拆解</h2>
        </div>
        <textarea
          value={inputCopy}
          onChange={(e) => setInputCopy(e.target.value)}
          rows={6}
          className="w-full bg-card border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none"
          placeholder="在这里粘贴你想要拆解的爆款文案..."
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="mt-3 px-6 py-2.5 bg-gradient-to-r from-accent to-orange-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          <Scissors className="w-4 h-4" />
          {isAnalyzing ? '拆解中...' : '开始拆解'}
        </button>
      </div>

      {analysis && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {analysis.raw ? (
                <div className="bg-card border border-gray-800 rounded-xl p-5">
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">{analysis.raw}</pre>
                </div>
              ) : (
                Object.keys(analysis).map(key => renderSection(key, analysis[key]))
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-gray-800 rounded-xl p-5">
                <h3 className="font-medium mb-3">智能洗稿</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {rewriteStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setRewriteStyle(style)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        rewriteStyle === style
                          ? 'bg-accent text-white'
                          : 'bg-surface text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleRewrite}
                  disabled={isRewriting || !rewriteStyle}
                  className="w-full py-2.5 bg-gradient-to-r from-accent-alt to-blue-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isRewriting ? '生成中...' : '洗稿'}
                </button>
              </div>

              {rewriteResult && (
                <div className="bg-card border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">洗稿结果</h3>
                    <button
                      onClick={handleCopyResult}
                      className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                    {rewriteResult}
                  </pre>
                </div>
              )}

              {!rewriteResult && (
                <div className="bg-card border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">选择一种风格开始洗稿</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!analysis && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <FileText className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg mb-1">粘贴爆款文案开始拆解</p>
          <p className="text-sm">AI 会帮你分析钩子、结构和关键元素</p>
        </div>
      )}
    </div>
  );
}