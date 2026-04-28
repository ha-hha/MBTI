# MBTI Backend

本目录是 MBTI 微信小程序的最小联调后端，目标是让前端可以在本地跑通真实接口，不依赖 mock。

## 提供的接口

- `GET /assessment/:id`
- `POST /assessment/:id/submit`
- `GET /report/:recordId`
- `GET /assessment/:id/records`

接口协议以 [MBTI_backend_api_v1.md](/d:/1work/MBTI/MBTI_backend_api_v1.md:1) 为准。

## 技术栈

- Node.js
- Express
- SQLite
- `better-sqlite3`

## 快速启动

1. 进入后端目录

```powershell
cd d:\1work\MBTI\backend
```

2. 安装依赖

```powershell
npm.cmd install
```

3. 初始化数据库

```powershell
npm.cmd run db:init
```

4. 启动服务

```powershell
npm.cmd run dev
```

默认启动地址：

```txt
http://127.0.0.1:3000
```

PowerShell 如果拦截 `npm` 脚本，请直接使用 `npm.cmd`。

服务启动时会自动读取 [backend/.env](/d:/1work/MBTI/backend/.env:1) 中的环境变量。

## 环境变量

可选配置见 [backend/.env.example](/d:/1work/MBTI/backend/.env.example:1)：

```env
PORT=3000
DB_PATH=./data/mbti.sqlite
REPORT_DELAY_MS=1800
DEFAULT_USER_ID=demo-user
REPORT_GENERATION_MODE=template
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_MS=30000
LLM_MAX_RETRIES=2
LLM_TEMPERATURE=0.8
LLM_PROMPT_VERSION=v1
LLM_FALLBACK_TO_TEMPLATE=true
LLM_SYSTEM_PROMPT_PATH=./prompts/report-system-prompt.md
```

说明：

- `PORT`：服务端口
- `DB_PATH`：SQLite 文件路径
- `REPORT_DELAY_MS`：报告从 `pending` 到 `ready` 的模拟异步延迟
- `DEFAULT_USER_ID`：未显式传用户头时的兜底用户
- `REPORT_GENERATION_MODE`：`template` 或 `llm`
- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`：OpenAI 兼容接口配置
- `LLM_FALLBACK_TO_TEMPLATE`：LLM 失败时是否回退到模板报告
- `LLM_SYSTEM_PROMPT_PATH`：系统提示词文件路径

## 本地联调方式

小程序端在 [app.js](/d:/1work/MBTI/app.js:1) 中设置：

```js
globalData: {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "http://127.0.0.1:3000",
  useMock: false,
  userId: "demo-user",
  requestHeaders: {
    "x-user-id": "demo-user",
  },
}
```

联调说明：

- 当前后端通过 `x-user-id` 区分用户
- 前端提交答卷后，后端会先返回 `pending`
- 报告会在短延迟后变为 `ready`
- 历史记录接口不会返回 `failed` 状态的数据

## 大模型接入说明

当前后端已经支持两种报告生成模式：

- `template`：使用本地模板生成报告
- `llm`：调用 OpenAI 兼容大模型接口生成报告

如果要切到大模型模式：

```env
REPORT_GENERATION_MODE=llm
LLM_BASE_URL=https://your-llm-host/v1
LLM_API_KEY=your_api_key
LLM_MODEL=your_model_name
```

提示词文件默认位于 [backend/prompts/report-system-prompt.md](/d:/1work/MBTI/backend/prompts/report-system-prompt.md:1)。

大模型返回结果后，后端会：

1. 解析 JSON
2. 按既有报告结构校验
3. 校验通过后写入 `report_json`
4. 校验失败时按配置决定回退模板或标记失败

## 按 MBTI 类型缓存

后端已支持按 `assessmentId + mbtiType` 缓存报告：

- 提交答卷后会先查该类型缓存
- 命中缓存时，记录会直接以 `ready` 返回
- 未命中缓存时，继续走实时生成链路
- 实时生成成功或模板兜底成功后，会把该类型结果写入缓存

这意味着：

- 首次出现某个 MBTI 类型时，仍可能走实时生成
- 同类型后续请求通常会更快
- 实时 LLM 接口与流程仍然保留，没有被移除

## 如何确认后端可用

可以直接访问：

```txt
GET http://127.0.0.1:3000/assessment/mbti_ai_value
```

如果能返回测评配置 JSON，说明服务已成功启动。

也可以直接在小程序里验证：

1. 首页能正常拉起题库
2. 答题提交后得到 `recordId`
3. 报告页从 `pending` 进入 `ready`
4. 历史页出现新记录

## 微信小程序相关注意事项

- 微信开发者工具里可以直接请求本机 `127.0.0.1`
- 真机联调时通常要改成局域网 IP 或可访问的 `https` 测试域名
- 正式发布前，需要替换为真实鉴权方案，不建议继续使用 `x-user-id` 作为生产方案

## 数据说明

- 数据库默认在 [backend/data/mbti.sqlite](/d:/1work/MBTI/backend/data/mbti.sqlite)
- 题库与测评配置来自 [utils/assessment-config.js](/d:/1work/MBTI/utils/assessment-config.js:1)
- 报告内容生成依赖 [utils/report-generator.js](/d:/1work/MBTI/utils/report-generator.js:1)
- 服务启动时会自动建表并补齐默认测评配置
