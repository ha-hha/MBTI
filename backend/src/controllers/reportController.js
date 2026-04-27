const env = require("../config/env");
const reportService = require("../services/reportService");

function getUserId(req) {
  return req.headers["x-user-id"] || env.defaultUserId;
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
