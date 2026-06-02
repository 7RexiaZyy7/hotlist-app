# 热点工坊 - 项目记忆文档

## 📌 项目概述
**项目名称**：热点工坊  
**项目类型**：React + Vite + TypeScript + TailwindCSS  
**部署平台**：Vercel  
**核心功能**：内容创作辅助工具，整合热榜、话题搜索、文案生成、爆款拆解等功能

---

## 🗂️ 项目架构

### 技术栈
```
- 前端框架：React 18 + Vite 6
- 语言：TypeScript
- UI 框架：TailwindCSS
- 状态管理：Zustand
- 图标库：Lucide React
- 后端服务：Vercel Serverless Functions (Node.js)
- 数据存储：Upstash Redis (KV)
- AI 服务：Coze (扣子) API
```

### 目录结构
```
trae test/
├── api/                      # Vercel Serverless Functions
│   └── proxy.js            # 核心代理服务（所有后端逻辑）
├── src/
│   ├── components/         # 通用组件
│   │   ├── Sidebar.tsx    # 侧边导航栏
│   │   ├── TopBar.tsx     # 顶部状态栏
│   │   ├── LoadingState.tsx
│   │   ├── QuotaModal.tsx
│   │   └── PlatformIcon.tsx
│   ├── pages/             # 页面组件
│   │   ├── HotRadar.tsx       # 热榜驾驶舱
│   │   ├── ContentSearch.tsx  # 内容搜索（知乎/脉脉）
│   │   ├── TopicExplorer.tsx  # 话题勘探
│   │   ├── ContentForge.tsx   # 文案工坊
│   │   ├── HitAnalyzer.tsx    # 爆款拆解
│   │   ├── CreatorProfile.tsx # 创作者档案
│   │   └── AuthCallback.tsx   # OAuth 回调
│   ├── services/          # API 服务
│   │   └── cozeApi.ts    # Coze API 封装
│   ├── store/             # 状态管理
│   │   └── index.ts      # Zustand store
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx           # 根组件
│   ├── main.tsx          # 入口
│   └── index.css         # 全局样式
├── scripts/              # 辅助脚本
│   ├── maimai_crawler.py # 脉脉爬虫（独立）
│   ├── server.py         # Python 服务
│   ├── dev-proxy.mjs
│   └── dev-all.mjs
├── coze-knowledge/       # Coze 知识库文件
├── .trae/                # Trae AI 文档
│   └── documents/
│       ├── PRD-内容引力引擎交互界面.md
│       └── 技术架构-内容引力引擎.md
├── public/
├── package.json
├── vite.config.ts
├── vercel.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 🎯 核心功能模块

### 1. 热榜驾驶舱 (HotRadar)
**路径**：`/`（首页）  
**功能**：
- 查看各大平台热榜（微博、抖音、知乎、B站、小红书、脉脉）
- 综合热榜（Top 15，去重合并）
- 单平台热榜切换
- 数据来源：
  - 小红书/脉脉：tophub.today 爬虫
  - 其他平台：uapis.cn API

### 2. 内容搜索 (ContentSearch)
**路径**：`/search`  
**功能**：
- 支持两个平台搜索切换
  - **知乎**：使用知乎开放平台 API（需要 ZHIHU_API_TOKEN）
  - **脉脉**：通过 Bing 搜索引擎 + `site:maimai.cn` 语法搜索
- 展示搜索结果卡片
- 标签显示来源平台
- Vercel 上脉脉搜索降级为模拟数据（避免反爬风险）

### 3. 话题勘探 (TopicExplorer)
**路径**：`/explore`  
**功能**：
- 跨平台话题搜索
- 可视化命中情况
- 与文案工坊联动

### 4. 文案工坊 (ContentForge)
**路径**：`/forge`  
**功能**：
- 选题推荐（基于热榜/搜索）
- 11种文案角度选择
- 多版本文案生成与并排对比
- 在线编辑微调

### 5. 爆款拆解 (HitAnalyzer)
**路径**：`/analyze`  
**功能**：
- 爆款文案深度分析（钩子、结构、关键元素）
- 智能洗稿
- 可复用模型提取

### 6. 创作者档案 (CreatorProfile)
**路径**：`/profile`  
**功能**：
- 用户画像管理
- 赛道、受众、文风偏好设置
- 与文案生成联动

---

## 🔐 认证与配额系统

### 用户层级
```
- 匿名用户（anon）：3次/天
- 免费用户（free）：15次/天
- Pro 用户（pro）：9999次/天
```

### OAuth 2.0 流程
1. 用户点击登录 → 获取 Coze OAuth 授权链接
2. 用户授权 → 跳转 `/auth/callback` 并带 code
3. 后端用 code 换 access_token + refresh_token
4. 存储为 HttpOnly Cookie
5. 调用 Coze 用户信息接口获取 uid
6. 配额管理（基于 uid，存储在 Upstash Redis）

### 付费升级（爱发电）
- 用户在爱发电下单时，备注填入自己的 Coze uid
- 后端 syncAfdianOrder 定时/主动同步订单
- 匹配到订单后，给该 uid 设置 tier=pro（有效期对应月份）

---

## 🌐 后端 API 接口 (api/proxy.js)

### 公共接口（无需 token）
| 方法 | action | 功能 |
|------|--------|------|
| GET | `oauth_authorize` | 获取 Coze OAuth 登录链接 |
| POST | `oauth_token` | 用 code 换 token |
| POST | `oauth_refresh` | 刷新 access token |
| GET | `oauth_status` | 获取当前登录状态 |
| POST | `oauth_logout` | 登出（清除 Cookie） |
| GET | `hotboard` | 获取热榜数据（type 参数） |
| GET | `zhihu_search` | 知乎搜索（需 ZHIHU_API_TOKEN） |
| GET | `maimai_search` | 脉脉搜索（通过 Bing） |
| GET | `quota` | 查询配额 |
| POST | `increment` | 扣减配额（需 quota check） |

### Coze API 代理（需 PAT token）
| 方法 | action | 对应 Coze API |
|------|--------|---------------|
| POST | `chat` | `/v3/chat` |
| GET | `retrieve` | `/v3/chat/retrieve` |
| GET | `messages` | `/v3/chat/message/list` |
| POST | `variables` | `/v3/chat` (设置 custom variables) |

---

## 🔑 环境变量

### Vercel 环境变量（必填）
```env
# Coze 配置
COZE_PAT_TOKEN=pat_xxx             # Coze Personal Access Token（必需）
COZE_CLIENT_ID=xxx.app.coze        # OAuth Client ID

