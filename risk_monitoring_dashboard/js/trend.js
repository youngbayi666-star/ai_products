import {
  DIMENSIONS,
  METRICS,
  createMockRecords,
  buildTrendSeries,
  buildMovingAverages,
  clampTimeWindow,
  summarizeTrend,
} from './query-engine.js';

const records = createMockRecords();
const DATA_RANGE_START = '2026-08-01';
const DATA_RANGE_END = '2026-09-29';
const TIME_GRAINS = { hour: '小时', day: '日', week: '周', biweek: '双周', month: '月' };
const CHART_COLORS = ['#2563eb', '#7c3aed', '#d97706', '#059669', '#db2777', '#475569', '#0891b2', '#b45309'];
const defaultState = {
  metrics: ['submittedOrders', 'successOrders', 'successDau'],
  rowDimensions: ['customerType'],
  dateRange: { start: DATA_RANGE_START, end: DATA_RANGE_END },
  timeGranularity: 'hour',
  movingAverages: [],
  filters: Object.fromEntries(Object.entries(DIMENSIONS)
    .filter(([, value]) => value.filterable !== false)
    .map(([key]) => [key, []])),
};

let active = structuredClone(defaultState);
let chartViewport = null;
let chartDrag = null;
let currentPeriodCount = 0;
let chartRenderStates = new Map();
const hiddenSeries = new Set();

const byId = (id) => document.getElementById(id);
const elements = {
  trendMetrics: byId('trend-metrics'),
  trendDimensions: byId('trend-dimensions'),
  trendFilters: byId('trend-filters'),
  dateStart: byId('date-start'),
  dateEnd: byId('date-end'),
  activeDateLabel: byId('active-date-label'),
  timeGrain: byId('time-grain'),
  movingAverages: byId('trend-moving-averages'),
  updateTrend: byId('update-trend'),
  chartSubtitle: byId('chart-subtitle'),
  chartLegend: byId('chart-legend'),
  chartVisibleRange: byId('chart-visible-range'),
  seriesWarning: byId('series-warning'),
  trendChart: byId('trend-chart'),
  chartTooltip: byId('chart-tooltip'),
  chartNavigatorWindow: byId('chart-navigator-window'),
  zoomIn: byId('zoom-in'),
  zoomOut: byId('zoom-out'),
  panPrev: byId('pan-prev'),
  panNext: byId('pan-next'),
  resetViewport: byId('reset-viewport'),
};

