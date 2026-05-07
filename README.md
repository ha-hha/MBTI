# MBTI 小程序

这是一个基于微信小程序的 MBTI 测评项目，当前已经包含：

- 完整前端主流程：首页、答题页、报告页、历史页
- 本地可联调后端：配置接口、提交答卷、查询报告、历史记录
- 报告生成双模式：模板模式、LLM 模式
- 按 `MBTI 类型` 缓存报告，加快重复类型的返回速度
- 报告页品牌化素材：MBTI 图片、顾问二维码、小程序码、机构 logo

项目定位是微信小程序，不是普通 Web 页面工程。

## 目录说明

- `pages/`：小程序页面
- `services/api.js`：前端接口层，支持 mock / 真实接口切换
- `app.js`：小程序运行时配置入口
- `assets/brand/`：品牌素材、二维码、小程序码
- `assets/mbti/`：16 型 MBTI 图片素材
- `utils/assessment-config.js`：测评配置与题库
- `utils/report-generator.js`：本地模板报告生成逻辑
- `backend/`：本地联调后端
- `MBTI_backend_api_v1.md`：接口协议
- `MBTI_PRD_v1.md`：产品需求文档
- `TEST_CHECKLIST.md`：联调与验收清单

## 前端启动

1. 用微信开发者工具打开项目根目录：`d:\1work\MBTI`
2. 选择测试号或游客模式
3. 编译后运行小程序

## 当前运行配置

当前 [app.js](/d:/1work/MBTI/app.js:1) 默认是走真实本地后端：

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

- `useMock: false`：默认不走 mock
- `apiBaseUrl`：指向本地后端
- `x-user-id`：当前本地联调用的简单用户标识

## mock 与真实接口切换

### mock 模式

适合只看页面，不依赖后端。

把 [app.js](/d:/1work/MBTI/app.js:1) 改成：

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

### 真实接口模式

适合前后端联调与验收。

先启动后端：

```powershell
cd d:\1work\MBTI\backend
npm.cmd install
npm.cmd run db:init
npm.cmd run dev
```

然后保持 [app.js](/d:/1work/MBTI/app.js:1) 指向：

```js
apiBaseUrl: "http://127.0.0.1:3000"
```

## 当前主流程

1. 首页加载测评配置并进入答题页
2. 20 题完整作答后提交
3. 报告页先进入 `pending`
4. 后端完成生成后进入 `ready`
5. 历史页可查看已生成记录

当前报告页已经支持：

- 顶部 MBTI 图片展示
- 报告模块展示
- 顾问二维码
- 小程序码
- 机构 logo 与说明

## 报告生成说明

后端支持两种报告生成模式：

- `template`：本地模板生成
- `llm`：调用 OpenAI 兼容接口生成

当前还保留了“实时生成”接口链路，同时增加了缓存机制：

- 缓存维度：`assessmentId + mbtiType`
- 命中缓存时，仍会先进入一次短暂 `pending`
- 当前缓存命中时约 `1 秒` 后返回结果
- 未命中缓存时，继续走实时生成链路

如果希望把 `16` 种 MBTI 报告先批量写入缓存，可在后端目录执行：

```powershell
cd d:\1work\MBTI\backend
npm.cmd run cache:warm
```

更完整说明见 [backend/README.md](/d:/1work/MBTI/backend/README.md:1)。

## 如何判断前后端是否连通

- 看 [app.js](/d:/1work/MBTI/app.js:1) 是否为 `useMock: false`
- 看微信开发者工具 `Network` 是否请求了 `http://127.0.0.1:3000/...`
- 看后端终端是否有对应接口访问日志

如果页面正常显示、但没有真实网络请求，大概率还在走 mock。

## 微信小程序联调注意事项

- 开发者工具里可直接请求 `http://127.0.0.1:3000`
- 真机联调时通常不能继续使用 `127.0.0.1`
- 真机联调一般需要改成电脑局域网 IP，或可访问的 `https` 测试域名
- 正式上线前需要配置微信合法域名

## 后端接口

当前前端依赖以下 4 个接口：

- `GET /assessment/{id}`
- `POST /assessment/{id}/submit`
- `GET /report/{recordId}`
- `GET /assessment/{id}/records`

详细协议见 [MBTI_backend_api_v1.md](/d:/1work/MBTI/MBTI_backend_api_v1.md:1)。

## 素材目录

品牌素材统一放在：

- `assets/brand/logo.png`
- `assets/brand/caie-qrcode.png`
- `assets/brand/miniprogram-code.png`

MBTI 图片统一放在：

- `assets/mbti/intj.png`
- `assets/mbti/intp.png`
- `assets/mbti/entj.png`
- `assets/mbti/entp.png`
- `assets/mbti/infj.png`
- `assets/mbti/infp.png`
- `assets/mbti/enfj.png`
- `assets/mbti/enfp.png`
- `assets/mbti/istj.png`
- `assets/mbti/isfj.png`
- `assets/mbti/estj.png`
- `assets/mbti/esfj.png`
- `assets/mbti/istp.png`
- `assets/mbti/isfp.png`
- `assets/mbti/estp.png`
- `assets/mbti/esfp.png`

## 验收建议

建议至少手动走一遍：

1. 首页成功加载配置
2. 20 题可完整提交
3. 报告页经历 `pending -> ready`
4. 历史页出现新记录
5. 报告页二维码、图片、logo 显示正常

完整清单见 [TEST_CHECKLIST.md](/d:/1work/MBTI/TEST_CHECKLIST.md:1)。
