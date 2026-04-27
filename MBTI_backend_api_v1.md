# MBTI 后端接口文档 v1

## 1、文档说明
本文档面向前端、后端、测试与联调使用，用于定义 `16 型人格（MBTI）未来竞争力深度测评` 的后端接口、异步报告生成语义、返回结构、错误码与存储口径。

本文档与 [MBTI_PRD_v1.md](/d:/1work/MBTI/MBTI_PRD_v1.md:1) 保持一致；若两者存在冲突，以本文档中的接口与字段约束为准，产品规则仍以 PRD 为上位约束。

本版锁定决策如下：
- 报告生成采用 `异步`
- 报告正文采用 `JSON` 存储
- `submit` 成功后后端自动触发异步生成，不提供前端二次触发接口
- 报告查询采用 `统一 200 + status` 语义
- 历史记录列表接口纳入本版
- 沿用既有测评模块登录态，不在 body 中显式传 `userId`

---

## 2、通用约定

### 2.1 鉴权
- 所有接口均要求用户已登录。
- 用户身份通过既有测评模块登录态识别。
- 文档不重新定义 Token/Session 协议，仅标注为 `需登录`。

### 2.2 内容类型
- 请求：`Content-Type: application/json`
- 响应：`Content-Type: application/json; charset=utf-8`

### 2.3 时间与时区
- 所有时间字段使用 ISO 8601 字符串返回。
- 默认示例时区使用 `+08:00`。

### 2.4 分页约定
- 历史记录列表使用 `page` 和 `pageSize`。
- `page` 从 `1` 开始。
- 默认 `pageSize = 20`，最大 `pageSize = 50`。

### 2.5 异步状态枚举
- `pending`：报告生成中
- `ready`：报告生成完成，可返回完整结果
- `failed`：报告生成失败，不返回半成品内容

### 2.6 统一错误响应
除 `GET /report/{recordId}` 的业务状态采用 `200 + status` 外，其他异常按 HTTP 错误码返回，错误体统一为：

```json
{
  "code": "INVALID_ANSWER_COUNT",
  "message": "answers count must be exactly 20",
  "requestId": "req_20260427_xxx"
}
```

字段说明：
- `code`：稳定错误码，供前后端和测试使用
- `message`：面向研发排查的英文或中英混合错误描述
- `requestId`：可选，请求追踪 ID

---

## 3、核心数据模型

### 3.1 Question
```json
{
  "id": "Q01",
  "dimension": "EI",
  "stem": "参加完一场热闹的社交聚会后，你通常：",
  "options": [
    { "key": "A", "text": "感觉像充了电，心情依然很兴奋。" },
    { "key": "B", "text": "感觉电量耗尽，急需一个人待着安静一下。" }
  ],
  "optionLetterMapping": {
    "A": "E",
    "B": "I"
  }
}
```

字段约束：
- `id`：固定题号，范围 `Q01-Q20`
- `dimension`：`EI`、`SN`、`TF`、`JP`
- `options`：固定 `2` 项，仅允许 `A/B`

### 3.2 SubmitAnswer
```json
{
  "questionId": "Q01",
  "selectedOption": "A"
}
```

字段约束：
- `questionId` 必须属于当前测评正式题库
- `selectedOption` 仅允许 `A` 或 `B`

### 3.3 AssessmentRecord
```json
{
  "recordId": "rpt_20260427_000001",
  "assessmentId": "mbti_ai_value",
  "mbtiType": "ESFJ",
  "reportStatus": "pending",
  "submittedAt": "2026-04-27T10:00:00+08:00"
}
```

### 3.4 MbtiReport
```json
{
  "recordId": "rpt_20260427_000001",
  "themeTitle": "你的MBTI在 AI 时代值多少钱",
  "reportTitle": "AI 时代 MBTI 价值评估报告",
  "mbtiType": "ESFJ",
  "modules": [
    {
      "key": "asset_overview",
      "title": "性格资产总评",
      "items": ["条目1", "条目2", "条目3"]
    },
    {
      "key": "talent_strengths",
      "title": "你的天才所在",
      "items": ["条目1", "条目2", "条目3"]
    },
    {
      "key": "substitution_risks",
      "title": "替代风险",
      "items": ["条目1", "条目2", "条目3"]
    },
    {
      "key": "career_path",
      "title": "职业认证与阶层跃迁建议",
      "items": ["条目1", "条目2", "条目3"]
    }
  ]
}
```

