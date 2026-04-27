const path = require("path");

function parseInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

module.exports = {
  port: parseInteger(process.env.PORT, 3000),
  dbPath: process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(process.cwd(), "data", "mbti.sqlite"),
  reportDelayMs: parseInteger(process.env.REPORT_DELAY_MS, 1800),
  defaultUserId: process.env.DEFAULT_USER_ID || "demo-user",
};
