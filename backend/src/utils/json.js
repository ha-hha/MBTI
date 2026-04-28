function extractJsonString(value) {
  const trimmed = `${value || ""}`.trim();

  if (!trimmed) {
    throw new Error("empty llm response");
  }

  if (trimmed.startsWith("```")) {
    const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, "");
    return withoutFenceStart.replace(/\s*```$/, "").trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseJsonObject(value) {
  return JSON.parse(extractJsonString(value));
}

module.exports = {
  extractJsonString,
  parseJsonObject,
};
