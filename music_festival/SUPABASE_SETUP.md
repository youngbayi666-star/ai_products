# 启用跨设备「全场共振谱」

GitHub Pages 可以托管全部前端代码。所有人的声波要出现在同一张大屏上，还需要一个共同数据源；这里使用 Supabase 的浏览器直连 REST API，无须自己部署常驻服务器。

**当前公开版已完成下列配置。** 本文保留为复现、迁移与安全检查说明。

1. 在 [Supabase](https://supabase.com/dashboard) 登录并创建免费项目。
2. 打开项目的 **SQL Editor**，执行 [`supabase/setup.sql`](supabase/setup.sql)。它只创建匿名声波表及读取、添加权限；访客不能修改或删除记录。
3. 在项目 **Connect** 或 **Settings → API Keys** 复制 Project URL 和 **publishable key**（`sb_publishable_...`）。只把这两项填到 [`supabase-config.js`](supabase-config.js)；绝不要使用 secret 或 service_role key。
4. 提交并推送 `supabase-config.js`，刷新 GitHub Pages。两台设备打开同一公开网址，在一台生成海报，另一台待机屏最多约 5 秒后出现新增声波。

未填连接信息时，GitHub Pages 自动进入**单浏览器演示模式**：海报、二维码、扫码分享均可使用；声波只保存在当前浏览器，不会向其他设备同步。网页会明确显示此限制。

公开数据库只收 `persona`、`style`、`seed`，自动生成编号与时间，不接收昵称或一句话。匿名写入适合面试演示；真实音乐节仍需增加限流、反刷、内容审核和数据清理。Supabase 免费项目闲置一段时间可能暂停，演示前请检查项目状态。
