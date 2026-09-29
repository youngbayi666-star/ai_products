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

const weightedPick = (items, weights, random) => {
  let cursor = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return items[index];
  }
  return items.at(-1);
};

export function createMockRecords(count = 14520) {
  const random = mulberry32(20260921);
  const records = [];
  const start = new Date('2026-06-01T00:00:00Z');
  const end = new Date('2026-09-29T00:00:00Z');
  const days = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    days.push(new Date(date));
  }
  const dayWeights = days.map((date, index) => {
    const day = date.getUTCDay();
    const weekdayFactor = day === 0 ? 0.7 : day === 6 ? 0.8 : day === 5 ? 0.96 : 1;
    const growthFactor = 0.86 + 0.28 * index / Math.max(1, days.length - 1);
    const fortnightSeasonality = 1 + 0.045 * Math.sin(index * Math.PI / 7);
    const paydayLift = [1, 15, 25].includes(date.getUTCDate()) ? 1.08 : 1;
    return weekdayFactor * growthFactor * fortnightSeasonality * paydayLift;
  });
  const totalWeight = dayWeights.reduce((sum, weight) => sum + weight, 0);
  const dailyCounts = dayWeights.map((weight) => Math.floor(count * weight / totalWeight));
  for (let remainder = count - dailyCounts.reduce((sum, value) => sum + value, 0), index = 0; remainder > 0; remainder -= 1, index += 1) {
    dailyCounts[index % dailyCounts.length] += 1;
  }

  const hourWeights = [2, 1, 1, 1, 1, 2, 4, 7, 11, 15, 18, 21, 24, 25, 23, 22, 24, 28, 33, 37, 40, 35, 23, 11];
  const countryWeights = [39, 21, 18, 9, 8, 5];
  const categoryWeights = [26, 23, 18, 17, 16];
  const paymentWeightsByCountry = {
    英国: [22, 15, 10, 2, 43, 5, 3],
    法国: [23, 12, 9, 3, 45, 5, 3],
    德国: [19, 9, 8, 2, 42, 8, 12],
    荷兰: [21, 10, 8, 3, 42, 9, 7],
    比利时: [22, 10, 8, 3, 44, 7, 6],
    卢森堡: [24, 11, 8, 2, 45, 5, 5],
  };

  let globalIndex = 0;
  days.forEach((day, dayIndex) => {
    const date = day.toISOString().slice(0, 10);
    const progress = dayIndex / Math.max(1, days.length - 1);
    for (let dayRecord = 0; dayRecord < dailyCounts[dayIndex]; dayRecord += 1) {
      const newCustomerRate = 0.41 - 0.07 * progress;
      const customerType = random() < newCustomerRate ? '新客' : '老客';
      const country = weightedPick(DIMENSIONS.country.options, countryWeights, random);
      const category = weightedPick(DIMENSIONS.category.options, categoryWeights, random);
      const paymentMethod = weightedPick(DIMENSIONS.paymentMethod.options, paymentWeightsByCountry[country], random);
      const highAmountRate = {
        手机通讯: 0.43,
        电脑办公: 0.5,
        家用电器: 0.34,
        美妆个护: 0.12,
        运动户外: 0.18,
      }[category] + (customerType === '老客' ? 0.025 : 0);
      const amountBand = random() < highAmountRate ? '€500以上' : '€500以下';
      const userId = `U${String(Math.floor(globalIndex * 0.78) + 10001)}`;
      const registered = customerType === '新客' && random() < 0.7 ? 1 : 0;
      const hour = String(weightedPick([...Array(24).keys()], hourWeights, random)).padStart(2, '0');
      const minute = String(Math.floor(random() * 60)).padStart(2, '0');

      const isHighAmount = amountBand === '€500以上';
      const isNewCustomer = customerType === '新客';
      const initRate = 0.016 + (isNewCustomer ? 0.008 : 0) + (isHighAmount ? 0.007 : 0) + (paymentMethod === 'Card' ? 0.004 : 0);
      const retailRate = 0.022 + (isNewCustomer ? 0.019 : 0) + (isHighAmount ? 0.014 : 0);
      const techIncident = date >= '2026-08-20' && date <= '2026-08-26' && isNewCustomer && isHighAmount;
      const techRate = 0.03 + (isNewCustomer ? 0.021 : 0) + (isHighAmount ? 0.02 : 0) + (techIncident ? 0.1 : 0);
      const threeDsIncident = date >= '2026-07-12' && date <= '2026-07-18' && country === '英国' && paymentMethod === 'Card';
      const threeDsRate = 0.02 + (paymentMethod === 'Card' ? 0.025 : 0) + (isNewCustomer ? 0.008 : 0) + (country === '英国' || country === '法国' ? 0.008 : 0) + (threeDsIncident ? 0.13 : 0);
      const payingIncident = date >= '2026-09-10' && date <= '2026-09-14' && country === '法国' && paymentMethod === 'PayPal';
      const payingRate = 0.026 + (isHighAmount ? 0.007 : 0) + (paymentMethod === 'Riverty' ? 0.01 : 0) + (payingIncident ? 0.09 : 0);

      const initLoss = random() < initRate ? 1 : 0;
      const retailRiskLoss = !initLoss && random() < retailRate ? 1 : 0;
      const techRiskLoss = !initLoss && !retailRiskLoss && random() < techRate ? 1 : 0;
      const threeDsLoss = !initLoss && !retailRiskLoss && !techRiskLoss && random() < threeDsRate ? 1 : 0;
      const payingLoss = !initLoss && !retailRiskLoss && !techRiskLoss && !threeDsLoss && random() < payingRate ? 1 : 0;
      const success = initLoss || retailRiskLoss || techRiskLoss || threeDsLoss || payingLoss ? 0 : 1;

      records.push({
        orderId: `O${String(globalIndex + 1).padStart(6, '0')}`,
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
      globalIndex += 1;
    }
  });

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
