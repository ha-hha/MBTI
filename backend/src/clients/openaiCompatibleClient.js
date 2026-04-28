const env = require("../config/env");
const { createError } = require("../utils/errors");

function ensureLlmConfig() {
  if (!env.llmBaseUrl || !env.llmApiKey || !env.llmModel) {
    throw createError(
      "LLM_NOT_CONFIGURED",
      "LLM_BASE_URL, LLM_API_KEY and LLM_MODEL are required in llm mode",
      500
    );
  }
}

async function createChatCompletion(messages) {
  ensureLlmConfig();

  let response;

  try {
    response = await fetch(`${env.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.llmApiKey}`,
      },
      body: JSON.stringify({
        model: env.llmModel,
        temperature: Number.isFinite(env.llmTemperature) ? env.llmTemperature : 0.8,
        max_tokens: 700,
        response_format: {
          type: "json_object",
        },
        messages,
      }),
      signal: AbortSignal.timeout(env.llmTimeoutMs),
    });
  } catch (error) {
    const details = [
      error?.message,
      error?.cause?.code,
      error?.cause?.message,
    ].filter(Boolean);

    throw createError(
      "LLM_NETWORK_FAILED",
      `llm network request failed: ${details.join(" | ")}`,
      500
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw createError(
      "LLM_REQUEST_FAILED",
      `llm request failed with status ${response.status}: ${errorText.slice(0, 500)}`,
      500
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw createError("LLM_EMPTY_RESPONSE", "llm response content is empty", 500);
  }

  return {
    rawText: content,
    provider: env.llmProvider,
    model: env.llmModel,
  };
}

module.exports = {
  createChatCompletion,
};
