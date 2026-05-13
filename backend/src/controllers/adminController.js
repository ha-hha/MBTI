const adminAuthService = require("../services/adminAuthService");
const adminReportService = require("../services/adminReportService");
const {
  renderLoginPage,
  renderReportDetailPage,
  renderReportsPage,
} = require("../admin/views");
const { createError } = require("../utils/errors");

function parsePagination(value, fallbackValue, maxValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return Math.min(parsedValue, maxValue);
}

function resolveRecordId(req) {
  const rawRecordId = req.params.recordId || req.query.recordId || "";

  if (typeof rawRecordId !== "string") {
    return "";
  }

  try {
    return decodeURIComponent(rawRecordId).trim();
  } catch (error) {
    return rawRecordId.trim();
  }
}

function getLoginPage(req, res, next) {
  try {
    const session = adminAuthService.resolveAdminSessionFromHeaders(req.headers);

    if (session) {
      res.redirect("/admin/reports");
      return;
    }

    res.type("html").send(renderLoginPage());
  } catch (error) {
    next(error);
  }
}

function getReportsPage(req, res, next) {
  try {
    const session = adminAuthService.requireAdminSession(req.headers);
    const sort = req.query.sort || "report_generated_desc";

    res.type("html").send(
      renderReportsPage({
        username: session.username,
        initialSort: sort,
      })
    );
  } catch (error) {
    if (error.statusCode === 401) {
      res.redirect("/admin/login");
      return;
    }

    next(error);
  }
}

function getReportDetailPage(req, res, next) {
  try {
    const session = adminAuthService.requireAdminSession(req.headers);
    const recordId = resolveRecordId(req);
    res.type("html").send(
      renderReportDetailPage({
        username: session.username,
        recordId,
      })
    );
  } catch (error) {
    if (error.statusCode === 401) {
      res.redirect("/admin/login");
      return;
    }

    next(error);
  }
}

function login(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw createError("INVALID_REQUEST_BODY", "request body must be a JSON object", 400);
    }

    const result = adminAuthService.loginWithPassword(req.body.username, req.body.password);
    res.setHeader("Set-Cookie", result.cookie);
    res.json({
      success: true,
      admin: result.admin,
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  try {
    const result = adminAuthService.logout(req.headers);
    res.setHeader("Set-Cookie", result.clearCookie);
    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

function getCurrentAdmin(req, res, next) {
  try {
    const admin = adminAuthService.getCurrentAdmin(req.headers);
    res.json(admin);
  } catch (error) {
    next(error);
  }
}

function listReports(req, res, next) {
  try {
    adminAuthService.requireAdminSession(req.headers);
    const result = adminReportService.listReports({
      page: parsePagination(req.query.page, 1, Number.MAX_SAFE_INTEGER),
      pageSize: parsePagination(req.query.pageSize, 20, 50),
      sort: req.query.sort,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

function getReportOverview(req, res, next) {
  try {
    adminAuthService.requireAdminSession(req.headers);
    const result = adminReportService.getReportOverview(
      parsePagination(req.query.days, 14, 60)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function getReportDetail(req, res, next) {
  try {
    adminAuthService.requireAdminSession(req.headers);
    const result = adminReportService.getReportDetail(resolveRecordId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentAdmin,
  getLoginPage,
  getReportDetail,
  getReportDetailPage,
  getReportOverview,
  getReportsPage,
  listReports,
  login,
  logout,
};