字段约束：
- `themeTitle` 固定为 `你的MBTI在 AI 时代值多少钱`
- `reportTitle` 固定为 `AI 时代 MBTI 价值评估报告`
- `mbtiType` 必须为标准 `16` 型之一
- `modules` 固定 `4` 个，顺序固定
- 每个模块固定字段：`key`、`title`、`items`
- `items.length === 3`

### 3.5 HistoryRecordItem
```json
{
  "recordId": "rpt_20260427_000001",
  "assessmentId": "mbti_ai_value",
  "assessmentName": "16 型人格（MBTI）未来竞争力深度测评",
  "mbtiType": "ESFJ",
  "reportStatus": "ready",
  "createdAt": "2026-04-27T10:00:00+08:00"
}
```

---

## 4、接口 1：获取测评配置

### 4.1 基本信息
- 方法：`GET`
- 路径：`/assessment/{id}`
- 鉴权：需登录

### 4.2 用途
- 拉取测评元数据
- 拉取入口文案、分享文案
- 拉取正式题库与固定顺序

### 4.3 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 测评 ID，当前固定为 `mbti_ai_value` |

### 4.4 成功响应 `200`
```json
{
  "id": "mbti_ai_value",
  "name": "16 型人格（MBTI）未来竞争力深度测评",
  "themeTitle": "你的MBTI在 AI 时代值多少钱",
  "reportTitle": "AI 时代 MBTI 价值评估报告",
  "welcomeCopyPool": [
    "在时代海啸中，你的性格是最后的避风港。",
    "别再用旧规则，衡量新时代的自己。"
  ],
  "startCopy": "你好，我是你的性格资本分析师。我将带你穿透表象，评估你的认知模式、能量边界与性格护城河。请深呼吸，回答几个关键问题，测测你的MBTI在 AI 时代值多少钱。",
  "endCopy": "恭喜通关！你的《AI 时代性格资本报告》已生成。我们不仅识别了你的风险曲线，还找到了 AI 无法模拟的那部分独特天赋。想把性格变成竞争力，让 AI 成为你的外挂？你的答案，正在报告里等你开启。",
  "shareCopyPool": [
    "性格没有优劣，只有放错位置的资产。测测你的 MBTI 隐藏天赋，拿回属于你的财富说明书。",
    "别让 AI 成为你的噩梦，让它成为你的垫脚石！"
  ],
  "questionCount": 20,
  "questions": [
    {
      "id": "Q01",
      "dimension": "EI",
      "stem": "参加完一场热闹的社交聚会后，你通常：",
      "options": [
        { "key": "A", "text": "感觉像充了电，心情依然很兴奋。" },
        { "key": "B", "text": "感觉电量耗尽，急需一个人待着安静一下。" }
      ],
      "optionLetterMapping": {
        "A": "E",
        "B": "I"
      }
    }
  ]
}
```

说明：
- `questions` 实际返回 `20` 项，固定顺序为 `Q01-Q20`
- 示例仅展示单题结构，正式数据以 PRD 题库为准

### 4.5 错误码
- `INVALID_ASSESSMENT_ID`
- `ASSESSMENT_NOT_FOUND`
- `INTERNAL_ERROR`

### 4.6 HTTP 状态码
- `200`：成功
- `400`：路径参数非法
- `404`：测评不存在
- `500`：服务异常

---

## 5、接口 2：提交答卷并自动触发异步生成

### 5.1 基本信息
- 方法：`POST`
- 路径：`/assessment/{id}/submit`
- 鉴权：需登录

### 5.2 用途
- 接收用户答卷
- 校验答案合法性
- 计算唯一 `mbtiType`
- 创建 `recordId`
- 将报告生成任务自动入队

