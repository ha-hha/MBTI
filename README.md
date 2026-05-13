# MBTI 小程序

这是一个已完成首版上线收口的微信小程序项目，主题为 `MBTI 性格测试`。当前版本包含完整的小程序前端、Node.js 后端、SQLite 数据存储、微信登录与手机号绑定、报告生成链路，以及浏览器可访问的运营后台。

## 当前版本能力

- 首页、答题页、报告页、历史记录页、分享页、隐私页
- 报告页分包加载，避免主包体积超限
- MBTI 类型图片走远程资源，不再打进小程序包
- 报告生成支持 `template` 和 `llm` 两种模式
- 按 `assessmentId + mbtiType` 做 16 型报告缓存
- 微信登录、手机号绑定、退出登录
- “先答题，后授权，再生成报告”的主流程
- 浏览器运营后台：管理员登录、报告列表、报告详情、近 14 日趋势

## 目录说明

- `pages/`：主包页面
- `package-report/`：报告页分包
- `services/api.js`：前端接口层
- `app.js`：小程序运行时配置与登录态管理
- `utils/assessment-config.js`：测评配置与题库
- `utils/report-generator.js`：本地模板报告生成逻辑
- `server-assets/mbti/`：16 型 MBTI 远程图片源文件
- `backend/`：后端服务
- `MBTI_backend_api_v1.md`：接口文档
- `MBTI_PRD_v1.md`：产品文档
- `TEST_CHECKLIST.md`：联调与验收清单

## 小程序页面结构

主包页面：

- `pages/index/index`
- `pages/privacy/index`
- `pages/share/index`
- `pages/quiz/index`
- `pages/history/index`

报告分包：

- `package-report/pages/report/index`

## 当前主流程

1. 用户进入首页，可直接开始测评，不强制先登录。
2. 用户完成 20 题作答后，点击生成报告。
3. 若未绑定手机号，会在答题页弹出授权层。
4. 授权成功后，前端再正式提交答卷。
5. 报告页先进入 `pending`，再转为 `ready` 或 `failed`。
6. 历史记录页仍要求已登录且已绑定手机号。

补充说明：

- 取消手机号授权时，当前页答案会保留，可再次尝试生成报告。
- 退出登录后，仍可重新答题，但生成报告前需要再次完成授权。

## 运行配置

当前 [app.js](/abs/d:/1work/MBTI/app.js:1) 默认指向正式环境：

```js
globalData: {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "https://mbti.pinggu.com",
  assetBaseUrl: "https://mbti.pinggu.com",
  useMock: false,
  userId: "",
  requestHeaders: {},
}
```

说明：

- `apiBaseUrl`：后端 API 域名
- `assetBaseUrl`：报告页远程素材域名
- `useMock: false`：默认走真实后端

## Mock 与真实接口切换

只看前端页面时，可开启 mock：

```js
globalData: {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "",
  assetBaseUrl: "",
  useMock: true,
  userId: "",
  requestHeaders: {},
}
```

以下任一条件满足都会进入 mock：

- `useMock === true`
- `apiBaseUrl` 为空

## 前端启动方式

1. 用微信开发者工具打开项目根目录 `d:\1work\MBTI`
2. 使用正式 `AppID` 或测试号编译
3. 真机预览时确认 request 合法域名已配置为 `https://mbti.pinggu.com`

## 报告页资源方案

为解决小程序包体积限制，当前采用：

- 报告页独立分包
- MBTI 16 型图片远程加载
- 顾问二维码、公司 logo、小程序码放在报告分包内

远程 MBTI 图片访问口径：

- `https://mbti.pinggu.com/static/mbti/*.png`

## 运营后台

后端内置了一个最小运营后台，可通过浏览器访问：

- 登录页：`https://mbti.pinggu.com/admin/login`
- 列表页：`https://mbti.pinggu.com/admin/reports`

当前后台支持：

- 管理员登录
- 测评记录列表
- 报告详情
- 今日报告数
- 近 14 日报告趋势
- 报告生成时间 / 注册时间排序

详细说明见 [backend/README.md](/abs/d:/1work/MBTI/backend/README.md:1)。

## 后端接口

当前前端主要依赖这些接口：

- `POST /auth/wx-login`
- `GET /auth/me`
- `POST /auth/wx-phone`
- `POST /auth/logout`
- `GET /assessment/:id`
- `POST /assessment/:id/submit`
- `GET /report/:recordId`
- `GET /assessment/:id/records`

## 素材说明

报告页品牌素材：

- `package-report/assets/brand/logo.png`
- `package-report/assets/brand/caie-qrcode.png`
- `package-report/assets/brand/miniprogram-code.png`

MBTI 图片源文件：

- `server-assets/mbti/`

## 联调与上线要点

- 本地开发时，开发者工具可直连本地后端
- 真机和正式环境必须使用 HTTPS 域名
- 小程序前端改动不需要重启服务器，但需要重新编译并上传小程序版本
- 后端改动需要同步到服务器并重启 `mbti-backend`

## 验收建议

建议至少手动回归以下流程：

1. 首页正常加载配置
2. 开始测评可直接进入答题页
3. 第 20 题答完后才显示 100% 进度
4. 未授权时点击生成报告会弹授权层
5. 授权成功后进入报告页 `pending -> ready`
6. 取消授权不丢失当前答案
7. 历史记录页仍需登录后访问
8. 报告图片、二维码、logo 正常展示

详细清单见 [TEST_CHECKLIST.md](/abs/d:/1work/MBTI/TEST_CHECKLIST.md:1)。
