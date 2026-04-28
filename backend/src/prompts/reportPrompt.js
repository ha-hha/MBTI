const fs = require("fs");
const env = require("../config/env");
const { EXPECTED_MODULES } = require("../utils/reportValidator");

function getSystemPrompt() {
  if (fs.existsSync(env.llmSystemPromptPath)) {
    return fs.readFileSync(env.llmSystemPromptPath, "utf8").trim();
  }

  return [
    "你是一名专业的 MBTI 职业发展分析师。",
    "你的任务是生成一份结构化 JSON 报告。",
    "报告目标是帮助用户看清自己性格中的人类溢价，并理解如何借助 AI 赋能与专业认证完成职业升级。",
    "输出必须专业、可信、具体，避免空话、鸡汤和泛泛表述。",
    "严禁输出 Markdown、解释说明或代码块，只输出 JSON 对象。",
  ].join("\n");
}

function buildDimensionBreakdown(questions, answers) {
  const sortedQuestions = [...questions].sort((left, right) => {
    const leftOrder = left.sortOrder || Number.parseInt(left.id.replace("Q", ""), 10);
    const rightOrder = right.sortOrder || Number.parseInt(right.id.replace("Q", ""), 10);
    return leftOrder - rightOrder;
  });
  const answerMap = answers.reduce((accumulator, answer) => {
    accumulator[answer.questionId] = answer.selectedOption;
    return accumulator;
  }, {});

  const groups = [
    { key: "EI", label: "维度一", targetA: "E", targetB: "I", questions: sortedQuestions.slice(0, 5) },
    { key: "SN", label: "维度二", targetA: "S", targetB: "N", questions: sortedQuestions.slice(5, 10) },
    { key: "TF", label: "维度三", targetA: "T", targetB: "F", questions: sortedQuestions.slice(10, 15) },
    { key: "JP", label: "维度四", targetA: "J", targetB: "P", questions: sortedQuestions.slice(15, 20) },
  ];

  return groups.map((group) => {
    const selections = group.questions.map((question) => answerMap[question.id]);
    const aCount = selections.filter((item) => item === "A").length;
    const bCount = selections.filter((item) => item === "B").length;

    return {
      d: group.key,
      qs: group.questions.map((question) => question.id),
      s: selections.join(""),
      a: aCount,
      b: bCount,
      r: aCount >= 3 ? group.targetA : group.targetB,
    };
  });
}

function buildOrderedAnswers(questions, answers) {
  const answerMap = answers.reduce((accumulator, answer) => {
    accumulator[answer.questionId] = answer.selectedOption;
    return accumulator;
  }, {});

  return [...questions]
    .sort((left, right) => {
      const leftOrder = left.sortOrder || Number.parseInt(left.id.replace("Q", ""), 10);
      const rightOrder = right.sortOrder || Number.parseInt(right.id.replace("Q", ""), 10);
      return leftOrder - rightOrder;
    })
    .map((question) => `${question.id}:${answerMap[question.id]}`);
}

function buildUserPrompt(recordId, mbtiType, themeTitle, reportTitle, questions, answers) {
  const moduleRequirements = EXPECTED_MODULES.map((moduleItem, index) => ({
    o: index + 1,
    k: moduleItem.key,
    t: moduleItem.title,
    n: 3,
  }));
  const dimensionBreakdown = buildDimensionBreakdown(questions, answers);

  return JSON.stringify(
    {
      task: "mbti_report",
      input: {
        recordId,
        themeTitle,
        reportTitle,
        finalMbtiType: mbtiType,
        answers: buildOrderedAnswers(questions, answers),
        dims: dimensionBreakdown,
      },
      rules: {
        output: "json_only",
        lang: "zh-CN",
        mbtiType,
        modules: moduleRequirements,
      },
    },
    null,
    0
  );
}

function buildReportMessages(recordId, mbtiType, themeTitle, reportTitle, questions, answers) {
  return [
    {
      role: "system",
      content: getSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(recordId, mbtiType, themeTitle, reportTitle, questions, answers),
    },
  ];
}

module.exports = {
  buildReportMessages,
};
