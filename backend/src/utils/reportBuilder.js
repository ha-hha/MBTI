const path = require("path");
const { validateReport } = require("./reportValidator");

const { createReport } = require(path.resolve(__dirname, "..", "..", "..", "utils", "report-generator"));

function buildReport(recordId, mbtiType, themeTitle, reportTitle) {
  return validateReport(createReport(recordId, mbtiType, themeTitle, reportTitle));
}

function buildReportFromModules(recordId, mbtiType, themeTitle, reportTitle, modules) {
  return validateReport({
    recordId,
    themeTitle,
    reportTitle,
    mbtiType,
    modules,
  });
}

module.exports = {
  buildReport,
  buildReportFromModules,
};
