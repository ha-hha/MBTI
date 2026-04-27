const { initDb } = require("../repositories/db");
const { seedAssessment } = require("../repositories/assessmentRepo");

initDb();
seedAssessment();

console.log("Database initialized and assessment seeded.");
