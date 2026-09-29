export const DIMENSIONS = {
  time: { label: '时间', filterable: false },
  customerType: { label: '新老客', options: ['新客', '老客'] },
  country: { label: '国家', options: ['英国', '法国', '德国', '荷兰', '比利时', '卢森堡'] },
  amountBand: { label: '大小额', options: ['€500以上', '€500以下'] },
  category: { label: '品类', options: ['手机通讯', '电脑办公', '家用电器', '美妆个护', '运动户外'] },
  paymentMethod: { label: '支付方式', options: ['PayPal', 'ApplePay', 'GooglePay', 'WechatPay', 'Card', 'Klarna', 'Riverty'] },
};

export const METRICS = {
  registeredDau: { label: '注册 DAU', field: 'registered', kind: 'dau', stage: '注册' },
  submittedOrders: { label: '提单订单量', field: 'submitted', kind: 'orders', stage: '提单' },
  submittedDau: { label: '提单 DAU', field: 'submitted', kind: 'dau', stage: '提单' },
  initLossOrders: { label: '初始化漏损订单数', field: 'initLoss', kind: 'orders', stage: '初始化' },
  initLossDau: { label: '初始化漏损 DAU', field: 'initLoss', kind: 'dau', stage: '初始化' },
  retailRiskLossOrders: { label: '零售风控漏损订单数', field: 'retailRiskLoss', kind: 'orders', stage: '零售风控' },
  retailRiskLossDau: { label: '零售风控漏损 DAU', field: 'retailRiskLoss', kind: 'dau', stage: '零售风控' },
  techRiskLossOrders: { label: '科技风控漏损订单数', field: 'techRiskLoss', kind: 'orders', stage: '科技风控' },
  techRiskLossDau: { label: '科技风控漏损 DAU', field: 'techRiskLoss', kind: 'dau', stage: '科技风控' },
  threeDsLossOrders: { label: '3DS 验证漏损订单数', field: 'threeDsLoss', kind: 'orders', stage: '3DS 验证' },
  threeDsLossDau: { label: '3DS 漏损 DAU', field: 'threeDsLoss', kind: 'dau', stage: '3DS 验证' },
  payingLossOrders: { label: '支付中漏损订单数', field: 'payingLoss', kind: 'orders', stage: '支付中' },
  payingLossDau: { label: '支付中漏损 DAU', field: 'payingLoss', kind: 'dau', stage: '支付中' },
  successOrders: { label: '支付成功订单数', field: 'success', kind: 'orders', stage: '支付成功' },
  successDau: { label: '支付成功 DAU', field: 'success', kind: 'dau', stage: '支付成功' },
};

