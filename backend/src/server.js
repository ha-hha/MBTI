const env = require("./config/env");
const { initDb } = require("./repositories/db");
const { seedAssessment } = require("./repositories/assessmentRepo");
const { createApp } = require("./app");

initDb();
seedAssessment();

const app = createApp();

app.listen(env.port, () => {
  console.log(`MBTI backend listening on http://127.0.0.1:${env.port}`);
});