### 5.3 提交成功的定义
提交成功仅代表：
- 答卷已接收
- `mbtiType` 已判定完成
- 报告任务已创建并开始异步处理

提交成功不代表报告一定已生成完成。

### 5.4 请求体
```json
{
  "assessmentId": "mbti_ai_value",
  "answers": [
    { "questionId": "Q01", "selectedOption": "A" },
    { "questionId": "Q02", "selectedOption": "B" }
  ]
}
```

### 5.5 请求字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `assessmentId` | string | 是 | 必须与路径中的 `{id}` 一致 |
| `answers` | array | 是 | 固定 `20` 项 |
| `answers[].questionId` | string | 是 | 题号 |
| `answers[].selectedOption` | string | 是 | 仅允许 `A/B` |

### 5.6 校验规则
- 必须正好提交 `20` 题
- `questionId` 必须全部属于当前测评正式题库
- 每题只能出现一次
- `selectedOption` 只能是 `A` 或 `B`
- 路径中的 `{id}` 与 body 中的 `assessmentId` 必须一致

### 5.7 成功响应 `200`
```json
{
  "recordId": "rpt_20260427_000001",
  "assessmentId": "mbti_ai_value",
  "mbtiType": "ESFJ",
  "reportStatus": "pending",
  "submittedAt": "2026-04-27T10:00:00+08:00"
}
```

说明：
- 默认返回 `reportStatus: pending`
- 若后端生成极快，也允许直接返回 `reportStatus: ready`
- 无论返回 `pending` 还是 `ready`，前端后续都统一调用 `GET /report/{recordId}` 获取报告详情

### 5.8 错误码
- `INVALID_ASSESSMENT_ID`
- `ASSESSMENT_NOT_FOUND`
- `INVALID_ANSWER_COUNT`
- `INVALID_QUESTION_ID`
- `INVALID_SELECTED_OPTION`
- `DUPLICATE_QUESTION_ID`
- `INTERNAL_ERROR`

### 5.9 HTTP 状态码
- `200`：提交成功
- `400`：参数或答案校验失败
- `404`：测评不存在
- `500`：服务异常

---

## 6、接口 3：查询异步报告状态与结果

### 6.1 基本信息
- 方法：`GET`
- 路径：`/report/{recordId}`
- 鉴权：需登录

### 6.2 用途
- 查询异步报告当前状态
- 在 `ready` 时返回完整报告内容
- 在 `failed` 时返回失败状态，不返回半成品内容

### 6.3 查询语义
本接口始终返回 `HTTP 200` 表示“查询请求已成功处理”，真正的业务状态由 `status` 字段表示：
- `pending`
- `ready`
- `failed`

### 6.4 `pending` 响应示例
```json
{
  "recordId": "rpt_20260427_000001",
  "status": "pending",
  "estimatedRetryAfterSeconds": 2,
  "updatedAt": "2026-04-27T10:00:02+08:00"
}
```

约束：
- 不返回部分报告内容
- `estimatedRetryAfterSeconds` 为可选字段，用于前端轮询节奏控制

