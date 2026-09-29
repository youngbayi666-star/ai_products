import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIMENSIONS,
  METRICS,
  createMockRecords,
  buildQuery,
  sortRows,
  buildTrendSeries,
  buildMovingAverages,
  clampTimeWindow,
  summarizeTrend,
} from '../js/query-engine.js';

test('mock records are deterministic and expose every supported dimension', () => {
  const first = createMockRecords();
  const second = createMockRecords();

  assert.deepEqual(first, second);
  assert.ok(first.length > 100);
  for (const dimension of Object.keys(DIMENSIONS)) {
    assert.ok(first.every((record) => dimension in record));
  }
});

test('mock history covers June through September with enough daily volume', () => {
  const records = createMockRecords();
  const dates = records.map((record) => record.date).sort();

  assert.equal(dates[0], '2026-06-01');
  assert.equal(dates.at(-1), '2026-09-29');
  assert.ok(records.length >= 12000);
});

test('mock traffic follows realistic weekly and hourly demand patterns', () => {
  const records = createMockRecords();
  const weekday = records.filter((record) => {
    const day = new Date(`${record.date}T00:00:00Z`).getUTCDay();
    return day >= 1 && day <= 5;
  });
  const weekend = records.filter((record) => {
    const day = new Date(`${record.date}T00:00:00Z`).getUTCDay();
    return day === 0 || day === 6;
  });
  const weekdayDates = new Set(weekday.map((record) => record.date)).size;
  const weekendDates = new Set(weekend.map((record) => record.date)).size;
  const evening = records.filter((record) => Number(record.time.slice(11, 13)) >= 18 && Number(record.time.slice(11, 13)) <= 21).length;
  const overnight = records.filter((record) => Number(record.time.slice(11, 13)) >= 2 && Number(record.time.slice(11, 13)) <= 5).length;

  assert.ok(weekday.length / weekdayDates > weekend.length / weekendDates);
  assert.ok(evening > overnight * 2);
});

test('mock funnel keeps a credible success rate and includes a visible 3DS incident', () => {
  const records = createMockRecords();
  const successRate = records.filter((record) => record.success).length / records.length;
  const incident = records.filter((record) => record.date >= '2026-07-12' && record.date <= '2026-07-18' && record.country === '英国' && record.paymentMethod === 'Card');
  const baseline = records.filter((record) => record.date >= '2026-07-01' && record.date <= '2026-07-07' && record.country === '英国' && record.paymentMethod === 'Card');
  const incidentRate = incident.filter((record) => record.threeDsLoss).length / incident.length;
  const baselineRate = baseline.filter((record) => record.threeDsLoss).length / baseline.length;

  assert.ok(successRate > 0.72 && successRate < 0.92);
  assert.ok(incident.length > 50 && baseline.length > 50);
  assert.ok(incidentRate > baselineRate + 0.06);
  assert.ok(records.every((record) => ['initLoss', 'retailRiskLoss', 'techRiskLoss', 'threeDsLoss', 'payingLoss', 'success']
    .reduce((sum, field) => sum + Number(Boolean(record[field])), 0) === 1));
});

test('filters intersect across dimensions', () => {
  const records = [
    { userId: 'u1', customerType: '新客', country: '美国', amountBand: '小额', category: '手机通讯', paymentMethod: '信用卡', submitted: 1 },
    { userId: 'u2', customerType: '老客', country: '美国', amountBand: '小额', category: '手机通讯', paymentMethod: '信用卡', submitted: 1 },
    { userId: 'u3', customerType: '新客', country: '英国', amountBand: '小额', category: '手机通讯', paymentMethod: '信用卡', submitted: 1 },
  ];

  const result = buildQuery(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['customerType'],
    columnDimension: null,
    filters: { customerType: ['新客'], country: ['美国'] },
  });

  assert.equal(result.matchedRecords, 1);
  assert.equal(result.rows[0].values.__all.submittedOrders, 1);
});

