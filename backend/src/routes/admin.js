const path = require("path");
const express = require("express");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(
  "/admin/static",
  express.static(path.resolve(__dirname, "..", "admin", "static"))
);

router.get("/admin", (req, res) => {
  res.redirect("/admin/reports");
});
router.get("/admin/login", adminController.getLoginPage);
router.get("/admin/reports", adminController.getReportsPage);
router.get("/admin/reports/detail", adminController.getReportDetailPage);
router.get("/admin/reports/:recordId", adminController.getReportDetailPage);

router.post("/admin/api/login", adminController.login);
router.post("/admin/api/logout", adminController.logout);
router.get("/admin/api/me", adminController.getCurrentAdmin);
router.get("/admin/api/reports/overview", adminController.getReportOverview);
router.get("/admin/api/reports", adminController.listReports);
router.get("/admin/api/reports/detail", adminController.getReportDetail);
router.get("/admin/api/reports/:recordId", adminController.getReportDetail);

module.exports = router;
