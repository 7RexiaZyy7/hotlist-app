import { useState, useMemo } from 'react';
import { Target, Smile, Users, Clock, AlertTriangle, Lightbulb, Sparkles, Copy, Check, ChevronRight, Video, BookOpen, Tv, FileText, MessageCircle, PenSquare } from 'lucide-react';
import { clsx } from 'clsx';

interface WhyHotItem { label: string; value: string; }
interface PlatformDiffItem { platform: string; angles: string; comments: string; }
interface AngleItem { index: number; type: string; title: string; platforms: string; effect: string; }
interface KeyValueItem { label: string; value: string; }

export interface ParsedAnalysis {
  whyHot: WhyHotItem[];
  platformDiff: PlatformDiffItem[];
  angles: AngleItem[];
  risks: KeyValueItem[];
  suggestions: KeyValueItem[];
}

const WHY_HOT_ICONS: Record<string, typeof Target> = {
  触发事件: Target,
  情绪特征: Smile,
  受众画像: Users,
  时间窗口: Clock,
};

const PLATFORM_ICONS: Record<string, typeof Video> = {
  抖音: Video,
  小红书: BookOpen,
  知乎: BookOpen,
  B站: Tv,
  微博: MessageCircle,
  公众号: FileText,
};

export function parseAnalysis(text: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    whyHot: [],
    platformDiff: [],
    angles: [],
    risks: [],
    suggestions: [],
  };

  const cleaned = text.replace(/^#\s*话题[：:].*$/m, '').trim();
  const sections = cleaned.split(/^##\s+/m).filter(s => s.trim());

  for (const section of sections) {
    const newlineIdx = section.indexOf('\n');
    const header = (newlineIdx === -1 ? section : section.substring(0, newlineIdx)).trim();
    const body = newlineIdx === -1 ? '' : section.substring(newlineIdx + 1);

    if (header.includes('为什么火')) {
      result.whyHot = parseKeyValueList(body);
    } else if (header.includes('各平台讨论差异')) {
      result.platformDiff = parseMarkdownTable(body);
    } else if (header.includes('建议切入角度')) {
      result.angles = parseAngles(body);
    } else if (header.includes('风险提示')) {
      result.risks = parseKeyValueList(body);
    } else if (header.includes('创作建议')) {
      result.suggestions = parseKeyValueList(body);
    }
  }

  if (!hasAnalysisContent(result)) {
    return heuristicParse(text);
  }

  return result;
}

function heuristicParse(fullText: string): ParsedAnalysis {
  const result: ParsedAnalysis = { whyHot: [], platformDiff: [], angles: [], risks: [], suggestions: [] };
  const lines = fullText.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^\d+[.\uff0e、]\s*【/.test(line)) {
      const parsed = parseAngles(line);
      if (parsed.length > 0) result.angles.push(...parsed);
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
      if (cells.length >= 3 && !/^[\s-:|]+$/.test(cells.join(''))) {
        result.platformDiff.push({ platform: cells[0], angles: cells[1], comments: cells[2] });
      }
      continue;
    }

    const kvMatch = line.match(/^[-*]\s*(.+?)[：:]\s*(.+)$/);
    if (kvMatch) {
      result.whyHot.push({ label: kvMatch[1].trim(), value: kvMatch[2].trim() });
    }
  }

  return result;
}

function parseKeyValueList(body: string): KeyValueItem[] {
  const lines = body.split('\n');
  const items: KeyValueItem[] = [];
  let current: KeyValueItem | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^[-*]\s*(.+?)[：:]\s*(.+)$/);
    if (m) {
      if (current) items.push(current);
      current = { label: m[1].trim(), value: m[2].trim() };
    } else if (current) {
      current.value += '\n' + line;
    }
  }
  if (current) items.push(current);
  return items;
}

function parseMarkdownTable(body: string): PlatformDiffItem[] {
  const lines = body.split('\n').filter(l => l.trim().startsWith('|'));
  const dataLines = lines.filter(l => !/^\|[\s-:|]+\|$/.test(l.trim()));
  const rows = dataLines.slice(1);

  return rows.map(line => {
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cells.length >= 3) {
      return { platform: cells[0], angles: cells[1], comments: cells[2] };
    }
    return null;
  }).filter((x): x is PlatformDiffItem => x !== null);
}

function parseAngles(body: string): AngleItem[] {
  const lines = body.split('\n').filter(l => /^\d+[.\uff0e、]/.test(l.trim()));
  return lines.map((line, i) => {
    const typeMatch = line.match(/【(.+?)】/);
    const titleMatch = line.match(/标题[：:]\s*\**\s*(.+?)\s*\**\s*(?:，|,)/);
    const platformMatch = line.match(/适合平台[：:]\s*(.+?)(?:[，,]|$)/);
    const effectMatch = line.match(/预估效果[：:]\s*(.+?)$/);

    let title = titleMatch?.[1]?.trim() || '';
    title = title.replace(/^\*\*|\*\*$/g, '').replace(/^《|》$/g, '').trim();

    return {
      index: i + 1,
      type: typeMatch?.[1]?.trim() || '',
      title,
      platforms: platformMatch?.[1]?.trim() || '',
      effect: effectMatch?.[1]?.trim() || '',
    };
  });
}

