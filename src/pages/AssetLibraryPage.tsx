import { useState } from 'react';
import { useAppStore } from '../store';
import { Box, Copy, Check, Heart, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { hookCategories, coverFormulaCategories, emojiCategories, endingCategories, type AssetItem, type AssetCategory } from '../data/assets';

const ALL_TABS = [
  { id: 'hooks', label: '开头钩子' },
  { id: 'covers', label: '封面公式' },
  { id: 'emojis', label: 'Emoji' },
  { id: 'endings', label: '互动结尾' },
  { id: 'favorites', label: '我的收藏' },
] as const;

const FAVORITES_KEY = 'assetLibrary_favorites';

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
  catch { return []; }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function collectCategories(): { label: string; categories: AssetCategory[] }[] {
  return [
    { label: '开头钩子', categories: hookCategories },
    { label: '封面公式', categories: coverFormulaCategories },
    { label: 'Emoji', categories: emojiCategories },
    { label: '互动结尾', categories: endingCategories },
  ];
}

export function AssetLibraryPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<string>('hooks');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('已复制');
    } catch {}
  };

  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    saveFavorites(updated);
  };

  const categories = collectCategories();
  const allItems = categories.flatMap(c => c.categories.flatMap(cat => cat.items));

  const filteredItems = (items: AssetItem[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q));
  };

  const currentGroup = categories.find(c => c.label === ALL_TABS.find(t => t.id === activeTab)?.label);
  const displayItems = activeTab === 'favorites'
    ? allItems.filter(i => favorites.includes(i.id))
    : filteredItems(currentGroup?.categories.flatMap(cat => cat.items) || []);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6">
        <h2 className="text-display text-text-primary mb-1 flex items-center gap-2">
          <Box className="w-5 h-5 text-accent" />
          素材库
        </h2>
        <p className="text-body-sm text-text-secondary">精选爆款钩子、封面公式、Emoji 和互动结尾，一键复制使用</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索素材..."
            className="input-field w-full pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
        {ALL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-body-sm font-medium transition-all shrink-0',
              activeTab === tab.id
                ? 'bg-accent-subtle text-accent border border-accent'
                : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.id === 'favorites' && favorites.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-white">{favorites.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid gap-2">
        {displayItems.length === 0 ? (
          <div className="card p-8 text-center">
            <Box className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-body-sm text-text-secondary">
              {searchQuery ? '未找到匹配素材' : activeTab === 'favorites' ? '还没有收藏素材' : '暂无素材'}
            </p>
          </div>
        ) : (
          displayItems.map(item => {
            const isCopied = copiedId === item.id;
            const isFav = favorites.includes(item.id);
            return (
              <div
                key={item.id}
                className="card p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-text-primary leading-relaxed">{item.content}</p>
                  {item.desc && (
                    <p className="text-caption text-text-tertiary mt-0.5">{item.desc}</p>
                  )}
                  <p className="text-caption text-accent mt-0.5">{item.title}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className={clsx('p-1.5 rounded-md transition-all', isFav ? 'text-error' : 'text-text-tertiary hover:text-error')}
                    title={isFav ? '取消收藏' : '收藏'}
                  >
                    <Heart className={clsx('w-3.5 h-3.5', isFav && 'fill-current')} />
                  </button>
                  <button
                    onClick={() => handleCopy(item.content, item.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-accent-subtle text-accent text-caption font-medium hover:bg-accent/20 transition-all"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}