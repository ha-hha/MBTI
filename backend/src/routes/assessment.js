const express = require("express");
const assessmentController = require("../controllers/assessmentController");

const router = express.Router();

router.get("/assessment/:id", assessmentController.getAssessment);
router.post("/assessment/:id/submit", assessmentController.submitAssessment);
router.get("/assessment/:id/records", assessmentController.getHistoryRecords);

module.exports = router;