export function hasAnalysisContent(parsed: ParsedAnalysis): boolean {
  return parsed.whyHot.length > 0
    || parsed.platformDiff.length > 0
    || parsed.angles.length > 0
    || parsed.risks.length > 0
    || parsed.suggestions.length > 0;
}

interface AnalysisRendererProps {
  topic: string;
  analysis: string;
  onWriteCopy: () => void;
}

export function AnalysisRenderer({ topic, analysis, onWriteCopy }: AnalysisRendererProps) {
  const parsed = useMemo(() => parseAnalysis(analysis), [analysis]);
  const [activePlatform, setActivePlatform] = useState<string>('');
  const [copiedAngle, setCopiedAngle] = useState<number | null>(null);

  if (!hasAnalysisContent(parsed)) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-body font-medium text-text-primary">{topic}</h4>
          <button onClick={onWriteCopy} className="btn-primary !py-1 !px-2 !text-caption flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            写文案
          </button>
        </div>
        <div className="p-3 rounded-md bg-warning/10 border border-warning/30 text-caption text-text-secondary">
          解析失败，显示原始内容：
        </div>
        <div className="text-body-sm text-text-secondary whitespace-pre-wrap leading-relaxed mt-3">
          {analysis}
        </div>
      </div>
    );
  }

  const currentPlatform = activePlatform || parsed.platformDiff[0]?.platform || '';
  const activePlatformData = parsed.platformDiff.find(p => p.platform === currentPlatform) || parsed.platformDiff[0];

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAngle(idx);
      setTimeout(() => setCopiedAngle(null), 2000);
    } catch {}
  };

  return (
    <div className="card p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-body font-medium text-text-primary">{topic}</h4>
        <button onClick={onWriteCopy} className="btn-primary !py-1 !px-2 !text-caption flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          写文案
        </button>
      </div>

      {parsed.whyHot.length > 0 && (
        <section>
          <SectionHeader title="为什么火" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {parsed.whyHot.map((item, i) => {
              const Icon = WHY_HOT_ICONS[item.label] || Target;
              return (
                <div key={i} className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-text-tertiary">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-caption">{item.label}</span>
                  </div>
                  <p className="text-body-sm text-text-primary leading-relaxed">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {parsed.platformDiff.length > 0 && (
        <section>
          <SectionHeader title="各平台讨论差异" />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {parsed.platformDiff.map((p) => {
              const Icon = PLATFORM_ICONS[p.platform] || FileText;
              const isActive = p.platform === currentPlatform;
              return (
                <button
                  key={p.platform}
                  onClick={() => setActivePlatform(p.platform)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-all duration-120',
                    isActive
                      ? 'bg-accent-subtle text-accent border border-accent'
                      : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {p.platform}
                </button>
              );
            })}
          </div>
          {activePlatformData && (
            <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
              <div>
                <div className="text-caption text-text-tertiary mb-1.5">讨论角度</div>
                <p className="text-body-sm text-text-primary leading-relaxed">{activePlatformData.angles}</p>
              </div>
              <div>
                <div className="text-caption text-text-tertiary mb-1.5">热门评论</div>
                <p className="text-body-sm text-text-secondary leading-relaxed">{activePlatformData.comments}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {parsed.angles.length > 0 && (
        <section>
          <SectionHeader title={`建议切入角度 (${parsed.angles.length})`} />
          <div className="space-y-2.5">
            {parsed.angles.map((angle) => (
              <div key={angle.index} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-body-sm font-mono text-text-tertiary shrink-0 mt-0.5">#{angle.index}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="badge !text-accent !border-accent">{angle.type}</span>
                      {angle.platforms && (
                        <span className="text-caption text-text-tertiary flex items-center gap-0.5">
                          <ChevronRight className="w-3 h-3" />
                          {angle.platforms}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <p className="flex-1 text-body text-text-primary font-medium leading-snug">{angle.title}</p>
                      <button
                        onClick={() => handleCopy(angle.title, angle.index)}
                        className="shrink-0 p-1.5 rounded-md bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                        title="复制标题"
                      >
                        {copiedAngle === angle.index ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {angle.effect && (
                      <p className="text-body-sm text-text-secondary leading-relaxed">{angle.effect}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {parsed.risks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h5 className="text-body-sm font-semibold text-text-primary">风险提示</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {parsed.risks.map((item, i) => (
              <div key={i} className="bg-warning/5 border border-warning/30 rounded-lg p-3">
                <div className="text-caption text-text-tertiary mb-1">{item.label}</div>
                <p className="text-body-sm text-text-primary leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {parsed.suggestions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-accent" />
            <h5 className="text-body-sm font-semibold text-text-primary">创作建议</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {parsed.suggestions.map((item, i) => (
              <div key={i} className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                <div className="text-caption text-text-tertiary mb-1">{item.label}</div>
                <p className="text-body-sm text-text-primary leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <PenSquare className="w-4 h-4 text-accent" />
      <h5 className="text-body-sm font-semibold text-text-primary">{title}</h5>
    </div>
  );
}
