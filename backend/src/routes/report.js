const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/report/:recordId", reportController.getReport);

module.exports = router;
