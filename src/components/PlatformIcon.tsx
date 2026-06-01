import { clsx } from 'clsx';

interface PlatformIconProps {
  platform: string;
  className?: string;
}

const platformConfig: Record<string, { label: string; color: string; bg: string; path: string }> = {
  douyin: {
    label: '抖',
    color: 'text-white',
    bg: 'bg-black',
    path: 'M10.5 2.5a.5.5 0 0 0-.5.5v9.5a2 2 0 1 0 2 2V9.5c2.5.5 4.5 0 5.5-1.5V6.5a.5.5 0 0 0-.5-.5A3.5 3.5 0 0 1 14 2.5a.5.5 0 0 0-.5-.5h-3Z',
  },
  xiaohongshu: {
    label: '红',
    color: 'text-white',
    bg: 'bg-[#ff2442]',
    path: 'M6 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6Zm0 1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm.5 3a.5.5 0 1 0 0 1h4a.5.5 0 1 0 0-1h-4Zm0 2a.5.5 0 1 0 0 1h4a.5.5 0 1 0 0-1h-4Zm0 2a.5.5 0 1 0 0 1h3a.5.5 0 1 0 0-1h-3Z',
  },
  zhihu: {
    label: '知',
    color: 'text-white',
    bg: 'bg-[#0066ff]',
    path: 'M7.5 3a.5.5 0 0 0-.4.8l1.5 2A.5.5 0 0 0 9 6V4.5h.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H6a.5.5 0 0 0 0 1h3.5a2.5 2.5 0 0 0 2.5-2.5V6a2.5 2.5 0 0 0-2.5-2.5H9V3a.5.5 0 0 0-.5-.5h-1ZM4 4.5A1.5 1.5 0 0 0 2.5 6v4A1.5 1.5 0 0 0 4 11.5h2a.5.5 0 0 1 .4.2l.6.8V10.5H9a.5.5 0 0 0 0-1H7V6a1.5 1.5 0 0 0-1.5-1.5H4Z',
  },
  bilibili: {
    label: 'B',
    color: 'text-white',
    bg: 'bg-[#fb7299]',
    path: 'M5 2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v1.5A2.5 2.5 0 0 0 8.5 10H9v.5a.5.5 0 0 0 1 0V10h.5A2.5 2.5 0 0 0 13 7.5V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H5Zm.5 1h8a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5ZM7 6h.5v1.5a1 1 0 0 0 2 0V6H11v1.5a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 7 7.5V6Z',
  },
  maimai: {
    label: '脉',
    color: 'text-white',
    bg: 'bg-[#0a7aff]',
    path: 'M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 13c0 1 .5 2 2 2h8c1.5 0 2-1 2-2 0-2-1.5-4.5-6-4.5S2 11 2 13Zm10.5-5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  },
};

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const config = platformConfig[platform];

  if (!config) {
    return (
      <div className={clsx('w-5 h-5 rounded flex items-center justify-center bg-bg-elevated text-caption font-bold text-text-tertiary', className)}>
        ?
      </div>
    );
  }

  return (
    <div
      className={clsx('w-5 h-5 rounded flex items-center justify-center shrink-0', config.bg, className)}
      title={platform}
    >
      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
        <path d={config.path} />
      </svg>
    </div>
  );
}
