# SCP Docs — 本地开发启动指南

本文档指导你从零开始搭建 SCP Docs 的本地开发环境，涵盖前端、后端 API、管理后台三个部分。

---

## 前置条件

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 20+ | 推荐 22（CI 使用 22） |
| npm | 10+ | 随 Node.js 安装 |
| Python | 3.10+ | 仅种子数据爬虫需要（可选） |
| Make | 任意 | Windows 可用 `winget install GnuWin32.Make` 或直接运行 npm 脚本 |

> **Windows 用户提示：** 如果没有 `make`，所有 Makefile 目标都有对应的 npm 命令，见下方等价写法。

---

## 第一步：克隆与安装

```bash
git clone https://github.com/<your-username>/scp-latom-node.git
cd scp-latom-node
```

### 安装全部依赖

```bash
make install
```

等价于：

```bash
npm ci              # 前端 + 管理后台（admin/ 的依赖在根 node_modules 中）
cd worker && npm ci # 后端 API
cd ..
```

---

## 第二步：配置环境变量

### 2.1 后端 API（Worker）—— 必须

```bash
cp worker/.dev.vars.example worker/.dev.vars
```

编辑 `worker/.dev.vars`：

```ini
# JWT 签名密钥（本地开发随意填写，但不能为空）
JWT_SECRET=my-local-dev-secret

# ZhipuAI / GLM API 密钥（AI 聊天功能需要，可留空）
GLM_API_KEY=

# CORS 允许的来源（默认已包含 localhost 端口，一般无需修改）
CORS_ORIGINS=http://localhost:8085,http://localhost:8086
```

> **重要：** `JWT_SECRET` 不能为空，否则所有认证相关接口（登录、注册、收藏等）会报错。本地开发填任意字符串即可。

### 2.2 前端 —— 可选（已有默认配置）

项目已内置 `.env.development.local`，内容为：

```ini
VITE_API_BASE=http://localhost:8787
```

这会让前端 dev server 自动指向本地 Worker API，**无需手动配置**。

如果你需要连接生产环境 API，删除该文件即可回退到 `https://api.scp.lat`。

### 2.3 管理后台 —— 可选（已有默认配置）

同理，`admin/.env.development.local` 已内置，指向 `http://localhost:8787`。

---

## 第三步：初始化本地数据库

```bash
make db-local
```

等价于：

```bash
cd worker && npm run db:schema:local
```

这会将 `worker/schema.sql` 应用到本地 Miniflare 模拟的 D1 数据库。**可重复执行**，会重建表结构。

---

## 第四步：启动开发服务

### 方式一：一键启动全部服务（推荐）

```bash
make dev
```

等价于：

```bash
npm run dev:all
```

这会同时启动三个服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | `http://localhost:8085` | Vue 3 SPA |
| 管理后台 | `http://localhost:8086` | 管理员面板 |
| Worker API | `http://localhost:8787` | Hono 后端 API |

### 方式二：分别启动

如果需要单独控制某个服务：

```bash
# 终端 1 — 前端
npm run dev

# 终端 2 — 管理后台
npm run admin:dev

# 终端 3 — Worker API
npm run dev:worker
# 或
cd worker && npm run dev
```

---

## 第五步：种子数据（可选）

本地数据库初始为空。可以运行爬虫从 SCP Wiki 抓取真实数据：

```bash
# 确保 Worker API 已在运行（端口 8787）
make seed
```

等价于：

```bash
cd worker && npm run seed:crawl
```

> **注意：**
> - 这会请求真实的 SCP Wiki，受速率限制，每批约 30 条，完整爬取可能需要数小时
> - 每批数据立即写入 D1，`Ctrl+C` 随时可中断，已爬取的数据不会丢失
> - 需要 Python 3.10+ 环境

---

## 验证环境

启动后访问以下地址确认一切正常：

