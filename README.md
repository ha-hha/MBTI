# MBTI

微信小程序版 MBTI 测评项目，当前包含前端 4 个页面和一套本地可联调的最小后端。

## 当前状态

- 前端页面已具备完整主流程：首页、答题页、报告页、历史页
- 前端支持两种运行模式：本地 mock、真实后端接口
- 后端已提供最小可用接口，适合本地开发和联调
- 当前项目以微信小程序开发为前提，不是普通 Web 页面工程

## 目录说明

- `pages/`：小程序页面
- `services/api.js`：前端接口层，负责 mock/真实接口切换
- `app.js`：小程序运行时配置入口
- `utils/assessment-config.js`：测评配置与题库
- `utils/report-generator.js`：报告生成逻辑
- `backend/`：本地联调后端
- `MBTI_backend_api_v1.md`：前后端接口协议
- `TEST_CHECKLIST.md`：联调与验收清单

## 前端启动

1. 用微信开发者工具打开项目根目录：`d:\1work\MBTI`
2. 选择测试号或游客模式
3. 编译后即可运行小程序

## 运行模式

### 1. mock 演示模式

适合只看页面流程，不依赖后端。

在 [app.js](/d:/1work/MBTI/app.js:1) 中保证：

```js
globalData: {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "",
  useMock: true,
  userId: "",
  requestHeaders: {},
}
```

满足以下任一条件都会走 mock：

- `useMock === true`
- `apiBaseUrl` 为空

### 2. 真实后端联调模式

适合前后端一起开发和验收。

先启动后端：

```powershell
cd d:\1work\MBTI\backend
npm.cmd install
npm.cmd run db:init
npm.cmd run dev
```

再把 [app.js](/d:/1work/MBTI/app.js:1) 配成真实接口：

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

- `apiBaseUrl` 指向后端服务地址
- `requestHeaders` 是请求头注入位置，当前本地后端使用 `x-user-id`
- PowerShell 下如果 `npm` 被脚本策略拦住，优先使用 `npm.cmd`

## 运行时配置说明

运行时配置定义在 [app.js](/d:/1work/MBTI/app.js:1)。

- `assessmentId`：当前测评 ID，默认 `mbti_ai_value`
- `apiBaseUrl`：后端服务地址，末尾不要带 `/`
- `useMock`：是否强制使用 mock
- `userId`：本地兜底用户 ID
- `requestHeaders`：宿主或联调环境注入的鉴权请求头

项目运行时也可以通过 `getApp().setRuntimeConfig()` 动态覆盖这些配置。

## 如何判断现在走的是 mock 还是真实接口

- 看 [app.js](/d:/1work/MBTI/app.js:1)：
  - `useMock: true`，一定走 mock
  - `apiBaseUrl: ""`，也会走 mock
  - `useMock: false` 且 `apiBaseUrl` 有值，才会走真实接口
- 看微信开发者工具的 `Network`：
  - 如果能看到请求发往 `http://127.0.0.1:3000/...`，说明已经连到后端
  - 如果没有真实请求而页面仍能正常展示，大概率还在走 mock
- 看后端终端：
  - 提交答题、轮询报告、查看历史时，如果后端有对应访问记录，说明前后端已连通

## 微信小程序联调注意事项

- 在微信开发者工具里，本地调试可以直接请求 `http://127.0.0.1:3000`
- 真机联调时通常不能继续用 `127.0.0.1`
- 真机联调一般需要改成电脑局域网 IP，或使用可访问的 `https` 测试域名
- 正式上线时，需要按微信小程序要求配置合法域名

## 后端接口

当前前端依赖以下 4 个接口：

- `GET /assessment/{id}`
- `POST /assessment/{id}/submit`
- `GET /report/{recordId}`
- `GET /assessment/{id}/records`

详细协议见 [MBTI_backend_api_v1.md](/d:/1work/MBTI/MBTI_backend_api_v1.md:1)。

## 联调验收

建议至少手动走一遍以下流程：

1. 首页成功拉到配置并进入答题页
2. 20 题答完后可成功提交
3. 报告页经历 `pending -> ready`
4. 历史页能看到刚生成的记录
5. 结果页可点击分享

完整清单见 [TEST_CHECKLIST.md](/d:/1work/MBTI/TEST_CHECKLIST.md:1)。
