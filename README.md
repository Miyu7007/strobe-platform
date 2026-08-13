# StrobeArt - 频闪照片创作与分享平台

基于 Next.js + Supabase + Vercel 构建的频闪照片创作社区。用户可以在线制作频闪照片，分享作品和项目文件，通过积分系统激励创作和分享。

## 功能

- **在线频闪工具**：上传视频 → 提取帧 → 自动检测/涂抹编辑 → 合成频闪照片
- **用户系统**：注册/登录，新用户赠送 100 积分
- **作品广场**：浏览、搜索所有分享的作品
- **分享与积分**：分享作品 +10 积分，下载他人作品 -5 积分（作者获得 +3 积分）
- **项目管理**：支持 .strobeproj 项目文件的导入导出

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS |
| 后端 | Next.js API Routes (Serverless) |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth |
| 存储 | Supabase Storage |
| 部署 | Vercel |

## 快速开始

### 方式 A：Demo 模式（最快，无需 Supabase）

适合先体验整个流程，验证产品想法。所有数据存在服务内存中，**重启后清空**。

```bash
npm install
cp .env.local.example .env.local   # 默认就是 NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

打开 `http://localhost:3000` 直接注册/登录/分享/下载，所有功能都能跑通。

### 方式 B：正式部署（生产环境）

#### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)，注册并创建新项目
2. 等待项目初始化完成（约 2 分钟）

#### 2. 配置数据库

1. 进入 Supabase Dashboard → **SQL Editor**
2. 复制 `supabase/schema.sql` 的全部内容
3. 粘贴并执行

#### 3. 创建存储桶

1. 进入 Supabase Dashboard → **Storage**
2. 点击 **New bucket**
3. 名称填 `works`，勾选 **Public bucket**
4. 点击 **Create bucket**

#### 4. 获取 API 密钥

进入 Supabase Dashboard → **Settings** → **API**，获取以下信息：

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

#### 5. 切换到正式模式

编辑 `.env.local`：

```bash
NEXT_PUBLIC_DEMO_MODE=false      # 关闭 demo 模式
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### 6. 部署到 Vercel（免费）

1. 将代码推送到 GitHub
2. 访问 [vercel.com](https://vercel.com)，用 GitHub 账号登录
3. 点击 **New Project**，选择你的仓库
4. 在 **Environment Variables** 中添加上面 5 个变量
5. 点击 **Deploy**
6. 等待构建完成（约 1-2 分钟），即可访问

> Demo 模式和正式模式共用同一套代码，只是数据后端不同。任何时候切换都不会丢失功能。

## 积分规则

| 操作 | 积分变动 |
|------|----------|
| 注册 | +100 |
| 分享作品 | +10 |
| 下载他人作品 | -5 |
| 作品被下载 | +3 |
| 重复下载同一作品 | 免费 |
| 下载自己的作品 | 免费 |

## 项目结构

```
strobe-platform/
├── public/
│   └── tool.html              # 频闪照片合成工具（原始 HTML）
├── src/
│   ├── app/
│   │   ├── layout.js          # 根布局
│   │   ├── page.js            # 首页
│   │   ├── login/             # 登录页
│   │   ├── register/          # 注册页
│   │   ├── tool/              # 工具页（iframe + 分享对话框）
│   │   ├── gallery/           # 作品广场
│   │   ├── work/[id]/         # 作品详情 + 下载
│   │   ├── profile/           # 个人中心
│   │   └── api/
│   │       ├── share/         # 分享 API（创建作品 + 加积分）
│   │       ├── download/      # 下载 API（扣积分 + 签名 URL）
│   │       ├── demo/          # Demo 模式统一 API（auth/data/storage）
│   │       └── demo-file/     # Demo 模式文件服务
│   ├── components/
│   │   ├── Navbar.js          # 导航栏
│   │   ├── ShareDialog.js     # 分享对话框
│   │   └── WorkCard.js        # 作品卡片
│   └── lib/
│       ├── supabase.js        # 客户端 Supabase（自动选择真/假）
│       ├── supabase-server.js # 服务端 Supabase
│       ├── mock-supabase.js   # 客户端 Mock（Demo 模式用）
│       └── mock-store.js      # 服务端内存数据存储
├── supabase/
│   └── schema.sql             # 数据库 Schema
├── package.json
├── next.config.mjs
├── tailwind.config.js
└── .env.local.example
```

## 免费额度说明

| 服务 | 免费额度 |
|------|----------|
| Vercel | 100GB 带宽/月，无限静态请求 |
| Supabase | 500MB 数据库，1GB 存储，50000 月活用户 |

初期用户量在几百人以内完全免费。超出后可升级付费计划或迁移到自有服务器。

## License

MIT
