# 灵感面板 + 文案收藏 — 设计规格

## 现状问题

1. **素材库内容与话题脱节** — 静态示例（"坚持早起 30 天"）和用户当前写的话题无关，用户不会手动去翻
2. **素材库交互路径长** — 独立页面/弹窗，写作时要切过去翻→复制→切回来
3. **用户写过的好文案没有积累** — 生成后复制走就丢了，下次写同类话题不能参考

## 解决方案

### 总体思路

- 砍掉所有静态素材数据、AssetLibrary 组件、AssetLibraryPage 页面
- 在文案工坊直接加「灵感推荐」面板 + 「收藏文案」系统
- 灵感由 AI 根据当前话题+角度实时生成
- 收藏区用来积累用户标记过的好文案，按话题聚类

### 删除的内容

| 文件/条目 | 说明 |
|-----------|------|
| `src/data/assets.ts` | 整个文件删除，包含 AssetItem/AssetCategory 类型和所有示例数据 |
| `src/components/AssetLibrary.tsx` | 侧边弹窗组件删除 |
| `src/pages/AssetLibraryPage.tsx` | 独立页面删除 |
| Sidebar → 素材库 | 侧边栏导航条目删除 |
| App.tsx → mobileNavItems | 手机端底部「素材」条目删除 |
| ContentForge → showAssetLibrary | 引用 AssetLibrary 的按钮和状态删除 |

### 新增：灵感面板（InspirationPanel）

**位置：** ContentForge 内，角度选择区域下方、生成按钮上方

**交互流程：**

1. 用户输入话题 + 选择 ≥1 个角度后，面板显示「获取灵感」按钮
2. 点击后调用 AI，传入当前话题 + 选中的前 3 个角度
3. AI 返回 3-5 条切入角度/开头建议，格式为纯文本段落
4. 每条建议以小卡片展示，附带两个操作：
   - **「复制」** — 复制到剪贴板
   - **「使用此角度」** — 将该建议匹配的角度补入选中的角度列表（如未选中），同时将该建议的文本存入 `generationHint` 状态，生成文案时作为 "侧重方向" 传入 prompt 上下文
5. 卡片下方显示该建议匹配的角度标签
6. 当话题或角度变更时，清空当前结果，回到初始状态

**缓存策略：** `Map<topic+角度组合, 结果[]>`，切换回来不重新请求。切换平台不清缓存。

**空状态：**
- 未输入话题：「输入话题并选择角度后，AI 为你推荐切入思路」
- 已输入但未选角度：「先选择创作角度，AI 会针对每个角度推荐最佳切入点」

### 新增：文案收藏（FavoriteCopies）

**数据结构（localStorage）：**
```
savedCopies: Array<{
  id: string;
  content: string;
  angle: string;
  topic: string;
  platform: string;
  timestamp: number;
}>
```

**交互：**
- 每条生成结果的卡片右上角加星标按钮（填充/空心）
- 点击收藏，存入 localStorage，toast 提示「已收藏」
- 再次点击取消收藏
- 在灵感面板下方新增「收藏的文案」折叠区
- 折叠区按话题分组，显示每条的内容、角度标签
- 可点击「重新使用」将该文案的内容填入话题输入框

**容量限制：** 最多 50 条，超出时删除最早收藏的

### API 变更

**新增函数：** `buildInspirationPrompt(topic: string, angles: string[], profileText?: string): string`
- 生成 prompt 给 Coze API
- prompt 要求：针对话题，为每个角度各推荐 1-2 条切入建议
- 每条建议控制在 1-3 句话
- 返回格式：简单分段，无复杂标记

**复用：** 使用已有的 `callCozeChat` 调用，无需新增 API 方法

### ContentForge 新增状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `generationHint` | `string` | 用户从灵感面板点击「使用此角度」时设置，传给 Coze 作为侧重方向 |
| `inspirationResults` | `InspirationSuggestion[]` | AI 返回的建议列表，含 content + angle 字段 |
| `inspirationCache` | `Map<string, InspirationSuggestion[]>` | 缓存 key = topic + sortedAngles |
| `isLoadingInspiration` | `boolean` | 加载中状态 |
| `savedCopies` | `SavedCopy[]` | 从 localStorage 加载的收藏列表 |
| `showSavedCopies` | `boolean` | 收藏区折叠状态 |

### 边界情况

- **无话题/无角度：** 面板显示空状态提示，不触发 API
- **API 失败：** toast 提示「获取灵感失败」，保留空状态
- **额度不足：** 走已有的 checkAndIncrementQuota 逻辑，显示额度弹窗
- **切换模式（拆解/洗稿）：** 灵感面板仅在「创作」模式下显示
- **话题过长：** 自动截取前 100 字传入 prompt
- **已收藏 50 条：** 替换最早的一条，toast 提示「收藏已满，已替换最早的一条」

### 样式说明

- 面板使用折叠卡片风格，标题「灵感推荐」+ 图标 `Lightbulb`
- 建议卡片：浅色背景、圆角、左侧与角度同色的 3px 竖条
- 收藏区：比灵感区视觉层级低一级，标题用 `Bookmark`
- 移动端：正常展示，收藏区默认不展开