# 知乎开放平台（可选，用于 ContentSearch）
ZHIHU_API_TOKEN=xxx

# Upstash Redis（配额/缓存必需）
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx

# 爱发电（可选，Pro 升级）
AFDIAN_USER_ID=xxx
AFDIAN_TOKEN=xxx
```

### 本地开发 (.env)
同上，放在项目根目录。

---

## 📦 依赖与命令

### 开发命令
```bash
npm run dev              # 启动 Vite 前端
npm run dev:proxy        # 启动本地代理（用于测试 api/proxy.js）
npm run dev:all          # 启动前端 + 代理
npm run build            # 构建
npm run lint             # 代码检查
```

### 核心依赖
- `@coze/api` - Coze SDK
- `zustand` - 状态管理
- `lucide-react` - 图标
- `tailwindcss` - 样式
- `@upstash/redis` - KV 存储
- `clsx` + `tailwind-merge` - className 工具

---

## 🎨 设计规范

### 颜色系统（CSS Variables）
```css
--bg-base: #0B0D17;      /* 背景色 */
--bg-surface: #131724;   /* 面板色 */
--bg-card: #1A1F2E;      /* 卡片色 */
--accent: #F0B429;       /* 琥珀金（主色） */
--text-primary: #E8EDF5;
--text-secondary: #8892A8;
--text-tertiary: #5B657B;
--border: #2A2F3E;
--success: #34D399;
--warning: #F59E0B;
--error: #EF4444;
```

### 导航结构
| ID | 标签 | 页面 | 图标 |
|----|------|------|------|
| radar | 热榜 | HotRadar | Flame |
| search | 搜索 | ContentSearch | Globe |
| explore | 话题 | TopicExplorer | Search |
| forge | 文案 | ContentForge | Sparkles |
| analyze | 拆解 | HitAnalyzer | （无）|
| profile | 档案 | CreatorProfile | （无）|

---

## ⚠️ 已知问题与注意事项

### 1. OpenCode 使用问题（2026-06-01）
- **免费版配额**：每日 50 次请求
- **频率限制**：存在短时间请求限制
- **会话恢复**：新建任务不会重置配额，建议通过 PROJECT_MEMORY.md 继承上下文

### 2. 脉脉搜索实现
- **方案**：不直接爬取脉脉，而是通过 `site:maimai.cn` 的 Bing 搜索
- **优点**：避免反爬、无需登录 Token
- **Vercel 降级**：部署环境中降级为模拟数据，本地开发可用真实搜索

### 3. API Token 优先级
```
PAT Token > OAuth Token（仅 PAT 有 Bot 执行权限）
```

---

## 🚀 开发历史（关键时期）

### 【关键阶段】2026-05-21 至 2026-05-25

#### 5月21日 - 项目启动
- Initial commit（`3490162`）：Hot List Application 初始化
- 项目框架搭建完成，Vercel 部署配置

#### 5月22日 - 热榜功能完善
- `6b8a6ba`：单平台热榜直调 uapis.cn，绕过 Coze Agent，响应速度提升至 <1s
- `3cd81fd`：代理服务端轮询替换为前端轮询，大幅降低响应延迟
- `0c3a8e5`：优化文案生成质量，增加分批次文案生成标准约束
- `d625316`：去掉假数据，替换 alert 为 toast，增加空状态引导

#### 5月23-24日 - OAuth与配额系统（关键里程碑）
- **5月23日**：
  - `1966e0b`：引入 Coze OAuth PKCE 登录
  - 大量调试工作（详见 `故障排查记录_20260523-0524.md`）
  - 核心问题：OAuth token 缺少插件权限，导致 retrieve 永远 in_progress
  
- **5月24日**：
  - `308d8e8`：配额系统上线（Vercel KV + 三级用户限制）
  - `0c87d26`：切换到 @upstash/redis，兼容 Vercel Marketplace
  - `4af4c92`：最终修复 - 强制 PAT-first（OAuth只用于身份验证）
  - `b549a59`：简化前端 query，规则由 Agent Prompt 统一管理

#### 5月25日 - 持续优化
- 优化用户体验，完善错误处理

### 2026-06-01
- ✅ 新增 ContentSearch 页面的平台切换（知乎/脉脉）
- ✅ 新增 maimai_search 接口（Bing site 搜索）
- ✅ 修复 proxy.js 的 TypeScript 类型注解导致的 500 错误
- ✅ 完善页面标题同步

---

## 🔍 调试工具

### 可用端点
- `/api/proxy?action=diag` - 检查 PAT 配置
- `/api/proxy?action=debug` - 测试 Coze Bot 调用（较慢，30s 超时）

### 本地代理调试
```bash
npm run dev:proxy
# 访问 http://localhost:8787/api/proxy?action=xxx
```

---

## 📞 相关文档
- `PRD-内容引力引擎交互界面.md` - 产品需求文档
- `技术架构-内容引力引擎.md` - 技术架构文档
- `故障排查记录_20260523-0524.md` - 历史问题记录
- `coze-bot-prompt.md` - Coze Bot 提示词