test('DAU metrics count distinct users while order metrics count orders', () => {
  const records = [
    { userId: 'u1', country: '美国', submitted: 1, success: 1 },
    { userId: 'u1', country: '美国', submitted: 1, success: 1 },
    { userId: 'u2', country: '美国', submitted: 1, success: 0 },
  ];

  const result = buildQuery(records, {
    metrics: ['submittedOrders', 'submittedDau', 'successOrders', 'successDau'],
    rowDimensions: ['country'],
    columnDimension: null,
    filters: {},
  });

  const values = result.rows[0].values.__all;
  assert.equal(values.submittedOrders, 3);
  assert.equal(values.submittedDau, 2);
  assert.equal(values.successOrders, 2);
  assert.equal(values.successDau, 1);
});

test('multiple row dimensions form stable hierarchical groups', () => {
  const records = [
    { userId: 'u1', country: '美国', customerType: '新客', submitted: 1 },
    { userId: 'u2', country: '美国', customerType: '老客', submitted: 1 },
    { userId: 'u3', country: '英国', customerType: '新客', submitted: 1 },
  ];

  const result = buildQuery(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['country', 'customerType'],
    columnDimension: null,
    filters: {},
  });

  assert.deepEqual(result.rows.map((row) => row.labels), [
    ['美国', '新客'],
    ['美国', '老客'],
    ['英国', '新客'],
  ]);
});

test('column dimension produces one value bucket per selected category', () => {
  const records = [
    { userId: 'u1', country: '美国', customerType: '新客', submitted: 1 },
    { userId: 'u2', country: '美国', customerType: '老客', submitted: 1 },
    { userId: 'u3', country: '英国', customerType: '新客', submitted: 1 },
  ];

  const result = buildQuery(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['country'],
    columnDimension: 'customerType',
    filters: {},
  });

  assert.deepEqual(result.columnKeys, ['新客', '老客']);
  assert.equal(result.rows[0].values['新客'].submittedOrders, 1);
  assert.equal(result.rows[0].values['老客'].submittedOrders, 1);
  assert.equal(result.rows[1].values['老客'], undefined);
});

test('metric catalog includes every requested order and DAU metric', () => {
  assert.equal(Object.keys(METRICS).length, 15);
  assert.ok(Object.values(METRICS).every((metric) => metric.label && metric.kind && metric.field));
  assert.equal(METRICS.registeredDau.label, '注册 DAU');
  assert.equal(METRICS.registeredDau.kind, 'dau');
  assert.equal(METRICS.registeredDau.field, 'registered');
});

test('registered DAU counts distinct registered users', () => {
  const records = [
    { userId: 'u1', registered: 1 },
    { userId: 'u1', registered: 1 },
    { userId: 'u2', registered: 0 },
    { userId: 'u3', registered: 1 },
  ];

  const result = buildQuery(records, {
    metrics: ['registeredDau'],
    rowDimensions: [],
    columnDimension: null,
    filters: {},
  });

  assert.equal(result.rows[0].values.__all.registeredDau, 2);
});

test('filter catalogs match the requested countries, amount bands, and payment methods', () => {
  assert.deepEqual(DIMENSIONS.country.options, ['英国', '法国', '德国', '荷兰', '比利时', '卢森堡']);
  assert.deepEqual(DIMENSIONS.amountBand.options, ['€500以上', '€500以下']);
  assert.deepEqual(DIMENSIONS.paymentMethod.options, ['PayPal', 'ApplePay', 'GooglePay', 'WechatPay', 'Card', 'Klarna', 'Riverty']);

  const records = createMockRecords();
  for (const key of ['country', 'amountBand', 'paymentMethod']) {
    const present = new Set(records.map((record) => record[key]));
    assert.ok(DIMENSIONS[key].options.every((option) => present.has(option)));
  }
});

test('date range filters records inclusively before aggregation', () => {
  const records = [
    { userId: 'u1', date: '2026-08-01', country: '英国', submitted: 1 },
    { userId: 'u2', date: '2026-08-15', country: '英国', submitted: 1 },
    { userId: 'u3', date: '2026-08-30', country: '英国', submitted: 1 },
  ];

  const result = buildQuery(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['country'],
    columnDimension: null,
    filters: {},
    dateRange: { start: '2026-08-10', end: '2026-08-30' },
  });

  assert.equal(result.matchedRecords, 2);
  assert.equal(result.rows[0].values.__all.submittedOrders, 2);
});