### 6.5 `ready` 响应示例
```json
{
  "recordId": "rpt_20260427_000001",
  "status": "ready",
  "themeTitle": "你的MBTI在 AI 时代值多少钱",
  "reportTitle": "AI 时代 MBTI 价值评估报告",
  "mbtiType": "ESFJ",
  "modules": [
    {
      "key": "asset_overview",
      "title": "性格资产总评",
      "items": [
        "你的 MBTI 类型是 ESFJ，在 AI 协作链条中属于情感逻辑校准员，负责把技术产物翻译成可执行的团队节奏。",
        "你的核心人性护城河是对群体情绪与需求的高敏捕捉力，使你成为自动化浪潮中稳定组织气压的关键节点。",
        "F 与 J 的组合让你在企业 AI 转型中承担人机接口层角色，既能维持秩序，也能让 AI 流程被团队真正落地。"
      ]
    },
    {
      "key": "talent_strengths",
      "title": "你的天才所在",
      "items": [
        "你具备天然的需求识别力，能在混乱信息中捕捉团队的真实诉求，为 AI 决策补足场景理解。",
        "你的组织节奏控制力强，能把技术方案拆成可执行的具体动作，这是 AI 无法独立完成的落地能力。",
        "你的情绪洞察算力极高，能及时稳定团队氛围，使人机协同保持高流畅度。"
      ]
    },
    {
      "key": "substitution_risks",
      "title": "替代风险",
      "items": [
        "容易因过度关注人际反馈而延迟决策，在高节奏 AI 流程中可能被自动化响应速度压制。",
        "对既有流程依赖较深，可能导致在工具迭代中出现学习成本偏高的状况。",
        "AI 提效建议：让模型负责结构化信息，你只做判断层；使用提示工程把团队需求转为 AI 能理解的任务指令。"
      ]
    },
    {
      "key": "career_path",
      "title": "职业认证与阶层跃迁建议",
      "items": [
        "你的需求分析力与协调能力，与 CAIE 的提示工程与应用设计模块高度契合，是天然适配方向。",
        "在企业 AI 化中，你适合从执行者升级为 AI 协同流程设计者，主导人机合作的节奏与落地质量。",
        "路径建议：掌握 AI 协作工具 -> 建立流程模板库 -> 考取 CAIE 认证 -> 晋升为部门级 AI 落地负责人。"
      ]
    }
  ],
  "updatedAt": "2026-04-27T10:00:05+08:00"
}
```

### 6.6 `failed` 响应示例
```json
{
  "recordId": "rpt_20260427_000001",
  "status": "failed",
  "errorCode": "REPORT_GENERATION_FAILED",
  "userMessageKey": "mbti_report_generation_failed",
  "updatedAt": "2026-04-27T10:00:08+08:00"
}
```

约束：
- 不返回任何半成品 `modules`
- `userMessageKey` 供前端映射统一失败文案

### 6.7 访问控制错误
以下错误不走 `200 + status`，仍按常规 HTTP 错误返回：
- `RECORD_NOT_FOUND`
- `RECORD_ACCESS_DENIED`
- `INTERNAL_ERROR`

### 6.8 HTTP 状态码
- `200`：查询成功，业务状态见 `status`
- `403`：无权访问该记录
- `404`：记录不存在
- `500`：服务异常

---

## 7、接口 4：查询历史记录列表

### 7.1 基本信息
- 方法：`GET`
- 路径：`/assessment/{id}/records`
- 鉴权：需登录

### 7.2 用途
- 返回当前登录用户的测评历史记录
- 供历史页展示与恢复进入结果页使用

### 7.3 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | integer | 否 | `1` | 页码，从 `1` 开始 |
| `pageSize` | integer | 否 | `20` | 每页数量，最大 `50` |

示例：
`GET /assessment/mbti_ai_value/records?page=1&pageSize=20`

### 7.4 列表规则
- 仅返回当前登录用户自己的记录
- 默认按 `createdAt desc`
- `failed` 记录不出现在历史列表中
- `pending` 记录默认显示，便于前端恢复轮询

