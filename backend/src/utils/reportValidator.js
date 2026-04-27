const { VALID_MBTI_TYPES } = require("./mbtiResolver");
const { createError } = require("./errors");

const EXPECTED_MODULES = [
  { key: "asset_overview", title: "性格资产总评" },
  { key: "talent_strengths", title: "你的天才所在" },
  { key: "substitution_risks", title: "替代风险" },
  { key: "career_path", title: "职业认证与阶层跃迁建议" },
];

function validateReport(report) {
  if (!report || typeof report !== "object") {
    throw createError("INTERNAL_ERROR", "report must be an object", 500);
  }

  if (!VALID_MBTI_TYPES.has(report.mbtiType)) {
    throw createError("INTERNAL_ERROR", "invalid mbtiType in report", 500);
  }

  if (!Array.isArray(report.modules) || report.modules.length !== EXPECTED_MODULES.length) {
    throw createError("INTERNAL_ERROR", "modules length must be exactly 4", 500);
  }

  EXPECTED_MODULES.forEach((expectedModule, index) => {
    const moduleItem = report.modules[index];

    if (moduleItem.key !== expectedModule.key || moduleItem.title !== expectedModule.title) {
      throw createError("INTERNAL_ERROR", "report module order or title mismatch", 500);
    }

    if (!Array.isArray(moduleItem.items) || moduleItem.items.length !== 3) {
      throw createError("INTERNAL_ERROR", "report module items length must be exactly 3", 500);
    }

    moduleItem.items.forEach((item) => {
      if (typeof item !== "string" || !item.trim()) {
        throw createError("INTERNAL_ERROR", "report module item cannot be empty", 500);
      }
    });
  });

  return report;
}

module.exports = {
  EXPECTED_MODULES,
  validateReport,
};
