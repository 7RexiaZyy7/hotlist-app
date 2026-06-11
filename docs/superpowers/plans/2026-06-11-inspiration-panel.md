# 灵感面板 + 文案收藏 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在文案工坊内添加 AI 灵感推荐面板和文案收藏系统，移除原有的静态素材库

**架构：**
- 在 ContentForge.tsx 内嵌灵感面板组件，调用 Coze API 根据当前话题+角度实时生成切入建议
- 文案收藏存入 localStorage，按话题聚类展示在灵感面板下方
- 删除 `data/assets.ts`、`AssetLibrary.tsx`、`AssetLibraryPage.tsx` 及相关引用

**技术栈：** React + TypeScript + Zustand + Coze API + localStorage

---

## 文件清单

### 删除
- `src/data/assets.ts` — 整个文件
- `src/components/AssetLibrary.tsx` — 整个文件
- `src/pages/AssetLibraryPage.tsx` — 整个文件

### 修改
- `src/services/cozeApi.ts` — 新增 `buildInspirationPrompt()` 函数
- `src/pages/ContentForge.tsx` — 移除 AssetLibrary 引用和状态，添加灵感面板和收藏系统
- `src/components/Sidebar.tsx` — 移除「素材库」导航条目
- `src/App.tsx` — 移除 mobileNavItems 中的「素材」条目和 `AssetLibraryPage` import

### 不修改（保留现有功能）
- `src/store/index.ts` — `analysisHistory`、`generatedCopies`、额度逻辑等都不变
- `src/pages/HotRadar.tsx` — 不涉及
- `src/pages/TopicExplorer.tsx` — 不涉及

---

### 任务 1：清理旧素材库代码

**文件：**
- 删除：`src/data/assets.ts`
- 删除：`src/components/AssetLibrary.tsx`
- 删除：`src/pages/AssetLibraryPage.tsx`
- 修改：`src/components/Sidebar.tsx`
- 修改：`src/App.tsx`

- [ ] **步骤 1：删除三个文件**

删除 `src/data/assets.ts`、`src/components/AssetLibrary.tsx`、`src/pages/AssetLibraryPage.tsx`。

- [ ] **步骤 2：修改 Sidebar.tsx — 移除「素材库」导航**

移除 navItems 中的 `{ id: 'assets', label: '素材库', icon: Box }` 条目，并移除不再使用的 `Box` import。

- [ ] **步骤 3：修改 App.tsx — 移除素材库条目和 import**

