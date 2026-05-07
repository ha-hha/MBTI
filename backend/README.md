# MBTI Backend

这是 MBTI 微信小程序的本地联调后端，负责提供：

- 测评配置接口
- 提交答卷接口
- 报告查询接口
- 历史记录接口
- 模板 / LLM 两种报告生成模式
- 按 `MBTI 类型` 缓存报告

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

默认地址：

```txt
http://127.0.0.1:3000
```

如果 PowerShell 拦截 `npm`，优先使用 `npm.cmd`。

## 环境变量

参考 [backend/.env.example](/d:/1work/MBTI/backend/.env.example:1)：

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
LLM_TIMEOUT_MS=15000
LLM_MAX_RETRIES=1
LLM_TEMPERATURE=0.8
LLM_PROMPT_VERSION=v1
LLM_FALLBACK_TO_TEMPLATE=true
LLM_SYSTEM_PROMPT_PATH=./prompts/report-system-prompt.md
```

字段说明：

- `PORT`：服务端口
- `DB_PATH`：SQLite 文件路径
- `REPORT_DELAY_MS`：普通实时生成链路的延迟
- `DEFAULT_USER_ID`：未显式传用户头时的兜底用户
- `REPORT_GENERATION_MODE`：`template` 或 `llm`
- `LLM_PROVIDER`：当前使用的模型提供方类型
- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`：OpenAI 兼容接口配置
- `LLM_TIMEOUT_MS`：单次模型请求超时
- `LLM_MAX_RETRIES`：模型请求重试次数
- `LLM_FALLBACK_TO_TEMPLATE`：LLM 失败时是否回退本地模板
- `LLM_SYSTEM_PROMPT_PATH`：系统提示词文件路径

## 与小程序联调

在小程序 [app.js](/d:/1work/MBTI/app.js:1) 中配置：

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

说明：

- 当前后端通过 `x-user-id` 区分用户
- 前端提交后，报告会先进入 `pending`
- 然后转为 `ready`

## 报告生成模式

### 1. template

使用本地模板直接生成报告。

```env
REPORT_GENERATION_MODE=template
```

适合：

- 本地开发
- 无外网环境
- LLM 不稳定时兜底

### 2. llm

调用 OpenAI 兼容接口生成报告。

```env
REPORT_GENERATION_MODE=llm
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-llm-host
LLM_API_KEY=your_api_key
LLM_MODEL=your_model_name
```

提示词文件默认在：

- [backend/prompts/report-system-prompt.md](/d:/1work/MBTI/backend/prompts/report-system-prompt.md:1)

LLM 返回后，后端会：

1. 组合提示词
2. 请求模型
3. 解析返回内容
4. 校验报告结构
5. 写入记录
6. 失败时按配置决定是否回退模板

## MBTI 类型缓存

后端已经支持按 `assessmentId + mbtiType` 缓存报告：

- 首次出现某个 MBTI 类型时，走实时生成
- 生成成功后写入缓存
- 后续相同类型请求优先命中缓存
- 命中缓存时不会立刻直返，仍会先经历一次短暂 `pending`
- 当前缓存命中时约 `1 秒` 后转为 `ready`

这意味着：

- 真实生成链路还在，没被删掉
- 重复类型的体验会更快
- 用户仍能看到“AI 正在分析”的过渡过程

### 预热 16 型缓存

如果你希望在联调前就把 `16` 种 MBTI 类型全部预生成到缓存中，可以执行：

```powershell
cd d:\1work\MBTI\backend
npm.cmd run cache:warm
```

这个命令会：

- 逐个检查 `ISTJ` 到 `ENTJ` 的缓存是否存在
- 对缺失类型生成模板或 LLM 报告
- 将结果写入 `mbti_report_cache`

默认行为是“只补缺，不覆盖已有缓存”。

如果你已经调整了模板文案或提示词，想强制刷新全部 `16` 种类型，可执行：

```powershell
cd d:\1work\MBTI\backend
node src/scripts/warmAllMbtiCache.js --refresh
```

补充说明：

- 当 `REPORT_GENERATION_MODE=template` 时，会用本地模板批量生成
- 当 `REPORT_GENERATION_MODE=llm` 时，会优先调用模型；若开启了回退，则失败时自动落回模板
- 预热缓存不会删除“实时生成”链路，后续未命中或需要刷新时仍可正常走实时生成

## 数据说明

- 数据库默认路径：[backend/data/mbti.sqlite](/d:/1work/MBTI/backend/data/mbti.sqlite:1)
- 测评配置来源：[utils/assessment-config.js](/d:/1work/MBTI/utils/assessment-config.js:1)
- 模板报告生成来源：[utils/report-generator.js](/d:/1work/MBTI/utils/report-generator.js:1)

服务启动时会自动：

- 建表
- 补齐新增字段
- 写入默认测评配置
- 预热历史 `ready` 记录形成的 MBTI 缓存

## 如何确认后端可用

直接访问：

```txt
GET http://127.0.0.1:3000/assessment/mbti_ai_value
```

如果能返回测评配置 JSON，说明服务已经启动成功。

也可以从小程序侧验证：

1. 首页能拉起测评配置
2. 提交后拿到 `recordId`
3. 报告页从 `pending` 进入 `ready`
4. 历史页出现新记录

## 微信小程序相关注意事项

- 开发者工具里可直接请求本机 `127.0.0.1`
- 真机联调时通常要改成局域网 IP 或可访问的 `https` 域名
- 正式环境不建议继续使用 `x-user-id` 作为生产鉴权方案
