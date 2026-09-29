import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectUrl = new URL('../', import.meta.url);

test('page exposes the complete query workflow with accessible landmarks', async () => {
  const html = await readFile(new URL('index.html', projectUrl), 'utf8');

  assert.match(html, /<title>支付链路查数操作台<\/title>/);
  assert.match(html, /id="metric-options"/);
  assert.match(html, /id="row-dimensions"/);
  assert.doesNotMatch(html, /id="column-dimension"/);
  assert.match(html, /id="filter-options"/);
  assert.match(html, /id="run-query"/);
  assert.match(html, /id="result-table"/);
  assert.match(html, /id="query-dialog"/);
  assert.match(html, /type="module" src="\.\/js\/app\.js"/);
});

test('stylesheet includes responsive layout, sticky cells, and visible keyboard focus', async () => {
  const css = await readFile(new URL('css/styles.css', projectUrl), 'utf8');

  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test('browser controller imports the query engine and handles all core actions', async () => {
  const app = await readFile(new URL('js/app.js', projectUrl), 'utf8');

  assert.match(app, /from '\.\/query-engine\.js'/);
  assert.match(app, /run-query/);
  assert.match(app, /reset-query/);
  assert.match(app, /query-dialog/);
  assert.match(app, /renderTable/);
});

test('DataWind-inspired workbench exposes a field library and row-only query shelves', async () => {
  const html = await readFile(new URL('index.html', projectUrl), 'utf8');

  assert.match(html, /class="field-library"/);
  assert.match(html, /id="field-search"/);
  assert.match(html, /class="query-shelves"/);
  assert.doesNotMatch(html, />列维度</);
  assert.match(html, />行维度</);
  assert.match(html, />指标</);
  assert.match(html, />筛选</);
  assert.match(html, /id="row-shelf-chips"/);
  assert.match(html, /id="metric-shelf-chips"/);
  assert.ok(html.indexOf('>时间轴<') < html.indexOf('>行维度<'));
});

test('result area opens directly into the table without summary metric cards', async () => {
  const html = await readFile(new URL('index.html', projectUrl), 'utf8');
  assert.doesNotMatch(html, /id="summary-strip"/);
  assert.doesNotMatch(html, />命中订单</);
  assert.doesNotMatch(html, />结果行数</);
  assert.doesNotMatch(html, /id="result-title"/);
  assert.doesNotMatch(html, /class="view-switch"/);
  assert.doesNotMatch(html, /id="active-query"/);
});

test('secondary row dimensions stay in table flow so metric columns remain aligned', async () => {
  const [app, css] = await Promise.all([
    readFile(new URL('js/app.js', projectUrl), 'utf8'),
    readFile(new URL('css/styles.css', projectUrl), 'utf8'),
  ]);

  assert.doesNotMatch(app, /second-sticky/);
  assert.doesNotMatch(css, /\.second-sticky/);
});

test('workbench exposes an editable global date range', async () => {
  const html = await readFile(new URL('index.html', projectUrl), 'utf8');

  assert.match(html, />时间轴</);
  assert.match(html, /id="date-start"/);
  assert.match(html, /id="date-end"/);
  assert.match(html, /data-date-preset="7"/);
  assert.match(html, /data-date-preset="30"/);
});

test('auto query can be enabled and refreshes after configuration changes', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('index.html', projectUrl), 'utf8'),
    readFile(new URL('js/app.js', projectUrl), 'utf8'),
    readFile(new URL('css/styles.css', projectUrl), 'utf8'),
  ]);

  assert.match(html, /id="auto-query" type="checkbox"/);
  assert.doesNotMatch(html, /id="auto-query"[^>]*disabled/);
  assert.match(app, /autoQuery:\s*byId\('auto-query'\)/);
  assert.match(app, /function scheduleAutoQuery\(\)/);
  assert.match(app, /clearTimeout\(autoQueryTimer\)/);
  assert.ok((app.match(/scheduleAutoQuery\(\);/g) || []).length >= 6);
  assert.match(css, /\.auto-query input:checked \+ span/);
});

