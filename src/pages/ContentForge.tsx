import { useState } from 'react';
import { useAppStore } from '../store';
import { Sparkles, Copy, Check, Wand2, MessageSquare } from 'lucide-react';
import { 
  callCozeChat, 
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
    cozeUid,
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
    try {
      const { checkAndIncrementQuota } = useAppStore.getState();
      const allowed = await checkAndIncrementQuota();
      if (!allowed) { setGenerating(false); return; }

      const query = buildCopyGenerateQuery(selectedTopic, selectedAngles, userProfile);
      const content = await callCozeChat(query);

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
        showToast(`已生成 ${selectedAngles.length} 种角度的文案`);
      }
    } catch (error) {
      console.error('生成失败:', error);
      showToast(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
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
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">文案角度</label>
        <div className="flex flex-wrap gap-1.5">
          {copyAngles.map((angle) => (
            <button
              key={angle.id}
              onClick={() => handleToggleAngle(angle.id)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                selectedAngles.includes(angle.id)
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-gray-700 bg-card text-gray-400 hover:border-gray-500'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>
      </div>

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

      {!isGenerating && generatedCopies.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg mb-1">选择一个话题和角度开始创作</p>
          <p className="text-sm">也可以去热榜选个热门话题</p>
        </div>
      )}
    </div>
  );
}