const mulberry32 = (seed) => () => {
  let value = (seed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const pick = (items, random) => items[Math.floor(random() * items.length)];

export function createMockRecords(count = 5760) {
  const random = mulberry32(20260921);
  const records = [];
  const countryWeights = ['英国', '英国', '英国', '法国', '法国', '德国', '德国', '荷兰', '比利时', '卢森堡'];
  const paymentWeights = ['Card', 'Card', 'Card', 'PayPal', 'PayPal', 'ApplePay', 'GooglePay', 'WechatPay', 'Klarna', 'Riverty'];

  for (let index = 0; index < count; index += 1) {
    const customerType = random() < 0.38 ? '新客' : '老客';
    const country = pick(countryWeights, random);
    const category = pick(DIMENSIONS.category.options, random);
    const paymentMethod = pick(paymentWeights, random);
    const amountBand = random() < (category === '手机通讯' || category === '电脑办公' ? 0.46 : 0.2) ? '€500以上' : '€500以下';
    const userId = `U${String(Math.floor(index * 0.72) + 10001)}`;
    const registered = customerType === '新客' ? 1 : 0;
    const recordDay = index % 60;
    const date = recordDay < 31
      ? `2026-08-${String(recordDay + 1).padStart(2, '0')}`
      : `2026-09-${String(recordDay - 30).padStart(2, '0')}`;
    const hour = String(Math.floor(index / 60) % 24).padStart(2, '0');
    const minute = String(index * 13 % 60).padStart(2, '0');

    let failureRate = 0.035;
    if (customerType === '新客') failureRate += 0.018;
    if (amountBand === '€500以上') failureRate += 0.02;
    if (paymentMethod === 'Card') failureRate += 0.008;

    const outcome = random();
    const initLoss = outcome < failureRate ? 1 : 0;
    const retailRiskLoss = !initLoss && outcome < failureRate + 0.047 ? 1 : 0;
    const techRiskLoss = !initLoss && !retailRiskLoss && outcome < failureRate + 0.079 ? 1 : 0;
    const threeDsBoost = country === '英国' || country === '法国' ? 0.016 : 0.004;
    const threeDsLoss = !initLoss && !retailRiskLoss && !techRiskLoss && outcome < failureRate + 0.079 + 0.058 + threeDsBoost ? 1 : 0;
    const payingLoss = !initLoss && !retailRiskLoss && !techRiskLoss && !threeDsLoss && outcome < failureRate + 0.079 + 0.058 + threeDsBoost + 0.052 ? 1 : 0;
    const success = initLoss || retailRiskLoss || techRiskLoss || threeDsLoss || payingLoss ? 0 : 1;

    records.push({
      orderId: `O${String(index + 1).padStart(6, '0')}`,
      userId,
      date,
      time: `${date} ${hour}:${minute}`,
      customerType,
      country,
      amountBand,
      category,
      paymentMethod,
      registered,
      submitted: 1,
      initLoss,
      retailRiskLoss,
      techRiskLoss,
      threeDsLoss,
      payingLoss,
      success,
    });
  }

  return records;
}

function applyFilters(records, filters = {}, dateRange = {}) {
  return records.filter((record) => {
    if (dateRange.start && record.date < dateRange.start) return false;
    if (dateRange.end && record.date > dateRange.end) return false;
    return Object.entries(filters).every(([key, selected]) => {
    if (!Array.isArray(selected) || selected.length === 0) return true;
    return selected.includes(record[key]);
    });
  });
}

function aggregate(records, metricKeys) {
  const result = {};
  for (const metricKey of metricKeys) {
    const metric = METRICS[metricKey];
    if (!metric) continue;
    if (metric.kind === 'dau') {
      result[metricKey] = new Set(records.filter((record) => record[metric.field]).map((record) => record.userId)).size;
    } else {
      result[metricKey] = records.reduce((sum, record) => sum + Number(Boolean(record[metric.field])), 0);
    }
  }
  return result;
}

const formatDate = (date) => date.toISOString().slice(0, 10);

function timeBucket(dateValue, granularity = 'day') {
  const timestamp = String(dateValue);
  const datePart = timestamp.slice(0, 10);
  if (granularity === 'hour') {
    const hour = timestamp.match(/^\d{4}-\d{2}-\d{2}[ T](\d{2})/)?.[1] ?? '00';
    return `${datePart} ${hour}:00`;
  }
  if (granularity === 'month') return datePart.slice(0, 7);
  if (granularity === 'day') return datePart;

  const date = new Date(`${datePart}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - mondayOffset);
  let start = weekStart;
  let days = 7;

  if (granularity === 'biweek') {
    const anchor = new Date('1970-01-05T00:00:00Z');
    const weekIndex = Math.floor((weekStart - anchor) / 604800000);
    start = new Date(anchor);
    start.setUTCDate(anchor.getUTCDate() + Math.floor(weekIndex / 2) * 14);
    days = 14;
  }

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + days - 1);
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function dimensionValue(record, key, timeGranularity) {
  return key === 'time' ? timeBucket(record.time ?? record.date, timeGranularity) : record[key];
}

function orderedValues(records, key, timeGranularity) {
  if (!key) return ['__all'];
  const present = new Set(records.map((record) => dimensionValue(record, key, timeGranularity)));
  const configured = DIMENSIONS[key]?.options ?? [];
  const values = [
    ...configured.filter((value) => present.has(value)),
    ...[...present].filter((value) => !configured.includes(value)),
  ];
  return key === 'time' ? values.sort() : values;
}

export function buildQuery(records, config) {
  const metricKeys = (config.metrics ?? []).filter((key) => METRICS[key]);
  const rowKeys = (config.rowDimensions ?? []).filter((key) => DIMENSIONS[key]).slice(0, 6);
  const columnKey = DIMENSIONS[config.columnDimension] && !rowKeys.includes(config.columnDimension)
    ? config.columnDimension
    : null;
  const timeGranularity = ['hour', 'day', 'week', 'biweek', 'month'].includes(config.timeGranularity)
    ? config.timeGranularity
    : 'day';
  const filtered = applyFilters(records, config.filters, config.dateRange);
  const columnKeys = orderedValues(filtered, columnKey, timeGranularity);
  const groups = new Map();

  for (const record of filtered) {
    const labels = rowKeys.length ? rowKeys.map((key) => dimensionValue(record, key, timeGranularity)) : ['全部'];
    const groupId = JSON.stringify(labels);
    if (!groups.has(groupId)) groups.set(groupId, { labels, records: [] });
    groups.get(groupId).records.push(record);
  }

  const rows = [...groups.values()].map((group) => {
    const values = {};
    if (columnKey) {
      for (const columnValue of columnKeys) {
        const bucket = group.records.filter((record) => dimensionValue(record, columnKey, timeGranularity) === columnValue);
        if (bucket.length) values[columnValue] = aggregate(bucket, metricKeys);
      }
    } else {
      values.__all = aggregate(group.records, metricKeys);
    }
    return { labels: group.labels, values, recordCount: group.records.length };
  });

  const totals = {};
  if (columnKey) {
    for (const columnValue of columnKeys) {
      totals[columnValue] = aggregate(filtered.filter((record) => dimensionValue(record, columnKey, timeGranularity) === columnValue), metricKeys);
    }
  } else {
    totals.__all = aggregate(filtered, metricKeys);
  }

  return {
    rowKeys,
    columnKey,
    columnKeys,
    metrics: metricKeys,
    rows,
    totals,
    matchedRecords: filtered.length,
  };
}

export function sortRows(rows, sort) {
  if (!sort?.direction) return [...rows];
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
  const valueOf = (row) => sort.kind === 'dimension'
    ? row.labels[sort.index]
    : row.values.__all?.[sort.key];

  return [...rows].sort((leftRow, rightRow) => {
    const left = valueOf(leftRow);
    const right = valueOf(rightRow);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : collator.compare(String(left), String(right));
    return sort.direction === 'desc' ? -comparison : comparison;
  });
}

export function buildTrendSeries(records, config, metricKeys, dimensionKeys = []) {
  const metricList = (Array.isArray(metricKeys) ? metricKeys : [metricKeys]).filter((key) => METRICS[key]);
  const dimensionList = (Array.isArray(dimensionKeys) ? dimensionKeys : [dimensionKeys])
    .filter((key) => key && key !== 'time' && DIMENSIONS[key]);
  if (!metricList.length) return { periods: [], series: [] };

  const result = buildQuery(records, {
    ...config,
    metrics: metricList,
    rowDimensions: ['time', ...dimensionList],
    columnDimension: null,
  });
  const periods = [...new Set(result.rows.map((row) => row.labels[0]))].sort();
  const seriesGroups = dimensionList.length
    ? [...new Set(result.rows.map((row) => JSON.stringify(row.labels.slice(1))))].map(JSON.parse)
    : [[]];

  return {
    periods,
    series: metricList.flatMap((metricKey) => seriesGroups.map((dimensionLabels) => ({
      name: buildTrendSeriesName(metricKey, dimensionList, dimensionLabels),
      metricKey,
      dimensionLabels,
      values: periods.map((period) => {
        const row = result.rows.find((item) => item.labels[0] === period
          && dimensionLabels.every((label, index) => item.labels[index + 1] === label));
        return row?.values.__all?.[metricKey] ?? 0;
      }),
    }))),
  };
}

export function buildMovingAverages(series, periods, windows) {
  return windows.map((window) => ({
    ...series,
    name: `${series.name} · MA${window}`,
    movingAverageWindow: window,
    values: periods.map((_, index) => {
      if (index + 1 < window) return null;
      const slice = series.values.slice(index + 1 - window, index + 1);
      return slice.reduce((sum, value) => sum + value, 0) / window;
    }),
  }));
}

export function summarizeTrend(series, periods = []) {
  const usable = series.values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Number.isFinite(value));
  if (!usable.length) {
    return { current: null, previous: null, change: null, changeRate: null, minimum: null, maximum: null, peakPeriod: null };
  }

  const latest = usable.at(-1);
  const previous = usable.at(-2)?.value ?? null;
  const maximum = Math.max(...usable.map(({ value }) => value));
  const peak = usable.find(({ value }) => value === maximum);
  return {
    current: latest.value,
    previous,
    change: previous == null ? null : latest.value - previous,
    changeRate: previous == null || previous === 0 ? null : (latest.value - previous) / previous,
    minimum: Math.min(...usable.map(({ value }) => value)),
    maximum,
    peakPeriod: periods[peak.index] ?? null,
  };
}

function buildTrendSeriesName(metricKey, dimensionList, dimensionLabels) {
  const metricName = METRICS[metricKey].label;
  if (!dimensionList.length) return metricName;
  return `${metricName} · ${dimensionLabels.join(' / ')}`;
}

export function clampTimeWindow(total, requestedStart, requestedLength) {
  if (total <= 0) return { start: 0, end: -1 };
  const minimum = Math.min(3, total);
  const length = Math.min(total, Math.max(minimum, Math.round(requestedLength)));
  const start = Math.min(Math.max(0, Math.round(requestedStart)), total - length);
  return { start, end: start + length - 1 };
}
