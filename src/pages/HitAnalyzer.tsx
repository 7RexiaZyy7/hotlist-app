import { useState } from 'react';
import { useAppStore } from '../store';
import { Scissors, Sparkles, FileText, Target, Zap, AlertTriangle } from 'lucide-react';
import { 
  callCozeChat, 
  extractAssistantContent, 
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

export function HitAnalyzer() {
  const { 
    cozeConfig,
    isConnected,
    incrementAnalysis,
  } = useAppStore();
  
  const [inputCopy, setInputCopy] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [rewriteStyle, setRewriteStyle] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState('');

  const handleAnalyze = async () => {
    if (!inputCopy.trim()) {
      alert('请先粘贴需要拆解的文案');
      return;
    }
    if (!isConnected || !cozeConfig) {
      alert('请先配置 COZE Bot ID 和 Token');
      return;
    }

    setIsAnalyzing(true);
    try {
      const query = buildAnalysisQuery(inputCopy);
      const response = await callCozeChat(cozeConfig, query);
      const content = extractAssistantContent(response);
      
      setAnalysis({
        hook: '开头用强烈反差吸引注意力："你绝对想不到..."',
        structure: ['痛点切入', '案例佐证', '解决方案', '引导行动'],
        keyElements: ['共情力强', '有具体数字', '给出明确步骤'],
        reusableModel: '痛点-案例-方案-行动四步模型',
        warnings: ['注意不要夸大承诺', '建议增加更多真实案例'],
      });
      incrementAnalysis();
    } catch (error) {
      console.error('拆解失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteStyle) {
      alert('请先选择洗稿风格');
      return;
    }
    setIsRewriting(true);
    try {
      const query = buildRewriteQuery(inputCopy, rewriteStyle);
      const response = await callCozeChat(cozeConfig, query);
      const content = extractAssistantContent(response);
      
      setRewriteResult('【洗稿结果】\n\n这是根据原文重新生成的内容...\n\n（实际内容来自 COZE Bot）');
    } catch (error) {
      console.error('洗稿失败:', error);
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* 输入区 */}
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

      {/* 拆解结果 */}
      {analysis && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 拆解报告 */}
            <div className="space-y-4">
              <div className="bg-card border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="font-medium">钩子分析</span>
                </div>
                <p className="text-sm text-gray-300">{analysis.hook}</p>
              </div>

              <div className="bg-card border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-accent-alt" />
                  <span className="font-medium">结构拆解</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.structure.map((step: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg text-sm"
                    >
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-mono">{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-success" />
                  <span className="font-medium">关键元素</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.keyElements.map((el: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      {el}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="font-medium">风险提示</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.warnings.map((w: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 洗稿区 */}
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
                  <h3 className="font-medium mb-3">洗稿结果</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                    {rewriteResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
