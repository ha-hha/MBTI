const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..", "..");

loadEnvFile();

function parseInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function parseBoolean(value, fallbackValue) {
  if (value === undefined) {
    return fallbackValue;
  }

  return value === "true";
}

function loadEnvFile() {
  const envPath = path.resolve(backendRoot, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function resolveBackendPath(targetPath, fallbackPath) {
  if (!targetPath) {
    return path.resolve(backendRoot, fallbackPath);
  }

  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(backendRoot, targetPath);
}

module.exports = {
  port: parseInteger(process.env.PORT, 3000),
  dbPath: resolveBackendPath(process.env.DB_PATH, "data/mbti.sqlite"),
  reportDelayMs: parseInteger(process.env.REPORT_DELAY_MS, 1800),
  defaultUserId: process.env.DEFAULT_USER_ID || "demo-user",
  reportGenerationMode: process.env.REPORT_GENERATION_MODE || "template",
  llmProvider: process.env.LLM_PROVIDER || "openai-compatible",
  llmBaseUrl: (process.env.LLM_BASE_URL || "").replace(/\/+$/, ""),
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "",
  llmTimeoutMs: parseInteger(process.env.LLM_TIMEOUT_MS, 30000),
  llmMaxRetries: parseInteger(process.env.LLM_MAX_RETRIES, 2),
  llmTemperature: Number.parseFloat(process.env.LLM_TEMPERATURE || "0.8"),
  llmPromptVersion: process.env.LLM_PROMPT_VERSION || "v1",
  llmFallbackToTemplate: parseBoolean(process.env.LLM_FALLBACK_TO_TEMPLATE, true),
  llmSystemPromptPath: resolveBackendPath(
    process.env.LLM_SYSTEM_PROMPT_PATH,
    "prompts/report-system-prompt.md"
  ),
};
