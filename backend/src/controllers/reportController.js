const authService = require("../services/authService");
const reportService = require("../services/reportService");

function getUserId(req) {
  return authService.resolveUserIdFromHeaders(req.headers);
}

function getReport(req, res, next) {
  try {
    const result = reportService.getReport(req.params.recordId, getUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReport,
};
