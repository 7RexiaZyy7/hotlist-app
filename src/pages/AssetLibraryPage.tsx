import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Box, Copy, Check, Heart, Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { hookCategories, coverFormulaCategories, emojiCategories, endingCategories, type AssetItem, type AssetCategory } from '../data/assets';

interface CustomAsset {
  id: string;
  content: string;
  desc: string;
  tags: string[];
  createdAt: number;
}

const ALL_TABS = [
  { id: 'hooks', label: '开头钩子' },
  { id: 'covers', label: '封面公式' },
  { id: 'emojis', label: 'Emoji' },
  { id: 'endings', label: '互动结尾' },
  { id: 'custom', label: '自定义' },
  { id: 'favorites', label: '我的收藏' },
] as const;

const FAVORITES_KEY = 'assetLibrary_favorites';
const CUSTOM_ASSETS_KEY = 'assetLibrary_custom';

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
  catch { return []; }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function loadCustomAssets(): CustomAsset[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_ASSETS_KEY) || '[]'); }
  catch { return []; }
}

function saveCustomAssets(assets: CustomAsset[]) {
  localStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(assets));
}

function collectCategories(): { label: string; categories: AssetCategory[] }[] {
  return [
    { label: '开头钩子', categories: hookCategories },
    { label: '封面公式', categories: coverFormulaCategories },
    { label: 'Emoji', categories: emojiCategories },
    { label: '互动结尾', categories: endingCategories },
  ];
}

function customToAssetItem(c: CustomAsset): AssetItem {
  return { id: c.id, title: c.tags.join(', ') || '自定义', content: c.content, desc: c.desc };
}

export function AssetLibraryPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<string>('hooks');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [customAssets, setCustomAssets] = useState<CustomAsset[]>(loadCustomAssets);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CustomAsset | null>(null);
  const [formContent, setFormContent] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTags, setFormTags] = useState('');

  useEffect(() => { saveCustomAssets(customAssets); }, [customAssets]);

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

  const openNew = () => {
    setEditingAsset(null);
    setFormContent('');
    setFormDesc('');
    setFormTags('');
    setShowModal(true);
  };

  const openEdit = (a: CustomAsset) => {
    setEditingAsset(a);
    setFormContent(a.content);
    setFormDesc(a.desc);
    setFormTags(a.tags.join('、'));
    setShowModal(true);
  };

  const saveAsset = () => {
    if (!formContent.trim()) { showToast('请输入素材内容', 'warning'); return; }
    const tags = formTags.split(/[、,，\s]+/).filter(Boolean);
    if (editingAsset) {
      setCustomAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, content: formContent.trim(), desc: formDesc.trim(), tags } : a));
      showToast('已更新');
    } else {
      const newAsset: CustomAsset = { id: 'custom_' + Date.now(), content: formContent.trim(), desc: formDesc.trim(), tags, createdAt: Date.now() };
      setCustomAssets(prev => [newAsset, ...prev]);
      showToast('已添加');
    }
    setShowModal(false);
  };

  const deleteAsset = (id: string) => {
    setCustomAssets(prev => prev.filter(a => a.id !== id));
    const updatedFav = favorites.filter(f => f !== id);
    setFavorites(updatedFav);
    saveFavorites(updatedFav);
    showToast('已删除');
  };

  const categories = collectCategories();
  const builtinItems = categories.flatMap(c => c.categories.flatMap(cat => cat.items));
  const customItems = customAssets.map(customToAssetItem);
  const allItems = [...builtinItems, ...customItems];

  const filteredItems = (items: AssetItem[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q));
  };

  const getDisplayItems = () => {
    if (activeTab === 'favorites') return allItems.filter(i => favorites.includes(i.id));
    if (activeTab === 'custom') return filteredItems(customItems);
    const group = categories.find(c => c.label === ALL_TABS.find(t => t.id === activeTab)?.label);
    return filteredItems(group?.categories.flatMap(cat => cat.items) || []);
  };
  const displayItems = getDisplayItems();

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-shell mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-display text-text-primary mb-1 flex items-center gap-2">
            <Box className="w-5 h-5 text-accent" />
            素材库
          </h2>
          <p className="text-body-sm text-text-secondary">精选爆款钩子、封面公式、Emoji 和互动结尾，一键复制使用</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium bg-accent text-white hover:bg-accent-hover transition-all shrink-0">
          <Plus className="w-4 h-4" />
          新增素材
        </button>
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
            {tab.id === 'custom' && customAssets.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-tertiary">{customAssets.length}</span>
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
              {searchQuery ? '未找到匹配素材' : activeTab === 'favorites' ? '还没有收藏素材' : activeTab === 'custom' ? '还没有自定义素材，点击右上角「新增素材」添加' : '暂无素材'}
            </p>
          </div>
        ) : (
          displayItems.map(item => {
            const isCopied = copiedId === item.id;
            const isFav = favorites.includes(item.id);
            const isCustom = item.id.startsWith('custom_');
            const customAsset = isCustom ? customAssets.find(a => a.id === item.id) : null;
            return (
              <div
                key={item.id}
                className="card p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-text-primary leading-relaxed">{item.content}</p>
                  {item.desc && <p className="text-caption text-text-tertiary mt-0.5">{item.desc}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-caption text-accent">{item.title}</p>
                    {isCustom && <span className="text-caption text-text-tertiary">· 自定义</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isCustom && (
                    <>
                      <button onClick={() => customAsset && openEdit(customAsset)} className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-bg-elevated transition-all" title="编辑">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteAsset(item.id)} className="p-1.5 rounded-md text-text-tertiary hover:text-error hover:bg-bg-elevated transition-all" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
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

      {/* Add/Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-semibold text-text-primary">{editingAsset ? '编辑素材' : '新增素材'}</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-elevated">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-caption text-text-secondary mb-1 block">内容 *</label>
                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="粘贴或输入素材内容..." className="input-field w-full min-h-[100px] resize-y" />
              </div>
              <div>
                <label className="text-caption text-text-secondary mb-1 block">说明</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="这个素材的用途或说明（可选）" className="input-field w-full" />
              </div>
              <div>
                <label className="text-caption text-text-secondary mb-1 block">标签</label>
                <input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="用顿号或空格分隔，如：开头钩子 情感共鸣（可选）" className="input-field w-full" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-body-sm font-medium text-text-secondary hover:text-text-primary bg-bg-surface border border-border transition-all">取消</button>
                <button onClick={saveAsset} className="px-4 py-2 rounded-md text-body-sm font-medium bg-accent text-white hover:bg-accent-hover transition-all">{editingAsset ? '保存' : '添加'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}