从 `mobileNavItems` 移除 `{ id: 'assets', label: '素材', icon: Box }`。
移除 `import { AssetLibraryPage } from './pages/AssetLibraryPage';`。
从 renderPage switch 中移除 `case 'assets': return <AssetLibraryPage />;`。
从 import 行移除 `Box`（仅当 `Box` 不再被使用）。

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "refactor: remove static asset library data, components, and page"
```

---

### 任务 2：新增 buildInspirationPrompt API 函数

**文件：**
- 修改：`src/services/cozeApi.ts`（末尾，在 `buildRewriteQuery` 之后）

- [ ] **步骤 1：在 buildRewriteQuery 后添加 buildInspirationPrompt**

```typescript
export function buildInspirationPrompt(topic: string, angles: string[], profileText?: string): string {
  let query = `你是一个爆款文案灵感助手。用户正在创作以下话题，需要切入思路的建议。

话题：${topic}
选中的创作角度：${angles.join('、')}

请为每个角度提供 1-2 条具体的切入建议。每条建议用简短的 1-3 句话描述如何从该角度展开。

具体要求：
- 每条建议直接写内容思路，不要写「建议：」这类前缀
- 每条建议末尾用方括号标注对应的角度名称
- 如果合适，可以在建议中给出具体的开头句子示例
- 优先推荐有传播潜力的切入方式（反常识、痛点共鸣、悬念、数据冲击等）
- 每条建议占一段，段间用空行分隔

输出示例格式：
从"我30岁那年被裁了"切入，讲述转型过程，用时间线制造代入感。[情感共鸣]

用"35岁危机是伪命题"作为反常识开头，用数据证明35岁后收入翻倍的人群比例。[观点评论]`;

  if (profileText) {
    query += `\n\n用户偏好：\n${profileText}`;
  }

  return query;
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/services/cozeApi.ts
git commit -m "feat: add buildInspirationPrompt for AI-powered inspiration suggestions"
```

---

### 任务 3：ContentForge — 清理 AssetLibrary 引用

**文件：**
- 修改：`src/pages/ContentForge.tsx`

- [ ] **步骤 1：移除 AssetLibrary import 和 lucide-react 中不再使用的图标**

将：
```typescript
import { Sparkles, Copy, Check, RefreshCw, Wand2, FileText, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare, Box, Columns3, X } from 'lucide-react';
import { AssetLibrary } from '../components/AssetLibrary';
```

改为：
```typescript
import { Sparkles, Copy, Check, RefreshCw, Wand2, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare, Columns3, X, Star } from 'lucide-react';
```

（移除 `FileText`、`Box`，新增 `Star`）

- [ ] **步骤 2：移除 showAssetLibrary 状态和 AssetLibrary JSX**

移除：
```typescript
const [showAssetLibrary, setShowAssetLibrary] = useState(false);
```

在 JSX 中移除：
```tsx
<AssetLibrary isOpen={showAssetLibrary} onClose={() => setShowAssetLibrary(false)} showToast={showToast} />
```

移除 creat-mode 输入框中的素材库按钮：
```tsx
<button onClick={() => setShowAssetLibrary(true)} className="btn-ghost shrink-0" title="素材库">
  <Box className="w-4 h-4" />
</button>
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/ContentForge.tsx
git commit -m "refactor: remove AssetLibrary references from ContentForge"
```

---

### 任务 4：ContentForge — 添加灵感面板状态和逻辑

**文件：**
- 修改：`src/pages/ContentForge.tsx`

- [ ] **步骤 1：新增状态变量**

在 ContentForge 函数内，现有 useState 区块后添加：

```typescript
interface InspirationSuggestion {
  content: string;
  angle: string;
}

const [inspirationResults, setInspirationResults] = useState<InspirationSuggestion[]>([]);
const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);
const [generationHint, setGenerationHint] = useState('');
const [showSavedCopies, setShowSavedCopies] = useState(false);
const inspirationCacheRef = useRef<Map<string, InspirationSuggestion[]>>(new Map());

// 收藏文案
interface SavedCopyItem {
  id: string;
  content: string;
  angle: string;
  topic: string;
  timestamp: number;
}

const SAVED_COPIES_KEY = 'savedCopies';

function loadSavedCopies(): SavedCopyItem[] {
  try { return JSON.parse(localStorage.getItem(SAVED_COPIES_KEY) || '[]'); }
  catch { return []; }
}

function saveSavedCopies(items: SavedCopyItem[]) {
  localStorage.setItem(SAVED_COPIES_KEY, JSON.stringify(items));
}