test('time is a normal dimension and its five display grains live in the filter shelf', async () => {
  const [engine, app] = await Promise.all([
    readFile(new URL('js/query-engine.js', projectUrl), 'utf8'),
    readFile(new URL('js/app.js', projectUrl), 'utf8'),
  ]);

  assert.match(engine, /time:\s*\{\s*label:\s*'时间'/);
  assert.doesNotMatch(app, /class="time-suboptions"/);
  assert.match(app, /class="filter-menu time-grain-filter"/);
  assert.match(app, /hour:\s*'小时'/);
  assert.match(app, /day:\s*'日度'/);
  assert.match(app, /week:\s*'周度'/);
  assert.match(app, /biweek:\s*'双周'/);
  assert.match(app, /month:\s*'月度'/);
});

test('browser controller sends every selected dimension as a row dimension', async () => {
  const app = await readFile(new URL('js/app.js', projectUrl), 'utf8');

  assert.doesNotMatch(app, /columnDimension/);
  assert.match(app, /columns:\s*\[\]/);
});

test('table headers expose conventional ascending and descending sort indicators', async () => {
  const [app, css] = await Promise.all([
    readFile(new URL('js/app.js', projectUrl), 'utf8'),
    readFile(new URL('css/styles.css', projectUrl), 'utf8'),
  ]);

  assert.match(app, /class="sort-control"/);
  assert.match(app, /▲/);
  assert.match(app, /▼/);
  assert.match(css, /\.sort-control/);
});

test('table page and trend page are separated', async () => {
  const [html, trendHtml] = await Promise.all([
    readFile(new URL('index.html', projectUrl), 'utf8'),
    readFile(new URL('trend.html', projectUrl), 'utf8'),
  ]);

  assert.match(html, /id="result-table"/);
  assert.doesNotMatch(html, /trend-chart/);
  assert.doesNotMatch(html, /chart-panel/);
  assert.match(html, /href="\.\/trend\.html"/);
  assert.match(trendHtml, /id="trend-chart"/);
  assert.match(trendHtml, /type="module" src="\.\/js\/trend\.js"/);
  assert.doesNotMatch(trendHtml, /id="result-table"/);
});

test('trend page exposes compact multi-select configuration beside the chart', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('trend.html', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
  ]);

  assert.match(html, /class="trend-sidebar"/);
  assert.match(html, /class="trend-workbench"/);
  assert.match(html, /id="trend-metrics"/);
  assert.match(html, /id="trend-dimensions"/);
  assert.match(html, /id="trend-filters"/);
  assert.match(html, /id="date-start"/);
  assert.match(html, /id="date-end"/);
  assert.match(html, /id="time-grain"/);
  assert.match(html, /id="update-trend"/);
  assert.doesNotMatch(html, /id="field-library"/);
  assert.doesNotMatch(html, /id="row-shelf-chips"/);
  assert.doesNotMatch(html, /id="chart-metric"/);
  assert.doesNotMatch(html, /id="chart-dimension"/);

  assert.match(app, /active\.metrics/);
  assert.match(app, /active\.rowDimensions/);
  assert.match(app, /buildTrendSeries\(records, active, active\.metrics, active\.rowDimensions\)/);
});

