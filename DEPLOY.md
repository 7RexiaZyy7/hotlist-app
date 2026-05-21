# Vercel 部署指南

## 🚀 一键部署

### 方法一：Vercel 网站部署（推荐）

1. **创建 GitHub 仓库**
   - 在 GitHub 上创建一个新仓库
   - 将本项目代码推送到仓库

2. **在 Vercel 导入仓库**
   - 访问 https://vercel.com/new
   - 登录 Vercel 账号（可用 GitHub 直接登录）
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置部署**
   - 项目名称：自定义（如 `hotlist-app`）
   - 框架预设：Vite（自动检测）
   - Root Directory：留空（或者 `./`）
   - Build Command：自动检测 `npm run build`
   - Output Directory：自动检测 `dist`

4. **点击 Deploy**
   - 等待约 1-3 分钟
   - 部署完成后获得访问链接！

### 方法二：使用 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录并部署**
   ```bash
   cd "e:\杂项\Trae project\trae test"
   vercel login
   vercel
   ```

3. **跟随提示**
   - 第一次会要求关联 Vercel 账号
   - 选择项目名称
   - 其他选项都可以直接回车

## ⚙️ 首次使用配置

部署成功后，用户需要在网站右上角点击 **设置** 按钮，填入：
- **Bot ID**：你的 COZE Bot ID
- **Token (PAT)**：你的 COZE PAT 令牌

## 📝 注意事项

1. **数据存储**：所有数据都存储在用户浏览器本地（localStorage）
2. **API 调用**：直接调用 COZE API，不经过服务器
3. **免费额度**：Vercel 免费版完全够用
4. **自定义域名**：可在 Vercel 项目设置中绑定自己的域名

## 🔧 常见问题

### 部署后路由 404？
已在 `vercel.json` 中配置了重写规则，刷新页面不会 404。

### COZE API 调用失败？
确保 Bot ID 和 Token 配置正确，且 Bot 已发布。

### 如何更新代码？
推送到 GitHub 后，Vercel 会自动重新部署！

---

**部署成功后，分享链接给朋友，他们就可以直接用了！**
