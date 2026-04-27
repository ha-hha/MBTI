const path = require("path");
const { validateReport } = require("./reportValidator");

const { createReport } = require(path.resolve(__dirname, "..", "..", "..", "utils", "report-generator"));

function buildReport(recordId, mbtiType, themeTitle, reportTitle) {
  return validateReport(createReport(recordId, mbtiType, themeTitle, reportTitle));
}

module.exports = {
  buildReport,
};
