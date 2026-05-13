function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderDocument({ title, bodyClass = "", body, context = null }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/admin/static/admin.css" />
</head>
<body class="${escapeHtml(bodyClass)}">
  ${body}
  ${context ? `<script>window.__ADMIN_CONTEXT__ = ${serializeForScript(context)};</script>` : ""}
</body>
</html>`;
}

function renderShellHeader(username, subtitle) {
  return `
    <header class="admin-topbar">
      <div class="topbar-copy">
        <div class="admin-kicker">MBTI OPERATIONS CONSOLE</div>
        <h1 class="admin-heading">MBTI 测评运营后台</h1>
        <p class="admin-subheading">${escapeHtml(subtitle)}</p>
      </div>
      <div class="admin-topbar-actions">
        <span class="admin-user-chip">管理员：${escapeHtml(username)}</span>
        <button type="button" class="ghost-button" id="logoutButton">退出登录</button>
      </div>
    </header>
  `;
}

function renderLoginPage() {
  return renderDocument({
    title: "MBTI 运营后台登录",
    bodyClass: "admin-auth-page",
    body: `
      <main class="auth-layout">
        <section class="auth-card">
          <div class="admin-kicker">MBTI OPERATIONS CONSOLE</div>
          <h1 class="auth-title">进入运营后台</h1>
          <p class="auth-subtitle">
            登录后可查看测评记录、报告详情、今日转化表现与近 14 日趋势。
          </p>
          <form id="loginForm" class="auth-form">
            <label class="field-label" for="username">账号</label>
            <input id="username" name="username" class="text-input" autocomplete="username" />

            <label class="field-label field-gap" for="password">密码</label>
            <input
              id="password"
              name="password"
              type="password"
              class="text-input"
              autocomplete="current-password"
            />

            <div id="loginError" class="form-error" hidden></div>
            <button type="submit" class="primary-button wide-button" id="loginButton">登录后台</button>
          </form>
        </section>
      </main>
      <script>
        (function () {
          const form = document.getElementById("loginForm");
          const errorBox = document.getElementById("loginError");
          const button = document.getElementById("loginButton");

          form.addEventListener("submit", async function (event) {
            event.preventDefault();
            errorBox.hidden = true;
            button.disabled = true;
            button.textContent = "登录中...";

            const payload = {
              username: document.getElementById("username").value.trim(),
              password: document.getElementById("password").value,
            };

            try {
              const response = await fetch("/admin/api/login", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.message || "登录失败");
              }

              window.location.href = "/admin/reports";
            } catch (error) {
              errorBox.hidden = false;
              errorBox.textContent = error.message || "登录失败，请稍后重试";
            } finally {
              button.disabled = false;
              button.textContent = "登录后台";
            }
          });
        })();
      </script>
    `,
  });
}

function renderReportsPage({ username, initialSort = "report_generated_desc" }) {
  return renderDocument({
    title: "MBTI 测评记录列表",
    bodyClass: "admin-shell-page",
    context: {
      initialSort,
    },
    body: `
      <main class="admin-shell">
        ${renderShellHeader(username, "查看今天有多少用户完成测评，并追踪近 14 日报告走势。")}

        <section class="overview-grid" id="overviewGrid">
          <article class="metric-card metric-card-loading">正在加载概览数据...</article>
        </section>

        <section class="panel-card trend-panel">
          <div class="panel-head trend-head">
            <div>
              <h2 class="panel-title">近 14 日报告趋势</h2>
              <p class="panel-subtitle">左侧看历史走势，右侧快速看今天的报告和用户表现。</p>
            </div>
            <div class="panel-tag">北京时间自动统计</div>
          </div>
          <div class="trend-layout">
            <div class="trend-main">
              <div id="trendLegend" class="chart-legend"></div>
              <div id="trendChart" class="trend-chart trend-chart-loading">正在生成趋势图...</div>
            </div>
            <aside class="trend-side" id="trendSide">
              <div class="trend-side-loading">正在汇总今日数据...</div>
            </aside>
          </div>
        </section>

        <section class="panel-card list-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">测评记录列表</h2>
              <p class="panel-subtitle">每次成功提交都会生成一条记录，可继续查看完整报告详情。</p>
            </div>
            <div class="inline-controls">
              <label class="field-inline-label" for="sortSelect">排序方式</label>
              <select id="sortSelect" class="select-input">
                <option value="report_generated_desc">按报告生成时间倒序</option>
                <option value="registered_at_desc">按注册时间倒序</option>
              </select>
            </div>
          </div>
          <div id="listMeta" class="panel-meta">正在加载记录...</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>报告状态</th>
                  <th>微信 ID</th>
                  <th>已绑定手机号</th>
                  <th>注册日期</th>
                  <th>是否首测</th>
                  <th>最近登录</th>
                  <th>手机号</th>
                  <th>测评主题</th>
                  <th>报告生成时间</th>
                  <th>报告摘要</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="reportTableBody">
                <tr><td colspan="11" class="table-empty">正在加载...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="pagination-bar">
            <button type="button" class="ghost-button" id="prevPageButton">上一页</button>
            <span id="pageIndicator" class="page-indicator">第 1 页</span>
            <button type="button" class="ghost-button" id="nextPageButton">下一页</button>
          </div>
        </section>
      </main>
      <script>
        (function () {
          const context = window.__ADMIN_CONTEXT__ || {};
          const overviewGrid = document.getElementById("overviewGrid");
          const trendLegend = document.getElementById("trendLegend");
          const trendChart = document.getElementById("trendChart");
          const trendSide = document.getElementById("trendSide");
          const tableBody = document.getElementById("reportTableBody");
          const listMeta = document.getElementById("listMeta");
          const sortSelect = document.getElementById("sortSelect");
          const prevPageButton = document.getElementById("prevPageButton");
          const nextPageButton = document.getElementById("nextPageButton");
          const pageIndicator = document.getElementById("pageIndicator");
          const logoutButton = document.getElementById("logoutButton");
          const searchParams = new URLSearchParams(window.location.search);

          const state = {
            page: Number.parseInt(searchParams.get("page") || "1", 10) || 1,
            pageSize: 20,
            sort: searchParams.get("sort") || context.initialSort || "report_generated_desc",
            total: 0,
            hasMore: false,
            trendDays: 14,
          };

          function escapeHtml(value) {
            return String(value || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
          }

          function formatDate(value) {
            if (!value) {
              return "--";
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
              return escapeHtml(value);
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");

            return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
          }

          function formatNumber(value) {
            return Number(value || 0).toLocaleString("zh-CN");
          }

          function statusBadgeClass(status) {
            return status === "ready" ? "status-badge status-ready" : "status-badge status-pending";
          }

          function firstAssessmentBadgeClass(isFirstAssessment) {
            return isFirstAssessment
              ? "status-badge status-ready"
              : "status-badge status-review";
          }

          function syncUrl() {
            const params = new URLSearchParams();
            params.set("page", String(state.page));
            params.set("sort", state.sort);
            window.history.replaceState({}, "", "/admin/reports?" + params.toString());
          }

          function renderOverview(summary) {
            const cards = [
              {
                label: "今日完成用户",
                value: formatNumber(summary.todayUsers),
                note: "今天成功触发报告的去重用户数",
                tone: 1,
              },
              {
                label: "今日生成报告",
                value: formatNumber(summary.todayReports),
                note: "今天新增写入的报告记录",
                tone: 2,
              },
              {
                label: "累计测评用户",
                value: formatNumber(summary.totalUsers),
                note: "历史上至少提交过一次测评的用户",
                tone: 3,
              },
              {
                label: "累计绑定手机号",
                value: formatNumber(summary.registeredUsers),
                note: "已完成手机号绑定的用户数",
                tone: 4,
              },
            ];

            overviewGrid.innerHTML = cards.map(function (card) {
              return [
                '<article class="metric-card metric-tone-' + card.tone + '">',
                '<div class="metric-label">' + escapeHtml(card.label) + '</div>',
                '<div class="metric-value">' + escapeHtml(card.value) + '</div>',
                '<div class="metric-note">' + escapeHtml(card.note) + '</div>',
                '</article>',
              ].join("");
            }).join("");
          }

          function renderTrendSide(summary) {
            const completionRate = Math.max(0, Math.min(100, Number(summary.completionRate || 0)));
            const groups = [
              { label: "今日报告", value: summary.todayReports, helper: "新增报告记录" },
              { label: "今日用户", value: summary.todayUsers, helper: "完成测评人数" },
              { label: "今日已完成", value: summary.todayReadyReports, helper: "已拿到完整报告" },
            ];

            trendSide.innerHTML = [
              '<div class="trend-side-header">',
              '<div class="trend-side-date">' + escapeHtml(summary.todayLabel || "--") + '</div>',
              '<div class="trend-side-title">今日概览</div>',
              '</div>',
              '<div class="trend-side-metrics">',
              groups.map(function (item) {
                return [
                  '<div class="side-metric-card">',
                  '<div class="side-metric-label">' + escapeHtml(item.label) + '</div>',
                  '<div class="side-metric-value">' + escapeHtml(formatNumber(item.value)) + '</div>',
                  '<div class="side-metric-helper">' + escapeHtml(item.helper) + '</div>',
                  '</div>',
                ].join("");
              }).join(""),
              '</div>',
              '<div class="trend-side-summary">',
              '<div class="summary-row"><span>累计报告</span><strong>' + escapeHtml(formatNumber(summary.totalReports)) + '</strong></div>',
              '<div class="summary-row"><span>已完成报告</span><strong>' + escapeHtml(formatNumber(summary.readyReports)) + '</strong></div>',
              '<div class="summary-row"><span>完成率</span><strong>' + escapeHtml(String(completionRate)) + '%</strong></div>',
              '</div>',
            ].join("");
          }

          function renderTrendChart(trend) {
            if (!Array.isArray(trend) || !trend.length) {
              trendLegend.innerHTML = "";
              trendChart.innerHTML = '<div class="chart-empty">暂无历史数据</div>';
              return;
            }

            const svgWidth = 980;
            const svgHeight = 340;
            const padding = { top: 24, right: 24, bottom: 56, left: 52 };
            const plotWidth = svgWidth - padding.left - padding.right;
            const plotHeight = svgHeight - padding.top - padding.bottom;
            const maxValue = Math.max.apply(null, trend.map(function (item) {
              return Math.max(item.reportCount || 0, item.uniqueUserCount || 0, 1);
            }));
            const stepX = trend.length > 1 ? plotWidth / (trend.length - 1) : plotWidth;
            const barWidth = Math.max(20, Math.min(34, plotWidth / Math.max(trend.length * 1.9, 1)));
            const gridLines = [0, 0.25, 0.5, 0.75, 1];

            const bars = [];
            const linePoints = [];
            const dots = [];
            const labels = [];
            const hoverBars = [];

            trend.forEach(function (item, index) {
              const x = padding.left + stepX * index;
              const reportHeight = (item.reportCount / maxValue) * plotHeight;
              const reportY = padding.top + plotHeight - reportHeight;
              const lineY = padding.top + plotHeight - ((item.uniqueUserCount / maxValue) * plotHeight);

              bars.push(
                '<rect class="chart-bar" x="' + (x - barWidth / 2) + '" y="' + reportY + '" width="' + barWidth + '" height="' + Math.max(reportHeight, 3) + '" rx="14" ry="14"></rect>'
              );
              linePoints.push(x + "," + lineY);
              dots.push('<circle class="chart-dot" cx="' + x + '" cy="' + lineY + '" r="4.5"></circle>');
              labels.push(
                '<text class="chart-x-label" x="' + x + '" y="' + (svgHeight - 18) + '" text-anchor="middle">' + escapeHtml(item.label) + '</text>'
              );
              hoverBars.push(
                '<g class="chart-hover-group">' +
                  '<rect class="chart-hover-hit" x="' + (x - Math.max(stepX / 2, 18)) + '" y="' + padding.top + '" width="' + Math.max(stepX, 36) + '" height="' + plotHeight + '"></rect>' +
                  '<title>' + escapeHtml(item.date + " 报告 " + item.reportCount + "，用户 " + item.uniqueUserCount) + '</title>' +
                '</g>'
              );
            });

            const grids = gridLines.map(function (ratio) {
              const y = padding.top + plotHeight - (plotHeight * ratio);
              const value = Math.round(maxValue * ratio);

              return [
                '<line class="chart-grid-line" x1="' + padding.left + '" y1="' + y + '" x2="' + (svgWidth - padding.right) + '" y2="' + y + '"></line>',
                '<text class="chart-y-label" x="' + (padding.left - 12) + '" y="' + (y + 4) + '" text-anchor="end">' + escapeHtml(String(value)) + '</text>',
              ].join("");
            }).join("");

            trendLegend.innerHTML = [
              '<div class="legend-item"><span class="legend-swatch legend-bar"></span>报告记录数</div>',
              '<div class="legend-item"><span class="legend-swatch legend-line"></span>完成测评用户数</div>',
            ].join("");

            trendChart.innerHTML = [
              '<svg viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" class="chart-svg" role="img" aria-label="近14日报告趋势图">',
              grids,
              bars.join(""),
              '<polyline class="chart-line" points="' + linePoints.join(" ") + '"></polyline>',
              dots.join(""),
              hoverBars.join(""),
              labels.join(""),
              '</svg>',
            ].join("");
          }

          function renderRows(items) {
            if (!items.length) {
              tableBody.innerHTML = '<tr><td colspan="11" class="table-empty">暂无测评记录</td></tr>';
              return;
            }

            tableBody.innerHTML = items.map(function (item) {
              return [
                '<tr>',
                '<td><span class="' + statusBadgeClass(item.reportStatus) + '">' + escapeHtml(item.reportStatusLabel) + '</span></td>',
                '<td class="mono-text">' + escapeHtml(item.wechatIdMasked || "--") + '</td>',
                '<td>' + (item.isRegistered ? "已绑定" : "未绑定") + '</td>',
                '<td>' + formatDate(item.registeredAt) + '</td>',
                '<td><span class="' + firstAssessmentBadgeClass(item.isFirstAssessment) + '">' + escapeHtml(item.firstAssessmentLabel) + '</span></td>',
                '<td>' + formatDate(item.lastLoginAt) + '</td>',
                '<td class="mono-text">' + escapeHtml(item.phoneNumber || "--") + '</td>',
                '<td>' + escapeHtml(item.assessmentName || "--") + '</td>',
                '<td>' + formatDate(item.reportGeneratedAt) + '</td>',
                '<td class="summary-cell">' + escapeHtml(item.reportSummary || "--") + '</td>',
                '<td><a class="link-button" href="' + escapeHtml("/admin/reports/detail?recordId=" + encodeURIComponent(item.recordId || "")) + '">查看报告详情</a></td>',
                '</tr>',
              ].join("");
            }).join("");
          }

          async function loadOverview() {
            const response = await fetch("/admin/api/reports/overview?days=" + state.trendDays);

            if (response.status === 401) {
              window.location.href = "/admin/login";
              return null;
            }

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message || "概览数据加载失败");
            }

            renderOverview(result.summary || {});
            renderTrendSide(result.summary || {});
            renderTrendChart(result.trend || []);
            return result;
          }

          async function loadReports() {
            listMeta.textContent = "正在加载记录...";
            prevPageButton.disabled = true;
            nextPageButton.disabled = true;

            const response = await fetch(
              "/admin/api/reports?page=" + state.page + "&pageSize=" + state.pageSize + "&sort=" + state.sort
            );

            if (response.status === 401) {
              window.location.href = "/admin/login";
              return;
            }

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message || "记录加载失败");
            }

            state.total = result.total || 0;
            state.hasMore = !!result.hasMore;
            renderRows(result.items || []);
            listMeta.textContent = "共 " + formatNumber(state.total) + " 条记录，当前按" + (state.sort === "registered_at_desc" ? "注册时间" : "报告生成时间") + "排序";
            pageIndicator.textContent = "第 " + state.page + " 页";
            prevPageButton.disabled = state.page <= 1;
            nextPageButton.disabled = !state.hasMore;
            syncUrl();
          }

          async function bootstrap() {
            try {
              await Promise.all([loadOverview(), loadReports()]);
            } catch (error) {
              overviewGrid.innerHTML = '<article class="metric-card metric-card-error">概览数据加载失败，请刷新重试。</article>';
              trendLegend.innerHTML = "";
              trendChart.innerHTML = '<div class="chart-empty">' + escapeHtml(error.message || "趋势图加载失败") + '</div>';
              trendSide.innerHTML = '<div class="trend-side-loading">今日概览加载失败</div>';
              tableBody.innerHTML = '<tr><td colspan="11" class="table-empty">记录加载失败，请刷新重试</td></tr>';
              listMeta.textContent = error.message || "加载失败";
            }
          }

          sortSelect.value = state.sort;
          sortSelect.addEventListener("change", function (event) {
            state.sort = event.target.value;
            state.page = 1;
            loadReports().catch(function (error) {
              tableBody.innerHTML = '<tr><td colspan="11" class="table-empty">记录加载失败，请刷新重试</td></tr>';
              listMeta.textContent = error.message || "记录加载失败";
            });
          });

          prevPageButton.addEventListener("click", function () {
            if (state.page <= 1) {
              return;
            }

            state.page -= 1;
            loadReports().catch(function (error) {
              listMeta.textContent = error.message || "记录加载失败";
            });
          });

          nextPageButton.addEventListener("click", function () {
            if (!state.hasMore) {
              return;
            }

            state.page += 1;
            loadReports().catch(function (error) {
              listMeta.textContent = error.message || "记录加载失败";
            });
          });

          logoutButton.addEventListener("click", async function () {
            await fetch("/admin/api/logout", { method: "POST" });
            window.location.href = "/admin/login";
          });

          bootstrap();
        })();
      </script>
    `,
  });
}

function renderReportDetailPage({ username, recordId }) {
  return renderDocument({
    title: "MBTI 测评报告详情",
    bodyClass: "admin-shell-page",
    context: {
      recordId,
    },
    body: `
      <main class="admin-shell">
        ${renderShellHeader(username, "查看单条记录的用户信息、答卷摘要与报告全文。")}

        <section class="panel-card detail-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">报告详情</h2>
              <p class="panel-subtitle">如果报告尚未生成完成，这里只展示状态与答卷摘要。</p>
            </div>
            <a href="/admin/reports" class="ghost-link">返回列表</a>
          </div>
          <div id="detailRoot" class="detail-loading">正在加载详情...</div>
        </section>
      </main>
      <script>
        (function () {
          const context = window.__ADMIN_CONTEXT__ || {};
          const searchParams = new URLSearchParams(window.location.search);
          const pathParts = window.location.pathname.split("/").filter(Boolean);
          const recordId = (
            context.recordId
            || searchParams.get("recordId")
            || pathParts[pathParts.length - 1]
            || ""
          ).trim();
          const detailRoot = document.getElementById("detailRoot");
          const logoutButton = document.getElementById("logoutButton");

          function escapeHtml(value) {
            return String(value || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
          }

          function formatDate(value) {
            if (!value) {
              return "--";
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
              return escapeHtml(value);
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");

            return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
          }

          function renderHero(detail) {
            return [
              '<section class="detail-hero">',
              '<div class="detail-hero-main">',
              '<span class="' + (detail.reportStatus === "ready" ? "status-badge status-ready" : "status-badge status-pending") + '">' + escapeHtml(detail.reportStatusLabel) + '</span>',
              '<h3 class="detail-hero-title">' + escapeHtml(detail.assessmentName || "MBTI 测评报告") + '</h3>',
              '<p class="detail-hero-copy">' + escapeHtml(detail.reportStateDescription || "--") + '</p>',
              '</div>',
              '<div class="detail-hero-side">',
              '<div class="hero-stat"><span class="hero-stat-label">MBTI</span><span class="hero-stat-value">' + escapeHtml(detail.mbtiType || "--") + '</span></div>',
              '<div class="hero-stat"><span class="hero-stat-label">记录 ID</span><span class="hero-stat-value hero-stat-code">' + escapeHtml(detail.recordId || "--") + '</span></div>',
              '</div>',
              '</section>',
            ].join("");
          }

          function renderInfoGrid(detail) {
            const fields = [
              ["微信 ID", detail.user.wechatIdMasked || "--"],
              ["手机号", detail.user.phoneNumber || "--"],
              ["已绑定手机号", detail.user.isRegistered ? "已绑定" : "未绑定"],
              ["注册日期", formatDate(detail.user.registeredAt)],
              ["是否首测", detail.firstAssessmentLabel || "--"],
              ["最近登录", formatDate(detail.user.lastLoginAt)],
              ["提交时间", formatDate(detail.submittedAt)],
              ["报告生成时间", formatDate(detail.reportGeneratedAt)],
              ["测评主题", detail.assessmentName || "--"],
            ];

            return [
              '<section class="detail-section">',
              '<h3 class="section-title">基础信息</h3>',
              '<div class="info-grid">',
              fields.map(function (item) {
                return [
                  '<div class="info-card">',
                  '<div class="info-label">' + escapeHtml(item[0]) + '</div>',
                  '<div class="info-value">' + escapeHtml(item[1]) + '</div>',
                  '</div>',
                ].join("");
              }).join(""),
              '</div>',
              '</section>',
            ].join("");
          }

          function renderAnswers(detail) {
            return [
              '<section class="detail-section">',
              '<h3 class="section-title">答卷摘要</h3>',
              '<div class="answer-list">',
              (detail.answers || []).map(function (item) {
                return [
                  '<div class="answer-card">',
                  '<div class="answer-meta">Q' + escapeHtml(item.index || "--") + " · " + escapeHtml(item.dimension || "--") + '</div>',
                  '<div class="answer-stem">' + escapeHtml(item.stem || item.questionId) + '</div>',
                  '<div class="answer-choice">用户选择：' + escapeHtml(item.selectedOption) + " " + escapeHtml(item.selectedOptionText || "") + '</div>',
                  '</div>',
                ].join("");
              }).join(""),
              '</div>',
              '</section>',
            ].join("");
          }

          function renderReport(detail) {
            if (!detail.report) {
              return [
                '<section class="detail-section">',
                '<h3 class="section-title">报告详情</h3>',
                '<div class="empty-detail-card">',
                '<div class="empty-detail-title">' + escapeHtml(detail.reportStateDescription) + '</div>',
                '<p class="empty-detail-copy">当前记录尚未产出完整报告内容，后台仅展示已提交答卷与状态信息。</p>',
                '</div>',
                '</section>',
              ].join("");
            }

            return [
              '<section class="detail-section">',
              '<h3 class="section-title">报告详情</h3>',
              '<div class="report-hero">',
              '<div class="report-title">' + escapeHtml(detail.report.reportTitle || "--") + '</div>',
              '<div class="report-subtitle">' + escapeHtml(detail.report.themeTitle || "--") + '</div>',
              '</div>',
              '<div class="module-list">',
              (detail.report.modules || []).map(function (module) {
                return [
                  '<article class="module-card">',
                  '<h4 class="module-title">' + escapeHtml(module.title || "--") + '</h4>',
                  '<ul class="module-items">',
                  (module.items || []).map(function (item) {
                    return '<li>' + escapeHtml(item) + '</li>';
                  }).join(""),
                  '</ul>',
                  '</article>',
                ].join("");
              }).join(""),
              '</div>',
              '</section>',
            ].join("");
          }

          function renderDetail(detail) {
            detailRoot.innerHTML = [
              renderHero(detail),
              renderInfoGrid(detail),
              renderAnswers(detail),
              renderReport(detail),
            ].join("");
          }

          async function loadDetail() {
            if (!recordId || recordId === "detail" || recordId === "undefined") {
              detailRoot.innerHTML = '<div class="empty-detail-card"><div class="empty-detail-title">加载失败</div><p class="empty-detail-copy">缺少有效的报告记录 ID，请返回列表后重新进入。</p></div>';
              return;
            }

            try {
              const response = await fetch("/admin/api/reports/detail?recordId=" + encodeURIComponent(recordId));

              if (response.status === 401) {
                window.location.href = "/admin/login";
                return;
              }

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.message || "加载失败");
              }

              renderDetail(result);
            } catch (error) {
              detailRoot.innerHTML = '<div class="empty-detail-card"><div class="empty-detail-title">加载失败</div><p class="empty-detail-copy">' + escapeHtml(error.message || "请刷新后重试") + '</p></div>';
            }
          }

          logoutButton.addEventListener("click", async function () {
            await fetch("/admin/api/logout", { method: "POST" });
            window.location.href = "/admin/login";
          });

          loadDetail();
        })();
      </script>
    `,
  });
}

module.exports = {
  renderLoginPage,
  renderReportDetailPage,
  renderReportsPage,
};