| 地址 | 预期结果 |
|------|---------|
| `http://localhost:8085` | 前端首页加载 |
| `http://localhost:8086` | 管理后台加载 |
| `http://localhost:8787/api/health` | 返回 JSON 健康检查响应 |

---

## 常用开发命令

### 测试

```bash
make test              # 运行全部测试（前端 + 后端）
npm test               # 仅前端测试
cd worker && npm test  # 仅后端测试

npm run test:watch     # 前端测试 watch 模式
```

### 类型检查

```bash
make typecheck         # 前端 + 后端
npm run typecheck      # 仅前端
cd worker && npm run typecheck  # 仅后端
```

### 代码检查与格式化

```bash
make lint              # ESLint 检查（前端 + 后端）
make format            # Prettier 格式化（前端 + 后端）
npm run lint:fix       # 前端 ESLint 自动修复
```

### 构建

```bash
make build             # 前端生产构建
npm run build          # 同上
npm run admin:build    # 管理后台生产构建
```

### 完整 CI 流水线（本地模拟 GitHub Actions）

```bash
make ci                # typecheck → lint → test → build
```

### 其他

```bash
make clean             # 清理 node_modules、dist、coverage
make help              # 查看所有可用命令
```

---

## 项目结构速览

```
scp-latom-node/
├── src/                    # 前端源码（Vue 3 + TypeScript）
│   ├── views/              # 页面组件（含 mobile/ 子目录）
│   ├── components/         # UI 组件（common/ home/ layout/ mobile/ ai/）
│   ├── stores/             # Pinia 状态管理
│   ├── services/           # API 客户端层
│   ├── composables/        # Vue 组合式函数
│   ├── locales/            # i18n 翻译（en.ts, zh.ts）
│   └── router/             # 路由配置
├── worker/                 # 后端 API（Hono + Cloudflare Workers）
│   └── src/
│       ├── routes/         # API 路由（auth, crawler, proposals, ai 等）
│       ├── middleware/     # 中间件（JWT 认证、管理员权限、日志）
│       ├── do/             # Durable Objects（爬虫、AI 聊天）
│       └── utils/          # 工具函数（JWT、密码哈希、GLM 客户端）
├── admin/                  # 管理后台（独立 Vue 3 SPA）
├── docs/                   # 开发文档
├── Makefile                # 开发命令集合
└── .env.development.local  # 前端本地环境变量（指向 localhost:8787）
```

---

## 常见问题

### `JWT_SECRET is required` 或认证接口报错

检查 `worker/.dev.vars` 文件是否存在且 `JWT_SECRET` 不为空。

### 前端请求返回 404 或 CORS 错误

1. 确认 Worker API 正在运行（`http://localhost:8787/api/health` 能访问）
2. 检查 `.env.development.local` 中 `VITE_API_BASE=http://localhost:8787`
3. 重启 dev server 让环境变量生效

### `make` 命令不可用（Windows）

直接使用等价的 npm 命令：

| make 命令 | npm 等价 |
|-----------|---------|
| `make install` | `npm ci && cd worker && npm ci` |
| `make dev` | `npm run dev:all` |
| `make db-local` | `cd worker && npm run db:schema:local` |
| `make test` | `npm test && cd worker && npm test` |
| `make ci` | `npm run ci` |
| `make build` | `npm run build` |

### 端口被占用

Vite 默认端口配置在 `vite.config.ts` 中（前端 8085，管理后台 8086）。如果端口冲突，Vite 会自动尝试下一个可用端口并在终端提示。

### 数据库表不存在

运行 `make db-local` 初始化数据库 schema。

---

## 部署

详见 [deployment.md](deployment.md)。

生产环境部署需要在 GitHub 仓库设置中配置以下 Secrets：

- `CLOUDFLARE_API_TOKEN` — Cloudflare API 令牌（Pages + Workers 权限）
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare 账户 ID

推送 `main` 分支会自动触发 CI/CD：前端部署到 Cloudflare Pages，后端部署到 Cloudflare Workers。
