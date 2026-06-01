export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const emoji: Record<string, string> = {
    douyin: '🎵',
    xiaohongshu: '📕',
    zhihu: '🤔',
    bilibili: '📺',
    maimai: '💼',
  };

  return <span className={className}>{emoji[platform] || '📌'}</span>;
}
