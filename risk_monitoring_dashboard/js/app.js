import { DIMENSIONS, METRICS, createMockRecords, buildQuery, sortRows } from './query-engine.js';

const records = createMockRecords();
const DATA_END_DATE = '2026-09-29';
const TIME_GRAINS = { hour: '小时', day: '日度', week: '周度', biweek: '双周', month: '月度' };
const defaultState = {
  metrics: ['submittedOrders', 'successOrders', 'successDau'],
  rowDimensions: ['customerType'],
  dateRange: { start: '2026-06-01', end: DATA_END_DATE },
  timeGranularity: 'hour',
  filters: Object.fromEntries(Object.entries(DIMENSIONS).filter(([, value]) => value.filterable !== false).map(([key]) => [key, []])),
};

let draft = structuredClone(defaultState);
let active = structuredClone(defaultState);
let currentResult = null;
let sortState = null;
let autoQueryTimer = null;
const byId = (id) => document.getElementById(id);
const elements = {
  metricOptions: byId('metric-options'),
  metricCount: byId('metric-count'),
  rowDimensions: byId('row-dimensions'),
  rowShelfChips: byId('row-shelf-chips'),
  metricShelfChips: byId('metric-shelf-chips'),
  filterOptions: byId('filter-options'),
  fieldSearch: byId('field-search'),
  autoQuery: byId('auto-query'),
  runQuery: byId('run-query'),
  resetQuery: byId('reset-query'),
  validation: byId('validation-message'),
  draftState: byId('draft-state'),
  dateStart: byId('date-start'),
  dateEnd: byId('date-end'),
  datePresets: document.querySelectorAll('[data-date-preset]'),
  activeDateLabel: byId('active-date-label'),
  table: byId('result-table'),
  tableCard: document.querySelector('.table-card'),
  rowCount: byId('row-count'),
  emptyState: byId('empty-state'),
  showQuery: byId('show-query'),
  dialog: byId('query-dialog'),
  closeDialog: byId('close-dialog'),
  queryJson: byId('query-json'),
  copyQuery: byId('copy-query'),
  copyStatus: byId('copy-status'),
  queryStatus: byId('query-status'),
  fullscreenTable: byId('fullscreen-table'),
  resultPanel: byId('result-panel'),
};

const formatNumber = (value) => new Intl.NumberFormat('zh-CN').format(value);

function metricInput(metricKey, metric) {
  const checked = draft.metrics.includes(metricKey) ? 'checked' : '';
  return `<div class="metric-check">
    <input id="metric-${metricKey}" type="checkbox" value="${metricKey}" ${checked}>
    <label for="metric-${metricKey}"><span>${metric.label}<small class="metric-stage">${metric.stage}</small></span></label>
  </div>`;
}

function renderMetrics() {
  elements.metricOptions.innerHTML = Object.entries(METRICS).map(([key, metric]) => metricInput(key, metric)).join('');
  elements.metricCount.textContent = `${draft.metrics.length} 已选`;
  renderShelfChips();
}

function renderDimensions() {
  elements.rowDimensions.innerHTML = Object.entries(DIMENSIONS).map(([key, dimension]) => {
    const checked = draft.rowDimensions.includes(key) ? 'checked' : '';
    const disabled = !checked && draft.rowDimensions.length >= 6 ? 'disabled' : '';
    return `<div class="dimension-check"><input id="row-${key}" type="checkbox" value="${key}" ${checked} ${disabled}><label for="row-${key}">${dimension.label}</label></div>`;
  }).join('');
  renderShelfChips();
}