const formatNumber = (value) => value == null ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value);
const formatRate = (value) => value == null ? '—' : `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const chartPeriodLabel = (value) => {
  if (value.includes(' ~ ')) return value.split(' ~ ')[0].slice(5);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:00$/.test(value)) return value.slice(5);
  return value.length === 10 ? value.slice(5) : value;
};
const seriesId = (series) => `${series.metricKey}:${series.name}`;

function colorForSeries(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function movingAverageDash(window) {
  if (window === 3) return '6 4';
  if (window === 7) return '3 3';
  return '9 4 2 4';
}

function buildCardSeries(baseSeries, periods) {
  return baseSeries.flatMap((series, index) => {
    const color = colorForSeries(index);
    return [
      { ...series, color, sourceName: series.name },
      ...buildMovingAverages(series, periods, active.movingAverages).map((movingAverage) => ({
        ...movingAverage,
        color,
        sourceName: series.name,
      })),
    ];
  });
}

function updateViewportControls() {
  const visibleLength = chartViewport ? chartViewport.end - chartViewport.start + 1 : currentPeriodCount;
  elements.zoomIn.disabled = currentPeriodCount <= 3 || visibleLength <= Math.min(3, currentPeriodCount);
  elements.zoomOut.disabled = visibleLength >= currentPeriodCount;
  elements.panPrev.disabled = !chartViewport || chartViewport.start === 0;
  elements.panNext.disabled = !chartViewport || chartViewport.end >= currentPeriodCount - 1;
  elements.resetViewport.disabled = visibleLength >= currentPeriodCount;
}

function renderSummary(summary) {
  const direction = summary.change == null || summary.change === 0 ? 'neutral' : summary.change > 0 ? 'up' : 'down';
  return `<div class="metric-summary" aria-label="指标趋势摘要">
    <div><span>当前值</span><strong>${formatNumber(summary.current)}</strong></div>
    <div class="summary-change ${direction}"><span>较上一${TIME_GRAINS[active.timeGranularity]}</span><strong>${formatRate(summary.changeRate)}</strong></div>
    <div><span>区间范围</span><strong>${formatNumber(summary.minimum)}–${formatNumber(summary.maximum)}</strong></div>
    <div><span>峰值时点</span><strong>${summary.peakPeriod ? chartPeriodLabel(summary.peakPeriod) : '—'}</strong></div>
  </div>`;
}

function renderMetricCard(metricKey, periods, allSeries, totalSeries) {
  const baseSeries = allSeries.filter((series) => series.metricKey === metricKey);
  const cardSeries = buildCardSeries(baseSeries, periods);
  const visiblePeriods = periods.slice(chartViewport.start, chartViewport.end + 1);
  const visibleSeries = cardSeries.map((series) => ({
    ...series,
    values: series.values.slice(chartViewport.start, chartViewport.end + 1),
  }));
  const plottedSeries = visibleSeries.filter((series) => !hiddenSeries.has(seriesId(series)));
  const allValues = plottedSeries.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const summarySeries = {
    values: totalSeries.values.slice(chartViewport.start, chartViewport.end + 1),
  };
  const summary = summarizeTrend(summarySeries, visiblePeriods);
  const metric = METRICS[metricKey];
  const dimensionLabel = active.rowDimensions.length
    ? active.rowDimensions.map((key) => DIMENSIONS[key].label).join(' × ')
    : '整体趋势';

  const width = 1000;
  const height = 300;
  const margin = { top: 18, right: 72, bottom: 42, left: 22 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...allValues);
  const x = (index) => margin.left + (visiblePeriods.length === 1 ? plotWidth / 2 : index * plotWidth / (visiblePeriods.length - 1));
  const y = (value) => margin.top + plotHeight - value / maxValue * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round(maxValue * index / 4));
  const xStep = Math.max(1, Math.ceil(visiblePeriods.length / 8));
  const grid = yTicks.map((value) => {
    const position = y(value);
    return `<g><line x1="${margin.left}" y1="${position}" x2="${width - margin.right}" y2="${position}"/><text x="${width - margin.right + 10}" y="${position + 4}">${formatNumber(value)}</text></g>`;
  }).join('');
  const xLabels = visiblePeriods.map((period, index) => index % xStep === 0 || index === visiblePeriods.length - 1
    ? `<text x="${x(index)}" y="${height - 16}" text-anchor="middle">${chartPeriodLabel(period)}</text>`
    : '').join('');
  const lines = plottedSeries.map((series) => {
    const points = series.values
      .map((value, index) => value == null ? null : `${x(index)},${y(value)}`)
      .filter(Boolean)
      .join(' ');
    const className = series.movingAverageWindow ? 'moving-average-line' : '';
    const dash = series.movingAverageWindow ? ` stroke-dasharray="${movingAverageDash(series.movingAverageWindow)}"` : '';
    return `<polyline class="${className}" points="${points}" fill="none" stroke="${series.color}" stroke-width="${series.movingAverageWindow ? 1.6 : 2.2}"${dash} stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const legend = cardSeries.map((series) => {
    const id = seriesId(series);
    const muted = hiddenSeries.has(id);
    return `<button type="button" class="legend-item${muted ? ' is-hidden' : ''}" data-series-id="${encodeURIComponent(id)}" aria-pressed="${!muted}" title="${series.name}">
      <i class="${series.movingAverageWindow ? 'dashed' : ''}" style="--series-color:${series.color}"></i><span>${series.name.replace(`${metric.label} · `, '')}</span>
    </button>`;
  }).join('');
  const empty = plottedSeries.length && allValues.length
    ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label}时间趋势">
        <g class="chart-grid">${grid}</g>
        <line class="chart-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}"/>
        <g class="chart-x-labels">${xLabels}</g>
        <g class="chart-series">${lines}</g>
        <g class="chart-crosshair" hidden>
          <line class="crosshair-x" y1="${margin.top}" y2="${margin.top + plotHeight}"/>
          <line class="crosshair-y" x1="${margin.left}" x2="${width - margin.right}"/>
        </g>
      </svg>`
    : '<div class="chart-empty">当前没有可见序列，请点击图例恢复。</div>';

  chartRenderStates.set(metricKey, { periods: visiblePeriods, series: plottedSeries, width, margin, plotWidth, plotHeight, maxValue });
  return `<article class="metric-chart-card" data-chart-metric="${metricKey}">
    <header class="metric-card-header">
      <div><span class="metric-stage-label">${metric.stage}</span><h3>${metric.label}</h3><p>${dimensionLabel} · ${TIME_GRAINS[active.timeGranularity]}粒度</p></div>
      ${renderSummary(summary)}
    </header>
    <div class="metric-card-legend" aria-label="${metric.label}图例">${legend}</div>
    <div class="metric-plot">${empty}</div>
  </article>`;
}

function renderChart(resetViewport = false) {
  if (!active.metrics.length) {
    elements.trendChart.innerHTML = '<div class="chart-empty">至少选择一个指标后才能查看趋势。</div>';
    elements.chartLegend.innerHTML = '';
    elements.seriesWarning.textContent = '';
    return;
  }

  const model = buildTrendSeries(records, active, active.metrics, active.rowDimensions);
  const totals = buildTrendSeries(records, active, active.metrics, []);
  currentPeriodCount = model.periods.length;
  if (resetViewport || !chartViewport || chartViewport.end >= model.periods.length) {
    const defaultLength = active.timeGranularity === 'hour' ? Math.min(168, model.periods.length) : model.periods.length;
    chartViewport = clampTimeWindow(model.periods.length, model.periods.length - defaultLength, defaultLength);
  }
  if (!model.periods.length) {
    elements.trendChart.innerHTML = '<div class="chart-empty">当前筛选范围内没有数据。</div>';
    return;
  }

  chartRenderStates = new Map();
  const baseSeriesCount = model.series.length;
  elements.seriesWarning.textContent = baseSeriesCount > 6
    ? `当前组合生成 ${baseSeriesCount} 条序列，建议增加筛选条件；也可点击图例隐藏暂不关注的序列。`
    : '';
  elements.seriesWarning.classList.toggle('visible', baseSeriesCount > 6);
  elements.chartLegend.innerHTML = `<span><i></i>实线：指标值</span>${active.movingAverages.length ? '<span><i class="dashed"></i>虚线：移动平均</span>' : ''}<span>${active.rowDimensions.length ? `拆分：${active.rowDimensions.map((key) => DIMENSIONS[key].label).join(' × ')}` : '未拆分维度'}</span>`;
  const visiblePeriods = model.periods.slice(chartViewport.start, chartViewport.end + 1);
  elements.chartVisibleRange.textContent = `${visiblePeriods[0]} 至 ${visiblePeriods.at(-1)}`;
  elements.activeDateLabel.textContent = `${active.dateRange.start} 至 ${active.dateRange.end}`;
  elements.chartSubtitle.textContent = `${active.metrics.length} 个指标 · ${baseSeriesCount} 条基础序列 · ${TIME_GRAINS[active.timeGranularity]}粒度`;
  elements.chartNavigatorWindow.style.left = `${chartViewport.start / model.periods.length * 100}%`;
  elements.chartNavigatorWindow.style.width = `${visiblePeriods.length / model.periods.length * 100}%`;
  elements.trendChart.innerHTML = active.metrics.map((metricKey) => {
    const totalSeries = totals.series.find((series) => series.metricKey === metricKey);
    return renderMetricCard(metricKey, model.periods, model.series, totalSeries);
  }).join('');
  updateViewportControls();
}

function renderChartHover(event) {
  if (chartDrag) return;
  const card = event.target.closest('.metric-chart-card');
  const plot = event.target.closest('.metric-plot');
  if (!card || !plot) return;
  const state = chartRenderStates.get(card.dataset.chartMetric);
  if (!state?.periods.length || !state.series.length) return;
  const rect = plot.getBoundingClientRect();
  const { periods, series, width, margin, plotWidth, plotHeight, maxValue } = state;
  const svgX = (event.clientX - rect.left) / rect.width * width;
  const ratio = Math.min(1, Math.max(0, (svgX - margin.left) / plotWidth));
  const index = Math.round(ratio * Math.max(0, periods.length - 1));
  const crosshairX = margin.left + (periods.length === 1 ? plotWidth / 2 : index * plotWidth / (periods.length - 1));
  const primaryValue = series[0]?.values[index] ?? 0;
  const crosshairY = margin.top + plotHeight - primaryValue / maxValue * plotHeight;
  const crosshair = card.querySelector('.chart-crosshair');
  if (!crosshair) return;
  crosshair.hidden = false;
  const vertical = crosshair.querySelector('.crosshair-x');
  vertical.setAttribute('x1', crosshairX);
  vertical.setAttribute('x2', crosshairX);
  const horizontal = crosshair.querySelector('.crosshair-y');
  horizontal.setAttribute('y1', crosshairY);
  horizontal.setAttribute('y2', crosshairY);

  elements.chartTooltip.innerHTML = `<strong>${periods[index]}</strong>${series.map((item) => `<span><i style="--series-color:${item.color}"></i>${item.name}<b>${formatNumber(item.values[index])}</b></span>`).join('')}`;
  elements.chartTooltip.hidden = false;
  const stage = elements.chartTooltip.parentElement.getBoundingClientRect();
  elements.chartTooltip.style.left = `${Math.min(stage.width - 204, Math.max(12, event.clientX - stage.left + 16))}px`;
  elements.chartTooltip.style.top = `${Math.max(12, event.clientY - stage.top - 30)}px`;
}

function clearChartHover() {
  document.querySelectorAll('.chart-crosshair').forEach((crosshair) => { crosshair.hidden = true; });
  elements.chartTooltip.hidden = true;
}

function zoomViewport(factor, ratio = 0.5) {
  if (!currentPeriodCount) return;
  const length = chartViewport.end - chartViewport.start + 1;
  const nextLength = Math.round(length * factor);
  const focus = chartViewport.start + ratio * (length - 1);
  chartViewport = clampTimeWindow(currentPeriodCount, focus - ratio * (nextLength - 1), nextLength);
  renderChart();
}

function panViewport(direction) {
  const length = chartViewport.end - chartViewport.start + 1;
  const shift = Math.max(1, Math.round(length * 0.25)) * direction;
  chartViewport = clampTimeWindow(currentPeriodCount, chartViewport.start + shift, length);
  renderChart();
}

elements.trendChart.addEventListener('wheel', (event) => {
  if (currentPeriodCount <= 3) return;
  event.preventDefault();
  const rect = event.target.closest('.metric-plot')?.getBoundingClientRect() ?? elements.trendChart.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  zoomViewport(event.deltaY < 0 ? 0.76 : 1.3, ratio);
}, { passive: false });
elements.trendChart.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.metric-plot') || chartViewport.end - chartViewport.start + 1 >= currentPeriodCount) return;
  chartDrag = { x: event.clientX, start: chartViewport.start, length: chartViewport.end - chartViewport.start + 1 };
  elements.trendChart.classList.add('dragging');
});
document.addEventListener('pointermove', (event) => {
  if (!chartDrag) return;
  const width = Math.max(1, elements.trendChart.getBoundingClientRect().width);
  const shift = Math.round((chartDrag.x - event.clientX) / width * chartDrag.length);
  chartViewport = clampTimeWindow(currentPeriodCount, chartDrag.start + shift, chartDrag.length);
  renderChart();
});
const stopChartDrag = () => {
  chartDrag = null;
  elements.trendChart.classList.remove('dragging');
};
document.addEventListener('pointerup', stopChartDrag);
document.addEventListener('pointercancel', stopChartDrag);
elements.trendChart.addEventListener('mousemove', renderChartHover);
elements.trendChart.addEventListener('mouseleave', clearChartHover);
elements.trendChart.addEventListener('dblclick', () => {
  chartViewport = clampTimeWindow(currentPeriodCount, 0, currentPeriodCount);
  renderChart();
});
elements.trendChart.addEventListener('click', (event) => {
  const legendButton = event.target.closest('[data-series-id]');
  if (!legendButton) return;
  const id = decodeURIComponent(legendButton.dataset.seriesId);
  if (hiddenSeries.has(id)) hiddenSeries.delete(id); else hiddenSeries.add(id);
  renderChart();
});

elements.zoomIn.addEventListener('click', () => zoomViewport(0.7));
elements.zoomOut.addEventListener('click', () => zoomViewport(1.4));
elements.panPrev.addEventListener('click', () => panViewport(-1));
elements.panNext.addEventListener('click', () => panViewport(1));
elements.resetViewport.addEventListener('click', () => {
  chartViewport = clampTimeWindow(currentPeriodCount, 0, currentPeriodCount);
  renderChart();
});

function renderTrendMetrics() {
  elements.trendMetrics.innerHTML = Object.entries(METRICS).map(([key, metric]) => `
    <label class="config-check" title="${metric.label}"><input type="checkbox" data-metric="${key}" ${active.metrics.includes(key) ? 'checked' : ''}><span>${metric.label}</span></label>
  `).join('');
}

function renderTrendDimensions() {
  elements.trendDimensions.innerHTML = Object.entries(DIMENSIONS).filter(([key]) => key !== 'time').map(([key, dimension]) => `
    <label class="config-check" title="${dimension.label}"><input type="checkbox" data-dimension="${key}" ${active.rowDimensions.includes(key) ? 'checked' : ''}><span>${dimension.label}</span></label>
  `).join('');
}

function renderTrendFilters() {
  elements.trendFilters.innerHTML = Object.entries(DIMENSIONS).filter(([, dimension]) => dimension.filterable !== false).map(([key, dimension]) => {
    const selected = active.filters[key];
    const summary = selected.length === 0 ? '全部' : selected.length === 1 ? selected[0] : `已选 ${selected.length} 项`;
    const choices = dimension.options.map((option) => {
      const inputId = `trend-filter-${key}-${option}`;
      return `<div class="filter-check"><input id="${inputId}" type="checkbox" data-filter="${key}" value="${option}" ${selected.includes(option) ? 'checked' : ''}><label for="${inputId}">${option}</label></div>`;
    }).join('');
    const allInputId = `trend-filter-${key}-all`;
    return `<details class="filter-menu" data-filter-menu="${key}"><summary><span class="filter-label">${dimension.label}</span><span class="filter-value">${summary}</span></summary>
      <div class="filter-popover">
        <div class="filter-check all-option"><input id="${allInputId}" type="checkbox" data-filter="${key}" data-all="true" ${selected.length === 0 ? 'checked' : ''}><label for="${allInputId}">全部</label></div>
        ${choices}
      </div>
    </details>`;
  }).join('');
}

function updateTrend() {
  active = {
    metrics: [...document.querySelectorAll('[data-metric]:checked')].map((input) => input.dataset.metric),
    rowDimensions: [...document.querySelectorAll('[data-dimension]:checked')].map((input) => input.dataset.dimension),
    dateRange: { start: elements.dateStart.value, end: elements.dateEnd.value },
    timeGranularity: elements.timeGrain.value,
    movingAverages: [...elements.movingAverages.querySelectorAll('input:checked')].map((input) => Number(input.value)),
    filters: active.filters,
  };
  renderChart(true);
}

elements.trendMetrics.addEventListener('change', () => {
  active.metrics = [...document.querySelectorAll('[data-metric]:checked')].map((input) => input.dataset.metric);
  renderChart(true);
});
elements.trendDimensions.addEventListener('change', () => {
  active.rowDimensions = [...document.querySelectorAll('[data-dimension]:checked')].map((input) => input.dataset.dimension);
  hiddenSeries.clear();
  renderChart(true);
});
elements.trendFilters.addEventListener('change', (event) => {
  const key = event.target.dataset.filter;
  if (!key) return;
  const inputs = [...elements.trendFilters.querySelectorAll(`[data-filter="${key}"]`)];
  if (event.target.dataset.all) {
    active.filters[key] = [];
    inputs.forEach((input) => { if (!input.dataset.all) input.checked = false; });
  } else {
    active.filters[key] = inputs.filter((input) => !input.dataset.all && input.checked).map((input) => input.value);
  }
  updateFilterSummary(key);
  renderChart(true);
});

function updateFilterSummary(key) {
  const menu = elements.trendFilters.querySelector(`[data-filter-menu="${key}"]`);
  if (!menu) return;
  const selected = active.filters[key];
  menu.querySelector('.filter-value').textContent = selected.length === 0
    ? '全部'
    : selected.length === 1 ? selected[0] : `已选 ${selected.length} 项`;
  const allInput = menu.querySelector('[data-all]');
  if (allInput) allInput.checked = selected.length === 0;
}

elements.updateTrend.addEventListener('click', updateTrend);
elements.timeGrain.addEventListener('change', updateTrend);
elements.dateStart.addEventListener('change', updateTrend);
elements.dateEnd.addEventListener('change', updateTrend);
elements.movingAverages.addEventListener('change', () => {
  active.movingAverages = [...elements.movingAverages.querySelectorAll('input:checked')].map((input) => Number(input.value));
  renderChart(true);
});

renderTrendMetrics();
renderTrendDimensions();
renderTrendFilters();
renderChart(true);
