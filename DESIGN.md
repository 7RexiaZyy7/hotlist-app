# HotRadar Design System

> 博主内容创作工作台 · 简洁专业风格

## Brand

- **Name**: 热点雷达 (HotRadar)
- **Tagline**: 发现热点，创作爆款
- **Tone**: 专业、清晰、克制、可信
- **Target**: 自媒体博主、内容创作者、新媒体编辑

## Color

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0a0a0b` | 主背景 (比当前深一点，更沉) |
| `bg-surface` | `#141416` | 卡片/面板背景 |
| `bg-elevated` | `#1c1c1f` | 更高层级 (hover/active) |
| `bg-hover` | `#252528` | 行级悬浮 |
| `border` | `#2a2a2e` | 边框 (subtle) |
| `border-hover` | `#3a3a3e` | 悬浮边框 |
| `text-primary` | `#ededef` | 正文 |
| `text-secondary` | `#a1a1aa` | 次要文字 |
| `text-tertiary` | `#6b6b73` | 辅助文字/占位符 |
| `accent` | `#6366f1` | 品牌色 (indigo-500) — 代替紫色，更专业冷静 |
| `accent-hover` | `#818cf8` | accent hover |
| `accent-subtle` | `rgba(99,102,241,0.12)` | 浅色背景用 |
| `success` | `#22c55e` | 成功 |
| `warning` | `#f59e0b` | 警告 |
| `error` | `#ef4444` | 错误 |

## Typography

| Token | Size/Weight | Usage |
|---|---|---|
| `display` | 24px / 600 | 页面标题 |
| `heading` | 16px / 600 | 区块标题 |
| `body` | 14px / 400 | 正文 (热榜条目标题) |
| `body-sm` | 13px / 400 | 次要文字 |
| `caption` | 12px / 400 | 标签/辅助信息 |
| `meta` | 11px / 500 | 极简元信息 |

- **Font stack**: `Inter` (西文), `Noto Sans SC` (中文), `PingFang SC`, system-ui
- **Line height**: body 1.6, heading 1.3, caption 1.4

## Spacing

Use 4px grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

- Card padding: `16px`
- List item padding: `12px 16px`
- Section gap: `24px`
- Page padding: `24px` (desktop), `16px` (mobile)

## Border Radius

| Size | Value | Usage |
|---|---|---|
| `sm` | 4px | 标签/badge |
| `md` | 6px | 按钮/输入框 |
| `lg` | 10px | 卡片 |
| `xl` | 14px | 模态框 |

## Shadows

```css
/* Card subtle */
box-shadow: 0 1px 2px rgba(0,0,0,0.4);

/* Elevated (modal/dropdown) */
box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3);

/* Glow accent (按钮/选中) */
box-shadow: 0 0 0 1px rgba(99,102,241,0.3);
```

## Components

### Platform Pills
- 圆角 pill 标签，选中时填充 accent 色
- 不选中时透明底 + border
- 左侧可带小图标

### Hot Topic Card
- 横向布局：序号 → 内容 → 操作
- 序号：前3名特殊样式 (accent bg)，其他灰色
- 悬浮时轻微 bg 变化 + border 高亮
- 内容区：标题 + 元信息行 (热度/平台/时间/角度标签)
- 右侧收藏按钮：圆形图标，选中填充 accent

### Collection Pool Modal
- 底部弹出或居中卡片
- 半透明遮罩
- 已收藏条目列表，可移除

### Buttons
| Type | Style |
|---|---|
| Primary | accent 填充，白字 |
| Ghost | 透明 + border，hover 填充 |
| Icon | 正方形，hover 圆角背景 |

### Loading / Empty / Error
- 居中图标 + 文字 + 操作按钮
- 骨架屏 shimmer 风格

## Motion

- 所有交互状态变化控制在 `120-150ms`
- 新内容出现用 `fadeIn + slideUp (8px)`
- Modal 用 `fadeIn + scale(0.98→1)`
- Button hover 轻微 lift (`scale 1.02`)

## Anti-Patterns (禁止)

- ❌ 不使用 emoji 作为 UI 图标 (用 lucide-react)
- ❌ 不使用紫色渐变作为主视觉 (改用单色 indigo)
- ❌ 不使用热力条/热度条可视化 (之前已确认)
- ❌ 不使用 `as any` / `@ts-ignore`
- ❌ 不使用中文作为 CSS class 名
- ❌ 不使用超出 4px 网格的零散间距值
