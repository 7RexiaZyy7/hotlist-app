# Open Design 设计参考

此 skill 加载 Open Design 项目中的设计知识库，为 UI 工作提供专业设计参考。

## 资源路径

设计系统项目和知识库位于 `E:\杂项\open-design-main`。

## 核心设计原则

### 调色板纪律（来自 craft/color.md）
- **中性色占 70-90%**：`--bg`、`--surface`、`--fg`、`--muted`、`--border`
- **强调色只用一个**：`--accent`，每屏最多出现 2 次
- **语义色占 0-5%**：`--success`、`--warn`、`--danger`
- 正文（≤16px）对比度至少 4.5:1

### 排版纪律（来自 craft/typography.md）
- 层级不超过 3 级
- 字号按比例缩放
- ALL CAPS 必须 ≥0.06em letter-spacing
- 行高：正文 1.5，标题 1.2

### 反 AI 味（来自 craft/anti-ai-slop.md）
- 避免过度使用图标/emoji
- 避免对称布局
- 空格比分割线更好
- 每屏只放一个焦点元素

### 状态覆盖（来自 craft/state-coverage.md）
- 每个交互元素必须覆盖：hover、focus、active、disabled、loading、empty
- 状态变化必须有过渡动画（≥120ms）

## 可用设计系统

`E:\杂项\open-design-main\design-systems\` 下有 150+ 设计系统。每个系统使用 9 段 DESIGN.md 格式定义。通用推荐：
- **default/** — Neutral Modern，适合 B2B 工具，干净无装饰
- 按产品类型选：AI & LLM / Developer Tools / Productivity & SaaS 等子目录

## 使用方式

1. 读取 craft/ 下相关知识文件了解通用设计原则
2. 按需求读取 design-systems/ 下对应品牌的设计语言
3. 应用原则到当前 UI 工作中
