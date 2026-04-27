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

## 环境变量

可选配置见 [backend/.env.example](/d:/1work/MBTI/backend/.env.example:1)：

```env
PORT=3000
DB_PATH=./data/mbti.sqlite
REPORT_DELAY_MS=1800
DEFAULT_USER_ID=demo-user
```

说明：

- `PORT`：服务端口
- `DB_PATH`：SQLite 文件路径
- `REPORT_DELAY_MS`：报告从 `pending` 到 `ready` 的模拟异步延迟
- `DEFAULT_USER_ID`：未显式传用户头时的兜底用户

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
