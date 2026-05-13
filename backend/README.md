# MBTI Backend

这是 MBTI 微信小程序的后端服务，当前已用于正式环境，负责测评配置、用户登录、手机号绑定、答卷提交、报告生成、历史记录查询，以及浏览器运营后台。

## 当前能力

- 微信 `wx.login` 登录
- 微信手机号绑定
- 用户会话管理
- 测评配置读取
- 答卷提交与 MBTI 计算
- 报告查询
- 历史记录查询
- 模板报告 / LLM 报告
- 16 型 MBTI 报告缓存预热
- 运营后台：管理员登录、报告列表、报告详情、趋势统计

## 技术栈

- Node.js
- Express
- SQLite
- `better-sqlite3`
- PM2
- Nginx

## 主要路由

用户相关：

- `POST /auth/wx-login`
- `GET /auth/me`
- `POST /auth/wx-phone`
- `POST /auth/logout`

业务相关：

- `GET /assessment/:id`
- `POST /assessment/:id/submit`
- `GET /assessment/:id/records`
- `GET /report/:recordId`
- `GET /health`

后台相关：

- `GET /admin/login`
- `GET /admin/reports`
- `GET /admin/reports/:recordId`
- `POST /admin/api/login`
- `POST /admin/api/logout`
- `GET /admin/api/me`
- `GET /admin/api/reports/overview`
- `GET /admin/api/reports`
- `GET /admin/api/reports/:recordId`

## 本地启动

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

## 环境变量

请以 [backend/.env.example](/abs/d:/1work/MBTI/backend/.env.example:1) 为模板创建 `backend/.env`。

常用字段：

```env
HOST=127.0.0.1
PORT=3000
DB_PATH=/opt/mbti/backend/data/mbti.sqlite
REPORT_DELAY_MS=1200
REPORT_GENERATION_MODE=template

WECHAT_APP_ID=
WECHAT_APP_SECRET=
SESSION_TOKEN_TTL_DAYS=30
WECHAT_API_TIMEOUT_MS=8000

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
ADMIN_SESSION_TTL_DAYS=7

LLM_PROVIDER=openai-compatible
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_MS=3000
LLM_MAX_RETRIES=1
LLM_TEMPERATURE=0.8
LLM_PROMPT_VERSION=v1
LLM_FALLBACK_TO_TEMPLATE=true
LLM_SYSTEM_PROMPT_PATH=./prompts/report-system-prompt.md
```

重点说明：

- `DB_PATH`：SQLite 数据库路径
- `REPORT_GENERATION_MODE`：`template` 或 `llm`
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`：微信登录与手机号能力所需
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` / `ADMIN_SESSION_SECRET`：运营后台登录配置
- `LLM_TIMEOUT_MS`：模型超时，当前建议控制在较低值

注意：

- `backend/.env` 不要提交到 GitHub
- `WECHAT_APP_SECRET`、`LLM_API_KEY`、后台密钥都属于敏感信息

## 当前正式流程

当前前端主流程已经调整为：

1. 用户先完成 20 题作答
2. 点击生成报告时，再触发手机号授权
3. 授权成功后，前端才调用 `POST /assessment/:id/submit`
4. 后端生成记录并进入 `pending`
5. 报告生成完成后返回 `ready`

这意味着：

- `GET /assessment/:id` 必须支持匿名访问
- 提交、历史记录、报告查询仍依赖登录态

## 登录与手机号绑定

### 1. 微信登录

前端调用 `wx.login()` 后，将 `code` 传给：

```txt
POST /auth/wx-login
```

成功后返回会话信息，后续请求通过：

```txt
x-session-token: <sessionToken>
```

### 2. 手机号绑定

前端获取 `getPhoneNumber` 返回的 `code` 后，调用：

```txt
POST /auth/wx-phone
```

手机号首次绑定成功后：

- `users.phone_number` 写入
- `users.phone_bound_at` 固定为首次绑定时间

后续同一用户重复授权手机号时，不会覆盖首次绑定时间。

## 报告生成模式

### template

首发稳定模式，默认推荐：

```env
REPORT_GENERATION_MODE=template
```

适合：

- 正式环境稳定上线
- 不依赖外部模型服务
- 低延迟返回

### llm

需要配置 OpenAI 兼容接口：

```env
REPORT_GENERATION_MODE=llm
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-llm-host
LLM_API_KEY=your_api_key
LLM_MODEL=your_model_name
```

当前如果 LLM 失败，可根据配置回退模板。

## MBTI 缓存

后端支持按 `assessmentId + mbtiType` 缓存报告内容。

缓存命中时：

- 仍会经历一次短暂 `pending`
- 然后快速转为 `ready`

### 预热 16 型缓存

```powershell
cd d:\1work\MBTI\backend
npm.cmd run cache:warm
```

Linux 服务器上：

```bash
cd /opt/mbti/backend
npm run cache:warm
```

## 运营后台

当前后台为同服务内嵌页面，浏览器直接访问：

- 登录页：`https://mbti.pinggu.com/admin/login`
- 列表页：`https://mbti.pinggu.com/admin/reports`

字段口径：

- 一次测评一行
- `ready = 已完成`
- `pending / failed = 未完成`
- “已绑定手机号”表示该用户已完成手机号绑定
- “是否首测”表示该条记录是否为该用户第一条测评记录

## 数据位置

- 数据库：`backend/data/mbti.sqlite`
- 初始化脚本：`backend/src/scripts/initDb.js`
- 缓存预热脚本：`backend/src/scripts/warmAllMbtiCache.js`
- PM2 配置：`backend/ecosystem.config.cjs`
- Nginx 配置模板：`backend/deploy/nginx/mbti.pinggu.com.conf`
- Ubuntu 初始化脚本：`backend/deploy/setup-ubuntu.sh`
- SQLite 备份脚本：`backend/deploy/backup-sqlite.sh`

## 生产部署

当前正式部署架构：

- 域名：`https://mbti.pinggu.com`
- Nginx 反向代理
- Node.js 服务监听 `127.0.0.1:3000`
- PM2 进程名：`mbti-backend`
- SQLite 单机部署

常见部署目录：

```txt
/opt/mbti/backend
```

### 更新代码后重启

```bash
cd /opt/mbti/backend
npm install --omit=dev
pm2 restart mbti-backend
pm2 save
curl http://127.0.0.1:3000/health
```

## 联调与排查

确认服务可用：

```txt
GET http://127.0.0.1:3000/health
```

或：

```txt
GET http://127.0.0.1:3000/assessment/mbti_ai_value
```

如果报告生成异常，优先检查：

- `.env` 是否正确
- 微信 `AppID / AppSecret` 是否匹配
- 当前是否走 `template` 还是 `llm`
- PM2 日志与 Nginx 日志

## 安全提醒

- 不要提交 `backend/.env`
- 不要提交 `backend/data/mbti.sqlite`
- 不要提交任何服务器密码、证书、API Key
- 若密钥曾在聊天、截图或仓库里暴露，应立即轮换
