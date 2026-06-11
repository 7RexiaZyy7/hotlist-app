import { useState, useEffect } from 'react';
import { X, Copy, Check, Heart, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { hookCategories, coverFormulaCategories, emojiCategories, endingCategories, type AssetItem } from '../data/assets';

interface AssetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const ALL_TABS = [
  { id: 'hooks', label: '开头钩子' },
  { id: 'covers', label: '封面公式' },
  { id: 'emojis', label: 'Emoji' },
  { id: 'endings', label: '互动结尾' },
  { id: 'favorites', label: '我的收藏' },
] as const;

const FAVORITES_KEY = 'assetLibrary_favorites';

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch { return []; }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

const tabCategoryMap: Record<string, { name: string; items: AssetItem[] }[]> = {
  hooks: hookCategories.map(c => ({ name: c.name, items: c.items })),
  covers: coverFormulaCategories.map(c => ({ name: c.name, items: c.items })),
  emojis: emojiCategories.map(c => ({ name: c.name, items: c.items })),
  endings: endingCategories.map(c => ({ name: c.name, items: c.items })),
};

function getAllItems(): AssetItem[] {
  return [...hookCategories, ...coverFormulaCategories, ...emojiCategories, ...endingCategories].flatMap(c => c.items);
}

const allItemsMap = new Map<string, AssetItem>();
getAllItems().forEach(item => allItemsMap.set(item.id, item));

export function AssetLibrary({ isOpen, onClose, showToast }: AssetLibraryProps) {
  const [activeTab, setActiveTab] = useState<string>('hooks');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setFavorites(loadFavorites());
    setExpandedCats({});
    setSearchQuery('');
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(next);
    saveFavorites(next);
  };

  const handleCopy = async (item: AssetItem) => {
    await navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
    showToast('已复制到剪贴板');
  };

  const toggleCat = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = (item: AssetItem) => {
    const isFav = favorites.includes(item.id);
    const isCopied = copiedId === item.id;
    return (
      <div key={item.id} className="card p-3 group hover:border-accent/40 transition-all duration-120">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-body-sm font-medium text-text-primary mb-0.5">{item.title}</div>
            <div className="text-caption text-text-secondary whitespace-pre-wrap break-all">{item.content}</div>
            {item.desc && (
              <div className="text-caption text-text-tertiary mt-1 italic">{item.desc}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleFavorite(item.id)}
              className={clsx(
                'p-1.5 rounded-md transition-all duration-120 opacity-0 group-hover:opacity-100',
                isFav ? 'text-red-400 opacity-100' : 'text-text-tertiary hover:text-text-primary'
              )}
              title={isFav ? '取消收藏' : '收藏'}
            >
              <Heart className={clsx('w-3.5 h-3.5', isFav && 'fill-red-400')} />
            </button>
            <button
              onClick={() => handleCopy(item)}
              className={clsx(
                'p-1.5 rounded-md transition-all duration-120',
                isCopied
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated opacity-0 group-hover:opacity-100'
              )}
              title="复制"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCategorySection = (cat: { name: string; items: AssetItem[] }) => {
    const catId = cat.name;
    const isExpanded = expandedCats[catId] !== false;
    return (
      <div key={catId} className="mb-3">
        <button
          onClick={() => toggleCat(catId)}
          className="flex items-center gap-1.5 w-full text-left text-body-sm font-medium text-text-secondary mb-1.5 hover:text-text-primary transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {cat.name}
          <span className="text-caption text-text-tertiary ml-auto">{cat.items.length}</span>
        </button>
        {isExpanded && (
          <div className="space-y-2">
            {cat.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  const favoriteItems = favorites
    .map(id => allItemsMap.get(id))
    .filter((item): item is AssetItem => !!item);

  const getContent = () => {
    if (activeTab === 'favorites') {
      if (favoriteItems.length === 0) {
        return (
          <div className="text-center py-12 text-text-tertiary">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-body-sm">还没有收藏的素材</p>
            <p className="text-caption mt-1">在素材上点 ♡ 即可收藏</p>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {favoriteItems.map(renderItem)}
        </div>
      );
    }

    const cats = tabCategoryMap[activeTab];
    if (!cats) return null;

    const filtered = searchQuery
      ? cats.map(c => ({
          ...c,
          items: c.items.filter(i =>
            i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.content.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        })).filter(c => c.items.length > 0)
      : cats;

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-text-tertiary">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-body-sm">没有匹配的素材</p>
        </div>
      );
    }

    return filtered.map(renderCategorySection);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[400px] max-w-[90vw] h-full bg-bg-surface border-l border-border flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="text-body font-semibold text-text-primary">素材库</h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索素材..."
              className="input-field w-full pl-8 text-body-sm"
            />
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0 border-b border-border">
          {ALL_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={clsx(
                'px-3 py-1.5 rounded-md text-caption font-medium whitespace-nowrap transition-all duration-120',
                activeTab === tab.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              {tab.label}
              {tab.id === 'favorites' && favorites.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent-subtle text-accent text-caption">{favorites.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {getContent()}
        </div>
      </div>
    </div>
  );
}
