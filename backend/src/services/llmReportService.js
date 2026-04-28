const { createChatCompletion } = require("../clients/openaiCompatibleClient");
const { buildReportMessages } = require("../prompts/reportPrompt");
const env = require("../config/env");
const { parseJsonObject } = require("../utils/json");
const { validateReport } = require("../utils/reportValidator");

async function generateReportWithLlm(recordId, mbtiType, themeTitle, reportTitle, questions, answers) {
  let lastError;
  const maxAttempts = Math.max(1, env.llmMaxRetries);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const completion = await createChatCompletion(
        buildReportMessages(recordId, mbtiType, themeTitle, reportTitle, questions, answers)
      );
      const parsedReport = parseJsonObject(completion.rawText);
      const report = validateReport(parsedReport);

      return {
        report,
        source: "llm",
        llmProvider: completion.provider,
        llmModel: completion.model,
        llmPromptVersion: env.llmPromptVersion,
        llmRawResponse: completion.rawText,
      };
    } catch (error) {
      lastError = error;

      if (shouldStopRetrying(error)) {
        break;
      }
    }
  }

  throw lastError;
}

function shouldStopRetrying(error) {
  return [
    "LLM_NETWORK_FAILED",
    "LLM_NOT_CONFIGURED",
    "LLM_REQUEST_FAILED",
  ].includes(error?.code);
}

module.exports = {
  generateReportWithLlm,
};
