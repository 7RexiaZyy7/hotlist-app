import { useState } from 'react';
import { useAppStore } from '../store';
import { Sparkles, Copy, Check, Wand2 } from 'lucide-react';
import { 
  callCozeChat, 
  extractAssistantContent, 
  buildCopyGenerateQuery 
} from '../services/cozeApi';

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

export function ContentForge() {
  const { 
    cozeConfig,
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
  } = useAppStore();
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleToggleAngle = (angle: string) => {
    setSelectedAngles(
      selectedAngles.includes(angle)
        ? selectedAngles.filter((a) => a !== angle)
        : [...selectedAngles, angle]
    );
  };

  const handleGenerate = async () => {
    if (!selectedTopic.trim()) {
      alert('请先选择或输入一个话题');
      return;
    }
    if (selectedAngles.length === 0) {
      alert('请至少选择一种文案角度');
      return;
    }
    if (!isConnected || !cozeConfig) {
      alert('请先配置 COZE Bot ID 和 Token');
      return;
    }

    setGenerating(true);
    try {
      const query = buildCopyGenerateQuery(selectedTopic, selectedAngles, userProfile);
      const content = await callCozeChat(cozeConfig, query);
      
      const mockCopies = selectedAngles.map((angle) => ({
        angle,
        content: `【${angle}】\n\n这是为"${selectedTopic}"生成的${angle}文案示例...\n\n（实际内容将来自你的 COZE Bot 响应）\n\n${content.substring(0, 100)}...`,
      }));
      
      setGeneratedCopies(mockCopies);
      incrementCopies();
    } catch (error) {
      console.error('生成文案失败:', error);
      alert('生成文案失败，请检查配置');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* 话题输入 */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">当前话题</label>
        <input
          type="text"
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="w-full bg-card border border-gray-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-accent"
          placeholder="输入或选择一个话题..."
        />
      </div>

      {/* 文案角度选择 */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3">选择文案角度</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {copyAngles.map((angle) => (
            <button
              key={angle.id}
              onClick={() => handleToggleAngle(angle.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                selectedAngles.includes(angle.id)
                  ? 'border-accent bg-accent/10'
                  : 'border-gray-700 bg-card hover:border-gray-600'
              }`}
            >
              {selectedAngles.includes(angle.id) && (
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${angle.color} rounded-t-xl`} />
              )}
              <span className="block font-medium text-sm mb-1">{angle.label}</span>
              <span className="block text-xs text-gray-500">{angle.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-accent to-orange-500 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Wand2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成文案 ({selectedAngles.length} 种角度)
            </>
          )}
        </button>
      </div>

      {/* 生成结果 */}
      {generatedCopies.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4">
            {generatedCopies.map((copy, index) => {
              const angleConfig = copyAngles.find((a) => a.id === copy.angle);
              return (
                <div
                  key={index}
                  className="bg-card border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${angleConfig?.color}`} />
                      <span className="font-medium">{copy.angle}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(copy.content, index)}
                      className="p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                    {copy.content}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