const [savedCopies, setSavedCopies] = useState<SavedCopyItem[]>(loadSavedCopies);
```

- [ ] **步骤 2：添加 handleGetInspiration 函数**

在 `handleGenerate` 之前添加：

```typescript
const handleGetInspiration = async () => {
  if (!selectedTopic.trim() || selectedAngles.length === 0) return;

  const cacheKey = selectedTopic.trim() + '||' + [...selectedAngles].sort().join(',');
  const cached = inspirationCacheRef.current.get(cacheKey);
  if (cached) {
    setInspirationResults(cached);
    return;
  }

  const ok = await checkAndIncrementQuota();
  if (!ok) return;

  setIsLoadingInspiration(true);
  try {
    const profile = getUserProfileFromStorage();
    const profileText = formatProfileForPrompt(profile);
    const query = buildInspirationPrompt(selectedTopic.trim().slice(0, 100), selectedAngles.slice(0, 3), profileText);
    const result = await callCozeChat(query);
    const parsed = parseInspirationResult(result, selectedAngles);
    inspirationCacheRef.current.set(cacheKey, parsed);
    setInspirationResults(parsed);
  } catch {
    showToast('获取灵感失败', 'error');
  } finally {
    setIsLoadingInspiration(false);
  }
};
```

- [ ] **步骤 3：添加 parseInspirationResult 工具函数**

在 `splitTitleBody` 之后（文件末尾）添加：

```typescript
function parseInspirationResult(text: string, selectedAngles: string[]): InspirationSuggestion[] {
  const lines = text.split('\n').filter(l => l.trim());
  const suggestions: InspirationSuggestion[] = [];

  for (const line of lines) {
    const angleMatch = line.match(/\[(.+?)\]$/);
    if (angleMatch) {
      const angle = angleMatch[1].trim();
      const content = line.replace(/\[.+?\]$/, '').trim();
      if (content && selectedAngles.some(a => angle.includes(a) || a.includes(angle))) {
        suggestions.push({ content, angle });
      } else if (content) {
        suggestions.push({ content, angle: selectedAngles[0] });
      }
    }
  }

  if (suggestions.length === 0) {
    lines.forEach(line => {
      const clean = line.replace(/^\d+[\.\uff0e、]\s*/, '').trim();
      if (clean && clean.length > 10) {
        suggestions.push({ content: clean, angle: selectedAngles[0] || '' });
      }
    });
  }

  return suggestions.slice(0, 6);
}
```

- [ ] **步骤 4：添加收藏/取消收藏函数**

在 `handleGenerate` 之后、`handleConvert` 之前添加：

```typescript
const handleToggleSaveCopy = (copy: GeneratedCopy) => {
  const exists = savedCopies.find(c => c.content === copy.content);
  if (exists) {
    setSavedCopies(prev => { const next = prev.filter(c => c.id !== exists.id); saveSavedCopies(next); return next; });
    showToast('已取消收藏');
  } else {
    const item: SavedCopyItem = { id: 'sv_' + Date.now(), content: copy.content, angle: copy.angle, topic: selectedTopic, timestamp: Date.now() };
    setSavedCopies(prev => {
      let next = [item, ...prev];
      if (next.length > 50) next = next.slice(0, 50);
      saveSavedCopies(next);
      return next;
    });
    showToast('已收藏');
  }
};