function renderShelfChips() {
  elements.rowShelfChips.innerHTML = draft.rowDimensions.length
    ? draft.rowDimensions.map((key) => {
      const label = key === 'time' ? `${DIMENSIONS[key].label}（${TIME_GRAINS[draft.timeGranularity]}）` : DIMENSIONS[key].label;
      return `<span class="shelf-chip dimension">${label}<button type="button" data-remove-row="${key}" aria-label="移除${DIMENSIONS[key].label}">×</button></span>`;
    }).join('')
    : '<span class="shelf-empty">从左侧点击维度添加</span>';
  elements.metricShelfChips.innerHTML = draft.metrics.length
    ? draft.metrics.map((key) => `<span class="shelf-chip metric">${METRICS[key].label}<button type="button" data-remove-metric="${key}" aria-label="移除${METRICS[key].label}">×</button></span>`).join('')
    : '<span class="shelf-empty">从左侧点击指标添加</span>';
}

function filterControl(key, dimension) {
  const selected = draft.filters[key];
  const summary = selected.length === 0 ? '全部' : selected.length === 1 ? selected[0] : `已选 ${selected.length} 项`;
  const allChecked = selected.length === 0 ? 'checked' : '';
  const choices = dimension.options.map((option) => {
    const checked = selected.includes(option) ? 'checked' : '';
    const id = `filter-${key}-${option}`;
    return `<div class="filter-check"><input id="${id}" type="checkbox" data-dimension="${key}" value="${option}" ${checked}><label for="${id}">${option}</label></div>`;
  }).join('');
  return `<details class="filter-menu" data-filter-menu="${key}">
    <summary><span class="filter-label">${dimension.label}</span><span class="filter-value">${summary}</span></summary>
    <div class="filter-popover">
      <div class="filter-check all-option"><input id="filter-${key}-all" type="checkbox" data-dimension="${key}" data-all="true" ${allChecked}><label for="filter-${key}-all">全部</label></div>
      ${choices}
    </div>
  </details>`;
}

function timeGrainControl() {
  const choices = Object.entries(TIME_GRAINS).map(([value, label]) => {
    const checked = draft.timeGranularity === value ? 'checked' : '';
    return `<div class="filter-check"><input id="time-grain-${value}" type="radio" name="time-grain" value="${value}" data-time-grain="${value}" ${checked}><label for="time-grain-${value}">${label}</label></div>`;
  }).join('');
  return `<details class="filter-menu time-grain-filter">
    <summary><span class="filter-label">时间</span><span class="filter-value">${TIME_GRAINS[draft.timeGranularity]}</span></summary>
    <div class="filter-popover">${choices}</div>
  </details>`;
}

function renderFilters() {
  const dimensionFilters = Object.entries(DIMENSIONS)
    .filter(([, dimension]) => dimension.filterable !== false)
    .map(([key, dimension]) => filterControl(key, dimension)).join('');
  elements.filterOptions.innerHTML = `${timeGrainControl()}${dimensionFilters}`;
}

