# Interview Agent

Interview Agent 是一个基于 Next.js 的 AI 模拟面试平台。它支持上传 JD、简历和候选人身份信息，自动生成面试计划，并在多轮对话中根据候选人回答进行追问、阶段切换和复盘评估。

线上体验：

- Vercel Production: https://interviewagent-88ar36ljf-gorgeouslyzsxs-projects.vercel.app
- 自定义域名: https://interviewagent.cc

访问线上平台可能需要梯子。如果自定义域名暂时无法访问，请优先使用 Vercel Production 地址。

## 核心能力

- 上传 JD、简历和身份记忆，生成个性化模拟面试。
- 支持候选人练习和面试官练习两种模式。
- 支持多家 OpenAI-compatible 模型服务，包括 GLM、DeepSeek、OpenAI、Moonshot/Kimi、MiniMax、Qwen、Gemini 和 OpenRouter。
- 基于两层 Plan-and-Execute 架构控制面试流程，避免模型随意跳题。
- 内置 Guardrail，防止参考答案、隐藏评分规则和系统提示词泄露。
- 支持 prompt injection 检测，对 JD、简历、题库中的越权指令进行遮盖和提示。
- 支持复盘报告生成，基于真实对话证据给出评分、薄弱点和后续练习建议。
- 内置轻量级评测集，覆盖 planner、plan_execute、safety、resilience 和 live model checks。

## Plan-and-Execute 架构

项目的面试流程被拆成两层计划。

第一层是 Interview Plan。系统会在创建会话时基于用户上传的 JD、简历、身份记忆、目标岗位、面试难度和风格生成全局面试规划。Interview Plan 会划分多个面试阶段，例如项目真实性确认、Agent Memory 深挖、RAG 与知识召回、LLM 调用与成本控制、后端工程实现、架构权衡等。

第二层是 NextStep Plan。每一轮用户回答后，系统会基于当前阶段、阶段进度、历史回答、风险标记和候选人最新回答，决定下一步应该追问、纠错、验证矛盾、降低难度、切换阶段，还是结束面试。

这两层计划由服务端维护，模型只负责在计划约束下生成自然语言回复。即使模型尝试跳到其它阶段或提前结束，服务端也会优先使用当前阶段和规则校验结果，避免面试过程出现大幅跳跃。

关键代码：

- `src/lib/planning/interview-planner.ts`：确定性 Interview Plan 和 NextStep Plan 规则。
- `src/lib/planning/llm-planner.ts`：LLM 辅助规划与超时兜底。
- `src/app/api/sessions/route.ts`：创建会话并生成 Initial Interview Plan。
- `src/app/api/sessions/[sessionId]/messages/route.ts`：每轮回答后生成 NextStep Plan、调用模型并更新状态。
- `src/lib/context/context-builder.ts`：构造模型上下文，强制模型服从服务端 NextStep Plan。
- `src/lib/evaluation/lightweight-eval.ts`：轻量级评测集。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL / Prisma Postgres
- Vitest
- Python unittest
- Vercel

## 本地启动

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

配置至少以下变量：

```bash
DATABASE_URL="postgresql://..."
APP_SECRET="replace-with-a-long-random-secret-at-least-32-chars"
LLM_BASE_URL="https://api.deepseek.com"
LLM_MODEL="deepseek-v4-flash"
OPENAI_API_KEY=""
GLM_API_KEY=""
```

如果使用身份级模型配置，可以在页面中选择 provider、base URL、model 并填写 API key。

生成 Prisma Client：

```bash
npm run db:generate
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 常用命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run lint             # ESLint
npm run test:all         # JS + Python 全量测试
npm run test:js          # Vitest
npm run test:python      # Python planner tests
npm run db:generate      # 生成 Prisma Client
npm run db:migrate       # 本地开发迁移
npm run db:deploy        # 部署数据库迁移
npm run eval:lightweight # 轻量级评测
```

## 轻量级评测

默认离线评测：

```bash
npm run eval:lightweight
```

当前评测维度：

- `planner`：评测回答质量判断、追问、纠错、真实性验证、阶段停止和结束面试。
- `plan_execute`：评测两层 Plan 架构是否按全局计划和当前阶段推进。
- `safety`：评测 prompt injection、参考答案泄露和隐藏评分规则泄露。
- `resilience`：评测模型 JSON 异常、规划超时和回复超时兜底。
- `live`：可选真实模型评测。

使用 DeepSeek 真实模型评测：

```bash
$env:EVAL_LLM_API_KEY="your-api-key"
$env:EVAL_LLM_MODEL="deepseek-v4-flash"
npm run eval:lightweight
```

PowerShell 单次运行示例：

```powershell
$env:EVAL_LLM_API_KEY="your-api-key"; $env:EVAL_LLM_MODEL="deepseek-v4-flash"; npm run eval:lightweight; Remove-Item Env:EVAL_LLM_API_KEY; Remove-Item Env:EVAL_LLM_MODEL
```

不要把真实 API key 写进仓库。

## 部署

项目已适配 Vercel。生产构建命令会执行：

```bash
prisma generate && prisma migrate deploy && next build
```

部署到 Vercel：

```bash
npx vercel deploy --prod --yes
```

如果使用自定义域名，需要在域名服务商处完成 DNS 配置。Vercel 推荐 apex 域名添加：

```text
A interviewagent.cc 76.76.21.21
```

## 安全说明

- `.env*` 默认不会提交到 Git。
- API key 会加密保存，模型 base URL 会被限制为预设 provider，避免 SSRF。
- 上传文本会检测 prompt injection。
- 输出会检测参考答案和隐藏评分规则泄露。
- 已完成的会话不允许继续追加消息。

## 目录结构

```text
src/app/                       Next.js App Router 页面和 API
src/components/                页面组件
src/lib/planning/              Interview Plan 和 NextStep Plan
src/lib/interview/             单轮面试编排和会话策略
src/lib/context/               LLM 上下文构造
src/lib/llm/                   OpenAI-compatible LLM Client
src/lib/guardrails/            安全和注入检测
src/lib/evaluation/            复盘和轻量级评测
prisma/                        Prisma schema 和 migrations
tests/                         Vitest 与 Python 测试
scripts/                       本地脚本
docs/deploy/                   部署文档
```

## 当前状态

最近一次验证覆盖：

- `npm run test:all`
- `npm run lint`
- `npx prisma validate`
- `npm run db:generate`
- `npm run build`
- `npm audit --audit-level=moderate`
- `npm run eval:lightweight`

线上生产部署状态为 Vercel `READY`。