test('time works as a row dimension at hourly, daily, weekly, biweekly, and monthly grains', () => {
  const records = [
    { userId: 'u1', date: '2026-08-01', submitted: 1 },
    { userId: 'u2', date: '2026-08-02', submitted: 1 },
    { userId: 'u3', date: '2026-08-03', submitted: 1 },
    { userId: 'u4', date: '2026-08-10', submitted: 1 },
    { userId: 'u5', date: '2026-08-15', submitted: 1 },
    { userId: 'u6', date: '2026-09-01', submitted: 1 },
  ];
  const rowCounts = {};

  for (const grain of ['hour', 'day', 'week', 'biweek', 'month']) {
    const result = buildQuery(records, {
      metrics: ['submittedOrders'],
      rowDimensions: ['time'],
      columnDimension: null,
      timeGranularity: grain,
      filters: {},
    });
    rowCounts[grain] = result.rows.length;
    assert.equal(result.rows.reduce((sum, row) => sum + row.values.__all.submittedOrders, 0), 6);
  }

  assert.deepEqual(rowCounts, { hour: 6, day: 6, week: 4, biweek: 3, month: 2 });
});

test('hourly buckets preserve event hour and aggregate records within that hour', () => {
  const records = [
    { userId: 'u1', date: '2026-08-01', time: '2026-08-01 09:05', submitted: 1 },
    { userId: 'u2', date: '2026-08-01', time: '2026-08-01 09:58', submitted: 1 },
    { userId: 'u3', date: '2026-08-01', time: '2026-08-01 10:02', submitted: 1 },
  ];
  const result = buildQuery(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['time'],
    columnDimension: null,
    timeGranularity: 'hour',
    filters: {},
  });

  assert.deepEqual(result.rows.map((row) => row.labels[0]), ['2026-08-01 09:00', '2026-08-01 10:00']);
  assert.deepEqual(result.rows.map((row) => row.values.__all.submittedOrders), [2, 1]);
});

test('trend grouping keeps all five business dimensions alongside time', () => {
  const record = {
    userId: 'u1', date: '2026-08-01', time: '2026-08-01 09:00', submitted: 1,
    customerType: '新客', country: '英国', amountBand: '€500以下', category: '手机通讯', paymentMethod: 'Card',
  };
  const model = buildTrendSeries([record], {
    filters: {},
    timeGranularity: 'hour',
  }, ['submittedOrders'], ['customerType', 'country', 'amountBand', 'category', 'paymentMethod']);

  assert.deepEqual(model.periods, ['2026-08-01 09:00']);
  assert.deepEqual(model.series[0].dimensionLabels, ['新客', '英国', '€500以下', '手机通讯', 'Card']);
});

test('table rows sort by dimension text or metric value in either direction', () => {
  const rows = [
    { labels: ['老客'], values: { __all: { submittedOrders: 8 } } },
    { labels: ['新客'], values: { __all: { submittedOrders: 21 } } },
    { labels: ['访客'], values: { __all: { submittedOrders: 3 } } },
  ];

  assert.deepEqual(
    sortRows(rows, { kind: 'metric', key: 'submittedOrders', direction: 'asc' }).map((row) => row.values.__all.submittedOrders),
    [3, 8, 21],
  );
  assert.deepEqual(
    sortRows(rows, { kind: 'metric', key: 'submittedOrders', direction: 'desc' }).map((row) => row.values.__all.submittedOrders),
    [21, 8, 3],
  );
  assert.deepEqual(
    sortRows(rows, { kind: 'dimension', index: 0, direction: 'asc' }).map((row) => row.labels[0]),
    ['访客', '老客', '新客'],
  );
});

