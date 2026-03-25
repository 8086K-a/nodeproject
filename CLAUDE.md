# Project Instructions

## Project Context

A Next.js + MySQL application with the main app living in `ICVN-Project-master/`.

> Note: Detailed project requirements will be added to task.json as they are defined.

---

## MANDATORY: Agent Workflow

Every new agent session MUST follow this workflow:

### Step 1: Initialize Environment

```bash
./init.sh
```

This will:
- Install all dependencies
- Start the development server at http://127.0.0.1:3000

**DO NOT skip this step.** Ensure the server is running before proceeding.

### Environment Prerequisites

Before working on any backend or integration task, ensure `ICVN-Project-master/.env.local` exists.

Minimum required variables:

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=icvn_graph
DEFAULT_GRAPH_ID=default
DEFAULT_ACTOR_ID=system
```

Database commands:

```bash
# In ICVN-Project-master/
npm run db:ping
npm run db:init
```

Default graph validation:

```bash
curl 'http://127.0.0.1:3000/api/graph/view?graphId=default'
```

Important:
- The homepage currently renders the graph editor with local sample data by default
- Validate backend `default` graph availability via `/api/graph/view` until task 5 is completed

### Step 2: Select Next Task

Read `task.json` and select ONE task to work on.

Selection criteria (in order of priority):
1. Choose a task where `passes: false`
2. Consider dependencies - fundamental features should be done first
3. Pick the highest-priority incomplete task

### Step 3: Implement the Task

- Read the task description and steps carefully
- Implement the functionality to satisfy all steps
- Follow existing code patterns and conventions

### Step 4: Test Thoroughly

After implementation, verify ALL steps in the task:

**强制测试要求（Testing Requirements - MANDATORY）：**

1. **大幅度页面修改**（新建页面、重写组件、修改核心交互）：
   - **必须在浏览器中测试！** 使用 MCP Playwright 工具
   - 验证页面能正确加载和渲染
   - 验证表单提交、按钮点击等交互功能
   - 截图确认 UI 正确显示

2. **小幅度代码修改**（修复 bug、调整样式、添加辅助函数）：
   - 可以使用单元测试或 lint/build 验证
   - 如有疑虑，仍建议浏览器测试

3. **所有修改必须通过**：
   - 在 `ICVN-Project-master/` 中运行 `npm run lint` 无错误
   - 在 `ICVN-Project-master/` 中运行 `npm run build` 构建成功
   - 浏览器/单元测试验证功能正常

**测试清单：**
- [ ] 代码没有 TypeScript 错误
- [ ] lint 通过
- [ ] build 成功
- [ ] 功能在浏览器中正常工作（对于 UI 相关修改）

### Step 5: Update Progress

Write your work to `progress.txt`:

```
## [Date] - Task: [task description]

### What was done:
- [specific changes made]

### Testing:
- [how it was tested]

### Notes:
- [any relevant notes for future agents]
```

### Step 6: Commit Changes (包含 task.json 更新)

**IMPORTANT: 如果当前工作区根目录是 git 仓库，所有更改必须在同一个 commit 中提交。**

流程：
1. 更新 `task.json`，将任务的 `passes` 从 `false` 改为 `true`
2. 更新 `progress.txt` 记录工作内容
3. 如果仓库根目录可提交，一次性提交所有更改：

```bash
git add .
git commit -m "[task description] - completed"
```

**规则:**
- 只有在所有步骤都验证通过后才标记 `passes: true`
- 永远不要删除或修改任务描述
- 永远不要从列表中移除任务
- 如果只有 `ICVN-Project-master/` 是 git 仓库，仍然必须更新根目录的 `task.json` 和 `progress.txt`，并在最终汇报中明确说明根目录追踪文件未被同一仓库纳入 commit

---

## ⚠️ 阻塞处理（Blocking Issues）

**如果任务无法完成测试或需要人工介入，必须遵循以下规则：**

### 需要停止任务并请求人工帮助的情况：

1. **缺少环境配置**：
   - `ICVN-Project-master/.env.local` 缺失或 MySQL 配置错误
   - 本地 MySQL 未启动，或当前账号没有建库/建表权限
   - 任务需要真实 AI provider 凭证，但当前未提供

2. **外部依赖不可用**：
   - 第三方 AI / OCR / 文件解析服务宕机
   - 需要人工授权或付费开通的外部模型服务
   - 当前任务依赖的数据库、对象存储或其他服务不可达

3. **测试无法进行**：
   - UI 大改动需要浏览器验收，但当前没有可用的 Playwright MCP
   - 功能依赖外部系统尚未部署
   - 需要特定硬件环境

### 阻塞时的正确操作：

**DO NOT（禁止）：**
- ❌ 提交 git commit
- ❌ 将 task.json 的 passes 设为 true
- ❌ 假装任务已完成

**DO（必须）：**
- ✅ 在 progress.txt 中记录当前进度和阻塞原因
- ✅ 输出清晰的阻塞信息，说明需要人工做什么
- ✅ 停止任务，等待人工介入

### 阻塞信息格式：

```
🚫 任务阻塞 - 需要人工介入

**当前任务**: [任务名称]

**已完成的工作**:
- [已完成的代码/配置]

**阻塞原因**:
- [具体说明为什么无法继续]

**需要人工帮助**:
1. [具体的步骤 1]
2. [具体的步骤 2]
...

**解除阻塞后**:
- 运行 [命令] 继续任务
```

---

## Project Structure

```
/
├── CLAUDE.md          # This file - workflow instructions
├── task.json          # Task definitions (source of truth)
├── progress.txt       # Progress log from each session
├── init.sh            # Initialization script
└── ICVN-Project-master/  # Next.js application
    ├── .env.example
    ├── app/              # App Router pages
    ├── components/
    ├── db/mysql/init.sql
    └── tools/
```

## Commands

```bash
# In ICVN-Project-master/
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run linter
npm run db:ping  # Test MySQL connection
npm run db:init  # Initialize MySQL schema
```

## Coding Conventions

- TypeScript strict mode
- Functional components with hooks
- Tailwind CSS for styling
- Write tests for new features

---

## Key Rules

1. **One task per session** - Focus on completing one task well
2. **Test before marking complete** - All steps must pass
3. **Browser testing for UI changes** - 新建或大幅修改页面必须在浏览器测试
4. **Document in progress.txt** - Help future agents understand your work
5. **One commit per task when possible** - 如果根目录可提交，则所有更改必须在同一个 commit 中提交
6. **Never remove tasks** - Only flip `passes: false` to `true`
7. **Stop if blocked** - 需要人工介入时，不要提交，输出阻塞信息并停止
