import { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Heart, 
  Search,
  Flame
} from 'lucide-react';
import { clsx } from 'clsx';

const platforms = [
  { 
    id: 'xiaohongshu', 
    label: '小红书', 
    icon: Heart,
    url: 'https://creator.xiaohongshu.com/',
    description: '发布笔记到小红书'
  },
  { 
    id: 'gongzhonghao', 
    label: '公众号', 
    icon: BookOpen,
    url: 'https://mp.weixin.qq.com/',
    description: '发布文章到公众号'
  },
  { 
    id: 'weibo', 
    label: '微博', 
    icon: MessageSquare,
    url: 'https://weibo.com/',
    description: '发布微博到微博'
  },
  { 
    id: 'douyin', 
    label: '抖音', 
    icon: Flame,
    url: 'https://creator.douyin.com/',
    description: '发布视频到抖音'
  },
];

export function ContentPublish() {
  const { generatedCopies, setActivePage, showToast, selectedTopic } = useAppStore();
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('xiaohongshu');

  const handlePublish = (platform: typeof platforms[0]) => {
    // 找到对应平台的文案
    const platformCopy = generatedCopies.find(c => {
      const platformMap: Record<string, string> = {
        'xiaohongshu': '小红书',
        'gongzhonghao': '公众号',
        'weibo': '微博',
        'douyin': '抖音',
      };
      return c.angle.includes(platformMap[platform.id]) || c.angle.includes(platform.label);
    });

    // 如果没找到，就用第一个
    const copyToUse = platformCopy || generatedCopies[0];

    if (copyToUse) {
      navigator.clipboard.writeText(copyToUse.content).then(() => {
        setCopiedPlatform(platform.id);
        showToast('文案已复制，正在跳转到发布页面...', 'success');
        
        setTimeout(() => {
          window.open(platform.url, '_blank');
          setCopiedPlatform(null);
        }, 500);
      }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
      });
    } else {
      showToast('请先生成文案', 'warning');
      setActivePage('forge');
    }
  };

  const handleCopy = async (text: string, platformId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlatform(platformId);
      showToast('已复制到剪贴板', 'success');
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      showToast('复制失败', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-[2.5rem] font-normal text-[#f5f0e8]" style={{ fontFamily: 'Georgia, "Times New Roman", "Songti SC", "STSong", serif' }}>
            一键发布
          </h1>
          <span className="text-[#6b6560] italic text-sm">One-click Publish</span>
        </div>
        <p className="text-[#a8a098] text-sm">
          将生成的文案快速发布到各平台
        </p>
      </div>

      {/* 引导卡片 */}
      <div className="mb-8 rounded-lg border border-[#3a342f] bg-[#211d1a] overflow-hidden">
        <div className="px-5 py-2.5 border-b border-[#2e2924] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#fb7185]" />
            <span className="text-xs font-medium text-[#f5f0e8] tracking-wider">
              快速发布流程
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="p-4 flex items-start gap-3 border-r border-[#2e2924] last:border-r-0">
            <div className="w-6 h-6 rounded-full bg-[rgba(251,113,133,0.12)] text-[#fb7185] text-xs font-mono font-semibold flex items-center justify-center border border-[rgba(251,113,133,0.30)] shrink-0">
              01
            </div>
            <div>
              <div className="text-xs font-medium text-[#f5f0e8] mb-0.5">选择文案</div>
              <div className="text-[11px] text-[#6b6560] leading-relaxed">
                在文案工坊生成好文案
              </div>
            </div>
          </div>
          <div className="p-4 flex items-start gap-3 border-r border-[#2e2924] last:border-r-0">
            <div className="w-6 h-6 rounded-full bg-[rgba(251,113,133,0.12)] text-[#fb7185] text-xs font-mono font-semibold flex items-center justify-center border border-[rgba(251,113,133,0.30)] shrink-0">
              02
            </div>
            <div>
              <div className="text-xs font-medium text-[#f5f0e8] mb-0.5">选择平台</div>
              <div className="text-[11px] text-[#6b6560] leading-relaxed">
                选择要发布的平台
              </div>
            </div>
          </div>
          <div className="p-4 flex items-start gap-3 border-r border-[#2e2924] last:border-r-0">
            <div className="w-6 h-6 rounded-full bg-[rgba(251,113,133,0.12)] text-[#fb7185] text-xs font-mono font-semibold flex items-center justify-center border border-[rgba(251,113,133,0.30)] shrink-0">
              03
            </div>
            <div>
              <div className="text-xs font-medium text-[#f5f0e8] mb-0.5">一键发布</div>
              <div className="text-[11px] text-[#6b6560] leading-relaxed">
                复制文案并跳转发布
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 平台选择 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-[#211d1a] border border-[#3a342f]">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isActive = selectedPlatform === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-120',
                  isActive 
                    ? 'bg-[#2a2522] text-[#fb7185]' 
                    : 'text-[#6b6560] hover:text-[#f5f0e8]'
                )}
              >
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />}
                <Icon className="w-3.5 h-3.5" />
                {platform.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#3a342f] to-transparent mb-6" />

      {/* 平台卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selectedPlatform === platform.id;
          return (
            <div
              key={platform.id}
              className={clsx(
                'rounded-lg border transition-all duration-160 overflow-hidden',
                isSelected
                  ? 'bg-[#211d1a] border-[#fb7185] shadow-lg'
                  : 'bg-[#211d1a] border-[#3a342f] hover:bg-[#2a2522] hover:border-[#4a443e] hover:-translate-y-0.5'
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-gradient-to-br from-[#fb7185] to-[#fbbf24]'
                      : 'bg-[#2a2522]'
                  )}>
                    <Icon className={clsx(
                      'w-5 h-5',
                      isSelected ? 'text-[#1a1715]' : 'text-[#a8a098]'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#f5f0e8] mb-1">
                      {platform.label}
                    </h3>
                    <p className="text-xs text-[#6b6560]">
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePublish(platform)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-120',
                      isSelected
                        ? 'bg-[#fb7185] text-[#1a1715] hover:bg-[#fda4af]'
                        : 'bg-[#2a2522] text-[#f5f0e8] hover:bg-[#332e2a]'
                    )}
                  >
                    {copiedPlatform === platform.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {copiedPlatform === platform.id ? '已复制' : '一键发布'}
                  </button>
                  <button
                    onClick={() => {
                      const copyToUse = generatedCopies[0];
                      if (copyToUse) {
                        handleCopy(copyToUse.content, platform.id);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-[#2a2522] text-[#a8a098] hover:bg-[#332e2a] hover:text-[#f5f0e8] transition-all duration-120"
                  >
                    {copiedPlatform === platform.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => window.open(platform.url, '_blank')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-[#2a2522] text-[#a8a098] hover:bg-[#332e2a] hover:text-[#f5f0e8] transition-all duration-120"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#3a342f] to-transparent my-6" />

      {/* 文案预览 */}
      {generatedCopies.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6b6560] tracking-widest uppercase">
                生成的文案
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {generatedCopies.map((copy, index) => (
              <div
                key={index}
                className="rounded-lg border border-[#3a342f] bg-[#211d1a] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#a8a098]">
                    {copy.angle}
                  </span>
                  <button
                    onClick={() => handleCopy(copy.content, `copy-${index}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#2a2522] text-[#a8a098] hover:bg-[#332e2a] hover:text-[#f5f0e8] transition-all duration-120"
                  >
                    {copiedPlatform === `copy-${index}` ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    复制
                  </button>
                </div>
                <div className="text-sm text-[#f5f0e8] whitespace-pre-wrap leading-relaxed">
                  {copy.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {generatedCopies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#2a2522] flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-[#6b6560]" />
          </div>
          <p className="text-sm text-[#a8a098] mb-3">
            还没有生成文案
          </p>
          <button
            onClick={() => setActivePage('forge')}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#fb7185] text-[#1a1715] hover:bg-[#fda4af] transition-all duration-120"
          >
            <Sparkles className="w-4 h-4" />
            去生成文案
          </button>
        </div>
      )}
    </div>
  );
}