test('trend series use time on the x axis and split by a selected result dimension', () => {
  const records = [
    { userId: 'u1', date: '2026-08-01', customerType: '新客', submitted: 1 },
    { userId: 'u2', date: '2026-08-01', customerType: '老客', submitted: 1 },
    { userId: 'u3', date: '2026-08-02', customerType: '新客', submitted: 1 },
  ];
  const model = buildTrendSeries(records, {
    metrics: ['submittedOrders'],
    rowDimensions: ['customerType'],
    filters: {},
    timeGranularity: 'day',
  }, 'submittedOrders', 'customerType');

  assert.deepEqual(model.periods, ['2026-08-01', '2026-08-02']);
  assert.deepEqual(model.series.map((series) => series.name), ['提单订单量 · 新客', '提单订单量 · 老客']);
  assert.deepEqual(model.series[0].values, [1, 1]);
  assert.deepEqual(model.series[1].values, [1, 0]);
});

test('trend series support multiple metrics and multiple split dimensions', () => {
  const records = [
    { userId: 'u1', date: '2026-08-01', customerType: '新客', country: '英国', submitted: 1, success: 1 },
    { userId: 'u2', date: '2026-08-01', customerType: '老客', country: '美国', submitted: 1, success: 0 },
    { userId: 'u3', date: '2026-08-02', customerType: '新客', country: '英国', submitted: 1, success: 0 },
  ];

  const model = buildTrendSeries(records, {
    metrics: ['submittedOrders', 'successOrders'],
    rowDimensions: ['customerType', 'country'],
    filters: {},
    timeGranularity: 'day',
  }, ['submittedOrders', 'successOrders'], ['customerType', 'country']);

  assert.deepEqual(model.periods, ['2026-08-01', '2026-08-02']);
  assert.equal(model.series.length, 4);
  assert.deepEqual(model.series.map((series) => series.dimensionLabels), [
    ['新客', '英国'],
    ['老客', '美国'],
    ['新客', '英国'],
    ['老客', '美国'],
  ]);
  assert.deepEqual(model.series.map((series) => series.metricKey), [
    'submittedOrders',
    'submittedOrders',
    'successOrders',
    'successOrders',
  ]);
  assert.deepEqual(model.series[0].values, [1, 1]);
  assert.deepEqual(model.series[1].values, [1, 0]);
  assert.deepEqual(model.series[2].values, [1, 0]);
  assert.deepEqual(model.series[3].values, [0, 0]);
});

test('chart time windows never move beyond the current query range', () => {
  assert.deepEqual(clampTimeWindow(30, -5, 40), { start: 0, end: 29 });
  assert.deepEqual(clampTimeWindow(30, 28, 7), { start: 23, end: 29 });
  assert.deepEqual(clampTimeWindow(30, 10, 1), { start: 10, end: 12 });
});

test('trend moving averages compute trailing 3, 7, and 30 day windows', () => {
  const periods = Array.from({ length: 35 }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`);
  const values = periods.map((_, index) => index + 1);
  const series = { name: '提单订单量', values };
  const movingAverages = buildMovingAverages(series, periods, [3, 7, 30]);

  assert.deepEqual(movingAverages.map((item) => item.movingAverageWindow), [3, 7, 30]);
  assert.deepEqual(movingAverages.map((item) => item.name), ['提单订单量 · MA3', '提单订单量 · MA7', '提单订单量 · MA30']);
  assert.equal(movingAverages[0].values[0], null);
  assert.equal(movingAverages[0].values[2], 2);
  assert.equal(movingAverages[1].values[6], 4);
  assert.equal(movingAverages[2].values[29], 15.5);
  assert.equal(movingAverages[2].values[34], 20.5);
});

test('trend summary compares the latest two usable periods and reports the visible range', () => {
  const summary = summarizeTrend({
    values: [null, 10, 15, 12],
  }, ['08-01', '08-02', '08-03', '08-04']);

  assert.deepEqual(summary, {
    current: 12,
    previous: 15,
    change: -3,
    changeRate: -0.2,
    minimum: 10,
    maximum: 15,
    peakPeriod: '08-03',
  });
});

test('trend summary handles a zero previous value without fabricating a rate', () => {
  const summary = summarizeTrend({ values: [0, 8] }, ['08-01', '08-02']);

  assert.equal(summary.current, 8);
  assert.equal(summary.previous, 0);
  assert.equal(summary.changeRate, null);
});
