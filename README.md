# 全自动编程 Agent 实验

## 免责声明

本项目中的代码、任务分解和大量文档由 AI 生成或协助生成。运行前请自行审查，并对本地环境、数据和外部服务负责。

## 当前项目

当前仓库承载的是一个名为 **ICVN** 的关系/知识图谱编辑与任务入图系统。

- 主应用目录：`ICVN-Project-master/`
- 前端：Next.js App Router、React、Tailwind CSS、React Flow、Floating UI
- 后端：Next.js Route Handlers 提供 `tasks`、`graph`、`query`、`versions` 等 API
- 数据库：MySQL，初始化脚本位于 `ICVN-Project-master/db/mysql/init.sql`
- AI 解析链路已具备可选的 OpenAI 兼容 provider 接入框架；未配置凭证时会自动回退到 `synthetic-task-parser`

## 仓库结构

```text
/
├── CLAUDE.md              # agent 工作流说明
├── task.json              # 当前任务清单
├── progress.txt           # 每次会话的进度记录
├── init.sh                # 安装依赖并启动开发服务器
└── ICVN-Project-master/   # Next.js + MySQL 应用
    ├── .env.example
    ├── app/
    ├── components/
    ├── db/mysql/init.sql
    ├── tools/init-db.mjs
    └── tools/test-db-connection.mjs
```

## 环境要求

- Node.js 20+
- npm
- 可写本地文件系统
- 本地 MySQL 服务，能够创建/使用 `icvn_graph` 数据库
- 如需做大型 UI 修改，建议具备 Playwright MCP 以进行浏览器验收

## 最小上手流程

1. 在仓库根目录执行初始化：

```bash
./init.sh
```

`init.sh` 会在 `ICVN-Project-master/` 里安装依赖，并把开发服务器启动到 `http://127.0.0.1:3000`。

2. 准备环境变量：

```bash
cd ICVN-Project-master
cp .env.example .env.local
```

`.env.local` 当前最少需要这些变量：

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `DEFAULT_GRAPH_ID`
- `DEFAULT_ACTOR_ID`

可选 AI provider 变量：

- `AI_PROVIDER_ENABLED`
- `AI_PROVIDER_BASE_URL`
- `AI_PROVIDER_API_KEY`
- `AI_PROVIDER_MODEL`

3. 验证数据库连接并初始化 schema：

```bash
npm run db:ping
npm run db:init
```

4. 验证默认图谱数据接口：

```bash
curl 'http://127.0.0.1:3000/api/graph/view?graphId=default'
```

返回 `success: true` 且包含 `graphId: "default"`、`nodes`、`edges` 即表示后端默认图谱可用。

5. 访问首页：

```text
http://127.0.0.1:3000
```

当前首页会先进入图编辑器，再自动尝试切换到后端 `default` 图谱；如果后端为空或请求失败，会保留本地示例/工作区并给出状态提示。若当前激活的是后端文件，点击“重置”会新建本地示例文件，避免误覆盖默认图谱。

6. 运行后端回归测试：

```bash
cd ICVN-Project-master
npm run test:backend:plan
```

## Agent 工作流

完整流程定义在 `CLAUDE.md` 中，当前推荐顺序是：

1. 运行 `./init.sh`
2. 读取 `task.json`
3. 选择一个 `passes: false` 的任务
4. 在 `ICVN-Project-master/` 中实现并测试
5. 更新 `progress.txt`
6. 更新 `task.json`

## 当前完成度

- 已完成：任务 1、2、3、4、5、6、12、13
- 已实现但不能标记完成：任务 8 的 provider/fallback 代码路径已接入，但当前未提供真实 AI 凭证
- 待完成：任务 7、9、10、11，主要是前端联调与产品化 UI

## 已知限制

- 首页已优先加载后端 `default` 图谱，但任务中心、详情面板、版本面板和查询面板仍未全部前端化
- 图编辑器已支持后端默认图谱的最小持久化闭环，但更完整的产品化反馈和分析面板仍待补齐
- 若未提供真实 AI provider 凭证，任务解析会回退到本地 synthetic parser
- 大幅 UI 改动仍建议配合浏览器自动化或手工验收，不应只凭代码修改直接标记完成

## 最小验收脚本

1. 执行 `./init.sh`
2. 在 `ICVN-Project-master/` 执行 `npm run db:ping`
3. 在 `ICVN-Project-master/` 执行 `npm run db:init`
4. 在 `ICVN-Project-master/` 执行 `npm run test:backend:plan`
5. 调用 `POST /api/tasks` 创建 text task
6. 调用 `GET /api/tasks/{taskId}`、`GET /api/tasks/{taskId}/result`、`GET /api/tasks/{taskId}/events`
7. 调用 `POST /api/tasks/{taskId}/apply`
8. 调用 `GET /api/graph/view?graphId=default`
9. 调用 `POST /api/versions` 创建版本
10. 调用 `POST /api/versions/{versionId}/rollback` 验证回滚

## 阻塞模板

```text
🚫 任务阻塞 - 需要人工介入

当前任务: [任务名称]

已完成的工作:
- [已经完成的修改]

阻塞原因:
- [为什么现在不能继续]

需要人工帮助:
1. [提供 AI provider 凭证 / 开启数据库权限 / 提供浏览器验收环境]
2. [其他必要条件]

解除阻塞后:
- 运行 [命令] 继续任务
```

## 自动化运行说明

如果你想把这个仓库继续当作长流程 Agent 实验模板使用，应保留 `CLAUDE.md`、`task.json` 和 `progress.txt` 三个根目录文件，并围绕 `ICVN-Project-master/` 里的真实应用迭代。

`run-automation.sh` 仍可用于多轮自动执行，但这种方式风险较高，更适合你已经确认任务拆解、权限策略和测试脚本都可靠之后再用。
# nodeproject
# nodeproject
