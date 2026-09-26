# AI 工具使用与产品迭代说明

提交人 youngbayia    对应项目 ECHO WAVE    功能验收基线 00540d5

本人主导产品目标、关键取舍与体验反馈；AI 协助完成图像、代码、测试及文档制作。以下将工具产出与本人提出的修改分开说明，便于核验实际工作。

## 01 工具分工与使用边界

| 工具 | 实际用途 | 约束与验收重点 |
| --- | --- | --- |
| Codex | 协助产品梳理、前端与接口代码、调试、自动化检查及文档整理。 | 定义目标、选择方案，提出修改与验收要求。 |
| OpenAI ImageGen | 生成四张人格视觉底图，作为海报的预生成素材。 | 要求人格差异可见，保留文字排版空间。 |
| brainstorming / ui-ux-pro-max | 分别辅助玩法推演与页面视觉规范；属于辅助工作流。 | 选择现场共创方向，保留简短输入流程。 |
| 非 AI 配套工具 | Canvas 合成；GitHub Pages 发布；Supabase 共享声波；Playwright 模拟浏览器检查。 | 区分模型能力、程序逻辑、数据服务与测试证据。 |

## 02 关键提示词与约束设计

产品指令  “以现场共创感为记忆点，保留昵称与一句话；让四种音乐人格在视觉上有明显差异，并让其他访客也能看到新提交的声波。”

以上按本人在对话中的实际要求整理，便于复用，并非逐字日志。

底图统一约束  Vertical 3:4 personalized music festival poster artwork layer; tactile editorial screenprint texture; lower 35% calm and dark for text; no text, logos, people, QR codes or watermarks.

人格变量  夜行节拍：sculptural sound waves、luminous orbital form；心动合唱：translucent vocal ribbons、collective bloom；日落漫游：glowing sun、soundwave horizon；自由电波：broken radio signal、jagged zigzags、ripped paper。

底图英文片段摘自项目 AI_USAGE.md。统一约束负责风格与留白，人格变量负责视觉差异；文字和品牌署名由程序叠加，降低 AI 错字与排版失控风险。

## 03 对 AIGC 能力的准确表述

当前线上流程采用“AI 预生成素材＋程序个性化合成”，没有在每次用户点击时请求生图模型。声波由人格与随机种子生成，并非采集或分析真实音频；音乐人格也是自选表达标签。

# 本人主导的关键修改

以下“本人主导”指提出问题、选择方向与明确验收重点；实现与自动化验证由 AI 协助执行。

## 01 用现场共创建立参与理由

我选择“现场共创感”作为产品记忆点，并要求保留昵称与一句话输入。围绕这一方向，AI 协助实现全场共振谱、个人声波编号和汇入动效，让每次生成都对公共作品产生可见贡献。

## 02 将人格差异落实到视觉

我指出四种人格仅有文字差别，要求视觉也有辨识度。修改后，每种人格拥有独立底图、主色、图形母题与声波轮廓，且选择时可预览。验收依据是画面变化，而非标签数量。

## 03 把单机演示推进到跨设备共创

我追问他人的声波能否展示，并在纯前端方案与可写后端之间选择 Supabase 免费项目。AI 协助完成共享表、受限读写和公开部署；网页每 5 秒获取共享数据，公共表不收昵称或原句。

## 04 用手机体验暴露交付问题

我在安卓 Chrome 反馈“保存完全没有反应”。AI 据此将脚本模拟点击图片链接改为用户直接点击可下载文件链接，并保留长按图片保存提示。模拟浏览器回归通过；尚无修复后的安卓真机复测记录。

## 05 修正共振谱的视觉偏置

我发现声波集中在右侧与下方。定位后将受限角度改为按黄金角沿圆周分布，并左移圆心；桌面与手机截图检查确认现有 9 条声波覆盖四个方向。这 9 条仅为测试记录，不代表用户规模。

## 验收依据与下一阶段优先级

可复核证据：源代码包含 3 项 JavaScript 测试与 2 项 Python 测试，均通过；保存流程在 Pixel 7 与 iPhone 13 模拟环境检查，线上页面及共享接口已验证。模拟测试不等于真机覆盖，当前也未完成正式活动的并发压测与运营转化验证。

下一阶段优先补服务端审核、限流反刷、限时分享令牌、会话硬上限及权益核销，再接入运行时生图。先用完成率、手机页到达率和 P95 占屏时长评估是否值得增加模型成本与等待时间。

## 评审复现路径

设备 A 保留待机屏，设备 B 选择人格、风格并填写文字；生成后查看声波编号与汇入反馈，观察 A 的下一轮同步，再扫码检查手机页与保存入口。云端暂不可用时海报仍可生成，但不计为共创成功。

在线原型  https://youngbayi666-star.github.io/ai_products/music_festival/

源代码  https://github.com/youngbayi666-star/ai_products/tree/main/music_festival

## 图像提示词原始记录节选

统一约束：`Vertical 3:4 personalized music festival poster artwork layer; tactile editorial screenprint texture; lower 35% calm and dark for text; no text, logos, people, QR codes or watermarks.`

- **夜行节拍**：`Sculptural sound waves and a luminous orbital form at a night electronic festival; ultraviolet, cobalt, coral and acid yellow on midnight navy.`
- **心动合唱**：`Luminous translucent vocal ribbons intertwining into a collective bloom; coral, peach, fuchsia and aqua on aubergine.`
- **日落漫游**：`A huge glowing sun, layered landscape and long sinuous soundwave horizon; analog film and risograph; amber, persimmon, mauve and plum.`
- **自由电波**：`Rebellious broken radio signal, jagged zigzags, ripped paper and interference grid; cyan, chartreuse, ultraviolet and navy.`

正式版的逐人背景提示词可加入审核后的 `{音乐人格}`、`{视觉风格}`、`{情绪}`，并强制“不生成文字或商标，底部保留排版空间”；**本原型没有接入运行时生图模型**。
