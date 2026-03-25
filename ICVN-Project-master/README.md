# ICVN Project

ICVN 是一个基于 `Next.js + React + Tailwind CSS + React Flow + MySQL` 的关系/知识图谱编辑与任务入图系统。

## 当前基线

- 首页提供关系图编辑器 UI
- Next.js Route Handlers 提供 `graph`、`tasks`、`query`、`versions` 等 API
- MySQL schema 与初始化脚本位于 `db/mysql/init.sql`
- `tools/test-db-connection.mjs` 用于检查数据库连接
- `tools/init-db.mjs` 用于初始化数据库
- 当前任务解析支持可选的 OpenAI 兼容 provider；若未配置凭证，会自动回退到 `synthetic-task-parser`

## 环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

`.env.local` 需要的变量：

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=icvn_graph

DEFAULT_GRAPH_ID=default
DEFAULT_ACTOR_ID=system

AI_PROVIDER_ENABLED=false
AI_PROVIDER_BASE_URL=https://api.openai.com/v1
AI_PROVIDER_API_KEY=
AI_PROVIDER_MODEL=
```

## 启动与初始化

安装依赖：

```bash
npm install
```

验证数据库连接：

```bash
npm run db:ping
```

初始化数据库：

```bash
npm run db:init
```

启动开发服务器：

```bash
npm run dev -- --hostname 127.0.0.1
```

默认访问地址：

```text
http://127.0.0.1:3000
```

后端回归测试：

```bash
npm run test:backend:plan
```

## 最小验证流程

1. 运行 `npm run db:ping`
2. 运行 `npm run db:init`
3. 启动开发服务器
4. 调用 `GET /api/graph/view?graphId=default`，确认返回 `success: true`
5. 打开首页，等待首屏自动切换到后端 `default` 图谱
6. 点击“重置”时应新建一个本地示例文件，而不是直接覆盖后端图谱
7. 点击“从后端加载”应恢复到真实默认图谱

## 当前完成度与限制

- 已完成：数据库初始化闭环、后端最小任务闭环、首页默认真实图谱加载、图编辑最小持久化、后端测试基线、最小交付文档
- 未完成：任务中心产品化、来源/证据/历史 UI、版本 UI、查询 UI
- 可选 AI provider 已接入代码路径，但若未配置真实凭证，会继续走 fallback