test('trend filters update summaries and re-render the chart immediately', async () => {
  const app = await readFile(new URL('js/trend.js', projectUrl), 'utf8');
  const updateTrendSource = app.slice(
    app.indexOf('function updateTrend()'),
    app.indexOf("elements.trendMetrics.addEventListener"),
  );

  assert.match(app, /elements\.trendFilters\.addEventListener\('change'/);
  assert.match(app, /active\.filters\[key\]/);
  assert.match(app, /updateFilterSummary\(key\)/);
  assert.match(app, /renderChart\(true\)/);
  assert.doesNotMatch(updateTrendSource, /renderTrendFilters\(\)/);
});

test('trend filter choices are clickable through explicit label bindings', async () => {
  const app = await readFile(new URL('js/trend.js', projectUrl), 'utf8');

  assert.match(app, /id="\$\{inputId\}" type="checkbox" data-filter="\$\{key\}"/);
  assert.match(app, /label for="\$\{inputId\}"/);
  assert.match(app, /id="\$\{allInputId\}" type="checkbox" data-filter="\$\{key\}" data-all="true"/);
  assert.match(app, /label for="\$\{allInputId\}"/);
});

test('table and trend pages both expose registered DAU from the shared metric catalog', async () => {
  const [engine, app, trendApp] = await Promise.all([
    readFile(new URL('js/query-engine.js', projectUrl), 'utf8'),
    readFile(new URL('js/app.js', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
  ]);

  assert.match(engine, /registeredDau:\s*\{\s*label:\s*'注册 DAU'/);
  assert.match(app, /Object\.entries\(METRICS\)/);
  assert.match(trendApp, /Object\.entries\(METRICS\)/);
});

test('trend page exposes optional 3, 7, and 30 day moving averages', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('trend.html', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
  ]);

  assert.match(html, /id="trend-moving-averages"/);
  assert.match(app, /buildMovingAverages/);
  assert.match(app, /active\.movingAverages/);
  assert.match(app, /moving-average-line/);
  assert.match(app, /Number\(input\.value\)/);
});

test('trend chart supports bounded mouse zoom, drag pan, and reset', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('trend.html', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
  ]);

  assert.match(html, /id="chart-zoom-hint"/);
  assert.match(app, /addEventListener\('wheel'/);
  assert.match(app, /addEventListener\('pointerdown'/);
  assert.match(app, /addEventListener\('dblclick'/);
  assert.match(app, /clampTimeWindow/);
});

test('chart uses market-terminal details without fabricating candlestick data', async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL('trend.html', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
    readFile(new URL('css/styles.css', projectUrl), 'utf8'),
  ]);

  assert.match(html, /id="chart-tooltip"/);
  assert.match(html, /id="chart-navigator-window"/);
  assert.match(app, /chart-crosshair/);
  assert.match(app, /renderChartHover/);
  assert.match(css, /\.chart-tooltip/);
  assert.match(css, /\.chart-navigator/);
});

test('market-style chart uses a white plotting background', async () => {
  const css = await readFile(new URL('css/styles.css', projectUrl), 'utf8');
  assert.match(css, /\.chart-stage[^}]*background:\s*#fff(?:fff)?/);
});

test('trend chart renders clean lines without point markers', async () => {
  const app = await readFile(new URL('js/trend.js', projectUrl), 'utf8');
  assert.doesNotMatch(app, /<circle\b/);
});

test('table and trend live in one clearly labelled two-view workbench', async () => {
  const [tableHtml, trendHtml] = await Promise.all([
    readFile(new URL('index.html', projectUrl), 'utf8'),
    readFile(new URL('trend.html', projectUrl), 'utf8'),
  ]);

  for (const html of [tableHtml, trendHtml]) {
    assert.match(html, /class="view-switcher"/);
    assert.match(html, />透视分析</);
    assert.match(html, />趋势分析</);
  }
  assert.match(trendHtml, /class="trend-sidebar"/);
  assert.match(trendHtml, /class="trend-workbench"/);
});

test('trend page exposes accessible viewport controls and an enabled hourly grain', async () => {
  const [html, trendApp] = await Promise.all([
    readFile(new URL('trend.html', projectUrl), 'utf8'),
    readFile(new URL('js/trend.js', projectUrl), 'utf8'),
  ]);

  for (const id of ['zoom-in', 'zoom-out', 'pan-prev', 'pan-next', 'reset-viewport']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /<option value="hour" selected>小时<\/option>/);
  assert.doesNotMatch(html, /value="hour" disabled/);
  assert.match(trendApp, /timeGranularity:\s*'hour'/);
  assert.match(html, /id="series-warning"/);
});