function presetRange(days) {
  const end = new Date(`${DATA_END_DATE}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end: DATA_END_DATE };
}

function renderTimeControls() {
  elements.dateStart.value = draft.dateRange.start;
  elements.dateEnd.value = draft.dateRange.end;
  elements.datePresets.forEach((button) => {
    const range = presetRange(Number(button.dataset.datePreset));
    button.classList.toggle('active', range.start === draft.dateRange.start && range.end === draft.dateRange.end);
  });
}

function markChanged() {
  const changed = JSON.stringify(draft) !== JSON.stringify(active);
  elements.draftState.textContent = changed ? '待查询' : '已同步';
  elements.draftState.classList.toggle('changed', changed);
}

function scheduleAutoQuery() {
  clearTimeout(autoQueryTimer);
  if (!elements.autoQuery.checked) return;
  elements.queryStatus.innerHTML = '<i></i>等待自动查询…';
  autoQueryTimer = setTimeout(executeQuery, 300);
}

function buildPayload(state) {
  return {
    dataset: 'payment_funnel_hourly',
    dateRange: state.dateRange,
    timeGranularity: state.timeGranularity,
    metrics: state.metrics,
    rows: state.rowDimensions,
    columns: [],
    filters: state.filters,
  };
}

function sortControl({ kind, key, index, label }) {
  const sameColumn = sortState?.kind === kind && (kind === 'dimension' ? sortState.index === index : sortState.key === key);
  const direction = sameColumn ? sortState.direction : null;
  return `<button class="sort-control" type="button" data-sort-kind="${kind}" ${key ? `data-sort-key="${key}"` : ''} ${index != null ? `data-sort-index="${index}"` : ''} aria-label="${label}排序">
    <span class="sort-up ${direction === 'asc' ? 'active' : ''}" aria-hidden="true">▲</span>
    <span class="sort-down ${direction === 'desc' ? 'active' : ''}" aria-hidden="true">▼</span>
  </button>`;
}

function metricHeaders(metrics) {
  return metrics.map((key) => `<th scope="col" class="sortable-head"><span class="th-content"><span>${METRICS[key].label}<span class="metric-unit">${METRICS[key].kind === 'dau' ? '人' : '单'}</span></span>${sortControl({ kind: 'metric', key, label: METRICS[key].label })}</span></th>`).join('');
}

function metricCells(values, metrics) {
  return metrics.map((key) => values?.[key] == null ? '<td class="empty-cell">—</td>' : `<td>${formatNumber(values[key])}</td>`).join('');
}

function renderTable(result) {
  if (!result.rows.length) {
    elements.tableCard.hidden = true;
    elements.emptyState.hidden = false;
    return;
  }
  elements.tableCard.hidden = false;
  elements.emptyState.hidden = true;

  const dimensionHeaders = result.rowKeys.length
    ? result.rowKeys.map((key, index) => `<th scope="col" class="${index === 0 ? 'row-head' : 'dimension-head'} sortable-head"><span class="th-content"><span>${DIMENSIONS[key].label}</span>${sortControl({ kind: 'dimension', index, label: DIMENSIONS[key].label })}</span></th>`).join('')
    : `<th scope="col" class="row-head">范围</th>`;
  const head = `<thead><tr>${dimensionHeaders}${metricHeaders(result.metrics)}</tr></thead>`;

  const body = sortRows(result.rows, sortState).map((row) => {
    const labels = row.labels.map((label, index) => `<td class="${index === 0 ? 'row-label' : 'dimension-label'}">${label}</td>`).join('');
    const values = metricCells(row.values.__all, result.metrics);
    return `<tr>${labels}${values}</tr>`;
  }).join('');

  const totalLabel = `<td colspan="${Math.max(1, result.rowKeys.length)}">合计</td>`;
  const totals = metricCells(result.totals.__all, result.metrics);
  elements.table.innerHTML = `${head}<tbody>${body}</tbody><tfoot><tr>${totalLabel}${totals}</tr></tfoot>`;
  elements.rowCount.textContent = `${result.rows.length} 行结果`;
}

function executeQuery() {
  clearTimeout(autoQueryTimer);
  autoQueryTimer = null;
  if (!draft.metrics.length) {
    elements.validation.textContent = '请至少选择一个指标。';
    elements.metricOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!draft.dateRange.start || !draft.dateRange.end || draft.dateRange.start > draft.dateRange.end) {
    elements.validation.textContent = '请选择有效的时间范围。';
    elements.dateStart.focus();
    return;
  }
  elements.validation.textContent = '';
  active = structuredClone(draft);
  const result = buildQuery(records, active);
  currentResult = result;
  sortState = null;
  renderTable(result);
  elements.activeDateLabel.textContent = `${active.dateRange.start} 至 ${active.dateRange.end}`;
  elements.queryJson.textContent = JSON.stringify(buildPayload(active), null, 2);
  elements.queryStatus.innerHTML = '<i></i>查询完成 · 186 ms';
  markChanged();
}

elements.metricOptions.addEventListener('change', (event) => {
  const key = event.target.value;
  draft.metrics = event.target.checked ? [...draft.metrics, key] : draft.metrics.filter((item) => item !== key);
  elements.metricCount.textContent = `${draft.metrics.length} 已选`;
  renderShelfChips();
  elements.validation.textContent = '';
  markChanged();
  scheduleAutoQuery();
});

elements.rowDimensions.addEventListener('change', (event) => {
  const key = event.target.value;
  draft.rowDimensions = event.target.checked ? [...draft.rowDimensions, key] : draft.rowDimensions.filter((item) => item !== key);
  renderDimensions();
  markChanged();
  scheduleAutoQuery();
});

elements.rowShelfChips.addEventListener('click', (event) => {
  const key = event.target.dataset.removeRow;
  if (!key) return;
  draft.rowDimensions = draft.rowDimensions.filter((item) => item !== key);
  renderDimensions();
  markChanged();
  scheduleAutoQuery();
});

elements.metricShelfChips.addEventListener('click', (event) => {
  const key = event.target.dataset.removeMetric;
  if (!key) return;
  draft.metrics = draft.metrics.filter((item) => item !== key);
  renderMetrics();
  markChanged();
  scheduleAutoQuery();
});

elements.filterOptions.addEventListener('change', (event) => {
  const grain = event.target.dataset.timeGrain;
  if (grain) {
    draft.timeGranularity = grain;
    renderFilters();
    renderShelfChips();
    markChanged();
    scheduleAutoQuery();
    return;
  }
  const dimension = event.target.dataset.dimension;
  if (!dimension) return;
  if (event.target.dataset.all) {
    draft.filters[dimension] = [];
  } else {
    const selected = new Set(draft.filters[dimension]);
    event.target.checked ? selected.add(event.target.value) : selected.delete(event.target.value);
    draft.filters[dimension] = [...selected];
  }
  renderFilters();
  markChanged();
  scheduleAutoQuery();
});

[elements.dateStart, elements.dateEnd].forEach((input) => input.addEventListener('change', () => {
  draft.dateRange = { start: elements.dateStart.value, end: elements.dateEnd.value };
  renderTimeControls();
  elements.validation.textContent = '';
  markChanged();
  scheduleAutoQuery();
}));
elements.datePresets.forEach((button) => button.addEventListener('click', () => {
  draft.dateRange = presetRange(Number(button.dataset.datePreset));
  renderTimeControls();
  elements.validation.textContent = '';
  markChanged();
  scheduleAutoQuery();
}));

elements.autoQuery.addEventListener('change', scheduleAutoQuery);
elements.runQuery.addEventListener('click', executeQuery);
elements.table.addEventListener('click', (event) => {
  const button = event.target.closest('.sort-control');
  if (!button || !currentResult) return;
  const kind = button.dataset.sortKind;
  const next = {
    kind,
    key: button.dataset.sortKey,
    index: button.dataset.sortIndex == null ? undefined : Number(button.dataset.sortIndex),
  };
  const sameColumn = sortState?.kind === next.kind
    && (kind === 'dimension' ? sortState.index === next.index : sortState.key === next.key);
  if (!sameColumn) next.direction = 'asc';
  else if (sortState.direction === 'asc') next.direction = 'desc';
  else next.direction = null;
  sortState = next.direction ? next : null;
  renderTable(currentResult);
});
elements.fieldSearch.addEventListener('input', (event) => {
  const keyword = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.dimension-check, .metric-check').forEach((item) => {
    item.hidden = Boolean(keyword) && !item.textContent.toLowerCase().includes(keyword);
  });
});
elements.resetQuery.addEventListener('click', () => {
  draft = structuredClone(defaultState);
  renderMetrics();
  renderDimensions();
  renderFilters();
  renderTimeControls();
  executeQuery();
});
elements.showQuery.addEventListener('click', () => {
  elements.copyStatus.textContent = '';
  elements.dialog.showModal();
});
elements.closeDialog.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.copyQuery.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(elements.queryJson.textContent);
    elements.copyStatus.textContent = '已复制';
  } catch {
    elements.copyStatus.textContent = '请手动选择代码复制';
  }
});
elements.fullscreenTable.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await elements.resultPanel.requestFullscreen();
  }
});

renderMetrics();
renderDimensions();
renderFilters();
renderTimeControls();
executeQuery();
