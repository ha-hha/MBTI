const env = require("../config/env");
const assessmentService = require("../services/assessmentService");
const reportService = require("../services/reportService");
const { createError } = require("../utils/errors");

function getUserId(req) {
  return req.headers["x-user-id"] || env.defaultUserId;
}

function parsePagination(value, fallbackValue, maxValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return Math.min(parsedValue, maxValue);
}

function getAssessment(req, res, next) {
  try {
    const assessment = assessmentService.getAssessmentConfig(req.params.id);
    res.json(assessment);
  } catch (error) {
    next(error);
  }
}

function submitAssessment(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw createError("INVALID_REQUEST_BODY", "request body must be a JSON object", 400);
    }

    const result = assessmentService.submitAssessment(
      req.params.id,
      req.body.assessmentId,
      req.body.answers,
      getUserId(req)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

function getHistoryRecords(req, res, next) {
  try {
    assessmentService.getAssessmentOrThrow(req.params.id);

    const page = parsePagination(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = parsePagination(req.query.pageSize, 20, 50);
    const result = reportService.listHistoryRecords(req.params.id, getUserId(req), page, pageSize);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAssessment,
  submitAssessment,
  getHistoryRecords,
};
