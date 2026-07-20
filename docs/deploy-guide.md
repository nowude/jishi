# JiShi 部署指南 — iPhone 访问 PWA

## 方案选择

| 方案 | 费用 | HTTPS | 速度 | 推荐度 |
|------|------|-------|------|--------|
| **GitHub Pages** | 免费 | ✅ | 国内慢 | ⭐⭐⭐ 最简单 |
| **Cloudflare Pages** | 免费 | ✅ | 国内快 | ⭐⭐⭐⭐ 推荐 |
| Vercel | 免费 | ✅ | 国内一般 | ⭐⭐⭐ |

> 推荐 Cloudflare Pages，因为 Worker API 也在 Cloudflare，同域名下没有跨域问题，且国内访问快。

---

## 方案 A: GitHub Pages（最简单）

### Step 1: 创建 GitHub 仓库

1. 打开 https://github.com/new
2. 仓库名: `jishi`（或任意名字）
3. 选择 **Private**（个人工时数据不公开）
4. 不要勾选 README/gitignore 等
5. 点击 Create repository

### Step 2: 推送代码

```bash
cd /path/to/JiShi

# 初始化 git（如果还没有）
git init
git add .
git commit -m "init: JiShi PWA 工时统计"

# 关联远程仓库
git remote add origin https://github.com/你的用户名/jishi.git
git branch -M main
git push -u origin main
```

### Step 3: 启用 GitHub Pages

1. 打开仓库 → Settings → Pages
2. Source 选择: **GitHub Actions**
3. 创建 `.github/workflows/deploy.yml`（见下方）
4. 推送后自动部署

### Step 4: iPhone 访问

1. Safari 打开 `https://你的用户名.github.io/jishi/`
2. 点击底部 **分享按钮** (⬆️)
3. 滚动找到 **「添加到主屏幕」**
4. 点击添加，桌面出现 JiShi 图标
5. 以后从桌面图标打开 = 独立 App 体验

---

## 方案 B: Cloudflare Pages（推荐）

### Step 1: 同上，先推到 GitHub

### Step 2: Cloudflare Pages 连接

1. 登录 https://dash.cloudflare.com
2. 左侧 Workers & Pages → Create → Pages
3. 连接 GitHub → 选择 `jishi` 仓库
4. 构建设置:
   - Framework preset: `Vue`
   - Build command: `npm run build`
   - Build output: `dist`
5. 点击 Save and Deploy

### Step 3: iPhone 访问

地址格式: `https://jishi.你的子域名.pages.dev`

同上，Safari → 分享 → 添加到主屏幕。

> 可自定义域名，如 `jishi.你的域名.com`

---

## GitHub Actions 部署配置

创建文件 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## 完整流程总结

```
本地开发 (npm run dev)
    ↓ npm run build → dist/
推送到 GitHub
    ↓ GitHub Actions 自动构建部署
HTTPS 访问地址生效
    ↓ Safari "添加到主屏幕"
iPhone 桌面图标 → 独立 App 体验
```

## 注意事项

- GitHub Pages 访问地址格式: `https://用户名.github.io/仓库名/`
- 如果仓库是 Private，GitHub Pages 也能用（免费版 Private 仓库支持 Pages）
- PWA 首次加载后可离线使用（Service Worker 缓存）
- 每次 push 到 main 分支会自动重新部署
