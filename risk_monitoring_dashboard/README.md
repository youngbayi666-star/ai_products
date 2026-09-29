# Risk Monitoring Dashboard

风险监控分析工作台原型，包含数据透视和趋势分析两个视图，使用浏览器端仿真数据运行。

## 在线访问

- [打开风险监控工作台](https://youngbayi666-star.github.io/ai_products/risk_monitoring_dashboard/)
- [直接打开趋势分析](https://youngbayi666-star.github.io/ai_products/risk_monitoring_dashboard/trend.html)

## 功能

- 自由选择支付链路指标与分析维度
- 使用多维透视表查看聚合结果
- 可开启自动查询，在字段、筛选或日期变化后自动刷新结果
- 使用小时、日、周、双周和月粒度观察指标趋势
- 支持 MA3、MA7、MA30
- 支持趋势图缩放、拖动、图例筛选和悬停查看
- 支持桌面端与窄屏布局

## 本地运行

项目为纯静态应用。进入本目录后启动任意静态文件服务器：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000/`。

## 测试

需要 Node.js 18 或更高版本：

```bash
npm test
```

## 目录结构

```text
risk_monitoring_dashboard/
├── index.html          # 数据透视
├── trend.html          # 趋势分析
├── css/                # 页面样式
├── js/                 # 数据模型与交互逻辑
├── tests/              # Node.js 测试
├── package.json
└── README.md
```

## 数据说明

当前版本仅使用确定性仿真数据，不连接生产数据，也不会上传用户输入。数据覆盖 2026 年 6 月 1 日至 9 月 29 日，并模拟工作日与小时峰谷、业务增长、支付方式和站点差异，以及用于趋势定位的阶段性风险波动。