### 7.5 成功响应 `200`
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 2,
  "hasMore": false,
  "items": [
    {
      "recordId": "rpt_20260427_000002",
      "assessmentId": "mbti_ai_value",
      "assessmentName": "16 型人格（MBTI）未来竞争力深度测评",
      "mbtiType": "INTP",
      "reportStatus": "pending",
      "createdAt": "2026-04-27T10:10:00+08:00"
    },
    {
      "recordId": "rpt_20260427_000001",
      "assessmentId": "mbti_ai_value",
      "assessmentName": "16 型人格（MBTI）未来竞争力深度测评",
      "mbtiType": "ESFJ",
      "reportStatus": "ready",
      "createdAt": "2026-04-27T10:00:00+08:00"
    }
  ]
}
```

### 7.6 错误码
- `INVALID_ASSESSMENT_ID`
- `ASSESSMENT_NOT_FOUND`
- `INTERNAL_ERROR`

### 7.7 HTTP 状态码
- `200`：成功
- `400`：参数非法
- `404`：测评不存在
- `500`：服务异常

---

## 8、异步任务与缓存规则

### 8.1 自动触发流程
`POST /assessment/{id}/submit` 成功后，后端执行以下流程：
1. 校验答卷
2. 计算 `mbtiType`
3. 创建 `assessment_record`
4. 写入 `report_status = pending`
5. 异步入队报告生成任务

### 8.2 生成成功
- LLM 返回结果通过结构校验后，写入 `report_json`
- 将 `report_status` 更新为 `ready`
- 更新 `updated_at`

### 8.3 生成失败
- 单次任务最多重试 `2` 次
- 最终失败时写入 `report_status = failed`
- 不写入半成品 `report_json`

### 8.4 缓存规则
- `report_json` 即结果缓存的主存储载体
- `ready` 状态下再次查询直接读取已存 JSON
- 同一 `recordId` 不触发第二版本生成

---

## 9、错误码表

| 错误码 | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `INVALID_ASSESSMENT_ID` | 400 | 路径中的测评 ID 非法 |
| `ASSESSMENT_NOT_FOUND` | 404 | 测评不存在或已下线 |
| `INVALID_ANSWER_COUNT` | 400 | 答案数量不是 20 |
| `INVALID_QUESTION_ID` | 400 | 提交中包含非正式题库题号 |
| `INVALID_SELECTED_OPTION` | 400 | 选项值不是 `A/B` |
| `DUPLICATE_QUESTION_ID` | 400 | 同一题号重复提交 |
| `RECORD_NOT_FOUND` | 404 | `recordId` 不存在 |
| `RECORD_ACCESS_DENIED` | 403 | 记录不属于当前登录用户 |
| `REPORT_GENERATION_FAILED` | 200/failed | 报告异步生成失败 |
| `REPORT_STILL_PENDING` | 200/pending | 报告仍在生成中 |
| `INTERNAL_ERROR` | 500 | 未分类服务异常 |

说明：
- `REPORT_GENERATION_FAILED` 与 `REPORT_STILL_PENDING` 只在 `GET /report/{recordId}` 的 `status` 语义中使用
- 前端展示层优先依据 `status`，必要时再结合 `errorCode`

---

## 10、报告结构校验规则
报告生成结果入库前，服务端必须完成以下校验：
- `mbtiType` 必须为标准 `16` 型之一
- 顶层必须包含 `recordId`、`themeTitle`、`reportTitle`、`mbtiType`、`modules`
- `modules.length === 4`
- 模块顺序固定：
  - `asset_overview`
  - `talent_strengths`
  - `substitution_risks`
  - `career_path`
- 模块 `key` 与 `title` 必须完全匹配
- 每模块 `items.length === 3`
- 任一条目不能为空字符串
- 模块字数必须符合 PRD 约束
- 命中禁用表达或出现半成品格式时直接判失败

---

## 11、推荐存储字段

### 11.1 assessment_record

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `record_id` | string | 记录 ID，主键或唯一键 |
| `assessment_id` | string | 测评 ID |
| `user_id` | string | 当前登录用户 ID |
| `answers_json` | json | 原始答卷 |
| `mbti_type` | string | 判定结果 |
| `report_status` | string | `pending/ready/failed` |
| `report_json` | json | 结构化报告正文，`ready` 时写入 |
| `llm_retry_count` | integer | LLM 重试次数 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

约束：
- `report_json` 明确为结构化 `JSON` 存储，不允许存为富文本字符串
- `failed` 状态下 `report_json` 应为空

---

## 12、联调与测试检查点
- 提交完整 `20` 题答卷，返回 `recordId`、`mbtiType`、`reportStatus`
- 全量 `A` 返回 `ESTJ`
- 全量 `B` 返回 `INFP`
- 提交缺题、重复题、非法题号、非法选项值时，返回对应错误码
- `submit` 后无需额外生成接口即可轮询 `GET /report/{recordId}`
- `GET /report/{recordId}` 在 `pending/ready/failed` 三种状态下结构稳定
- `ready` 状态下返回完整 `MbtiReport`
- `failed` 状态下不返回半成品内容
- 历史列表按时间倒序，且不泄露其他用户记录
- 已成功报告再次查询命中缓存，不触发重复生成