const isCopySaved = (content: string) => savedCopies.some(c => c.content === content);
```

- [ ] **步骤 5：监听话题/角度变化，清空灵感结果**

添加到 useEffect 区块中：

```typescript
useEffect(() => {
  setInspirationResults([]);
  setGenerationHint('');
}, [selectedTopic, selectedAngles]);
```

- [ ] **步骤 6：在 handleGenerate 中接入 generationHint**

修改 `buildCopyGenerateQuery` 调用，把 `generationHint` 传入：

```typescript
// 创建模式的分支中，buildCopyGenerateQuery 调用前
let query = buildCopyGenerateQuery(selectedTopic, selectedAngles, profileVars, lastAnalysis);
if (generationHint) {
  query += `\n\n侧重方向（请重点参考以下思路）：\n${generationHint}`;
}
```

- [ ] **步骤 7：Commit**

```bash
git add src/pages/ContentForge.tsx
git commit -m "feat: add inspiration panel state, logic, and copy save system"
```

---

### 任务 5：ContentForge — 渲染灵感面板和收藏区 JSX

**文件：**
- 修改：`src/pages/ContentForge.tsx`

- [ ] **步骤 1：更新 lucide-react import**

在 import 行中移除 `FileText`、`Box`，新增 `Star`、`ChevronDown`。

```typescript
import { Sparkles, Copy, Check, RefreshCw, Wand2, Heart, BookOpen, MessageSquare, Flame, Rocket, Search, Smile, Book, Lightbulb, HelpCircle, GitCompare, Columns3, X, Star, ChevronDown } from 'lucide-react';
```

- [ ] **步骤 2：在角度选择下方、生成提示上方添加灵感面板 JSX**

在角度选择区块 `{forgeMode === 'create' && (...角度按钮...)}` 之后、`{isGenerating ? ...` 之前添加：

```tsx
      {/* 灵感面板（仅创作模式） */}
      {forgeMode === 'create' && (
        <div className="mb-6">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body-sm font-medium text-text-primary flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-accent" />
                灵感推荐
              </h3>
              {selectedTopic.trim() && selectedAngles.length > 0 && (
                <button
                  onClick={handleGetInspiration}
                  disabled={isLoadingInspiration}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium bg-accent-subtle text-accent border border-accent hover:bg-accent/20 transition-all disabled:opacity-40"
                >
                  {isLoadingInspiration ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isLoadingInspiration ? '获取中...' : inspirationResults.length > 0 ? '刷新灵感' : '获取灵感'}
                </button>
              )}
            </div>

            {!selectedTopic.trim() || selectedAngles.length === 0 ? (
              <p className="text-caption text-text-tertiary">
                {!selectedTopic.trim()
                  ? '输入话题并选择角度后，AI 为你推荐切入思路'
                  : '先选择创作角度，AI 会针对每个角度推荐最佳切入点'}
              </p>
            ) : inspirationResults.length === 0 && !isLoadingInspiration ? (
              <p className="text-caption text-text-tertiary">点击「获取灵感」，AI 会根据话题和角度推荐切入思路</p>
            ) : isLoadingInspiration ? (
              <div className="flex items-center gap-2 text-caption text-text-tertiary">
                <RefreshCw className="w-3 h-3 animate-spin" />
                正在生成灵感...
              </div>
            ) : (
              <div className="space-y-2">
                {inspirationResults.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-surface border border-border group hover:border-accent/30 transition-all">
                    <div className="w-1 self-stretch shrink-0 rounded-full bg-accent/50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-text-primary leading-relaxed">{item.content}</p>
                      {item.angle && (
                        <span className="inline-block mt-1 text-caption px-1.5 py-0.5 rounded-sm bg-accent-subtle text-accent">{item.angle}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { navigator.clipboard.writeText(item.content); showToast('已复制'); }}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-all"
                        title="复制"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (item.angle && !selectedAngles.includes(item.angle)) {
                            setSelectedAngles([...selectedAngles, item.angle]);
                          }
                          setGenerationHint(item.content);
                          showToast('已采用此角度方向');
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-caption font-medium bg-accent text-white hover:bg-accent-hover transition-all"
                        title="使用此角度"
                      >
                        <Sparkles className="w-3 h-3" />
                        用这个
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 收藏的文案 */}
          {savedCopies.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowSavedCopies(!showSavedCopies)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption text-text-tertiary hover:text-text-primary transition-all w-full text-left"
              >
                <Star className="w-3.5 h-3.5" />
                <span>收藏的文案</span>
                <span className="text-caption bg-bg-elevated px-1.5 py-0.5 rounded-full ml-1">{savedCopies.length}</span>
                <ChevronDown className={clsx('w-3 h-3 ml-auto transition-transform', showSavedCopies && 'rotate-180')} />
              </button>
              {showSavedCopies && (
                <div className="mt-2 space-y-1.5">
                  {savedCopies.slice(0, 20).map(item => (
                    <div key={item.id} className="card p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm text-text-primary leading-relaxed line-clamp-2">{item.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-caption px-1.5 py-0.5 rounded-sm bg-accent-subtle text-accent">{item.angle}</span>
                          <span className="text-caption text-text-tertiary">{item.topic}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setSelectedTopic(item.topic); setGenerationHint(item.content); showToast('已加载上下文'); }}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-bg-elevated transition-all"
                          title="重新使用"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(item.content).then(() => showToast('已复制'))}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-all"
                          title="复制"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
```

- [ ] **步骤 3：在生成结果卡片上添加收藏按钮**

在每个 copy 卡片的按钮组中添加星标按钮（在"复制"按钮之前）：

```tsx
<button
  onClick={() => handleToggleSaveCopy(copy)}
  className={clsx(
    'flex items-center gap-1 px-2.5 py-1 rounded-md text-caption transition-all duration-120',
    isCopySaved(copy.content)
      ? 'text-yellow-500 bg-yellow-500/10'
      : 'text-text-tertiary hover:text-yellow-500 hover:bg-yellow-500/5'
  )}
  title={isCopySaved(copy.content) ? '取消收藏' : '收藏'}
>
  <Star className={clsx('w-3 h-3', isCopySaved(copy.content) && 'fill-yellow-500')} />
  {isCopySaved(copy.content) ? '已收藏' : '收藏'}
</button>
```

- [ ] **步骤 4：Commit**

```bash
git add src/pages/ContentForge.tsx
git commit -m "feat: render inspiration panel and saved copies UI in ContentForge"
```

---

### 任务 6：验证构建

- [ ] **步骤 1：运行 TypeScript 类型检查**

```bash
npx tsc -b --noEmit
```
预期：无错误输出

- [ ] **步骤 2：运行构建**

```bash
npm run build
```
预期：构建成功

- [ ] **步骤 3：最终 commit**

```bash
git add -A
git commit -m "chore: fix imports and verify build"
git push
```
