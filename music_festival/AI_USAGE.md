# AI 工具使用说明

## 使用的工具与分工

- **Codex（GPT-6）**：协助产品结构、交互文案、网页与 Canvas 代码、匿名共振谱接口、测试和文档。
- **OpenAI 内置 ImageGen**：生成四张音乐人格底图，分别是 `assets/soundwave-art.png`、`assets/heart-chorus.png`、`assets/sunset-roam.png`、`assets/free-signal.png`。
- **ui-ux-pro-max**：参考大屏交互、暗色高对比视觉与触控可用性；最终页面按现场场景调整。

## 关键提示词（实际使用，节选）

统一约束：`Vertical 3:4 personalized music festival poster artwork layer; tactile editorial screenprint texture; lower 35% calm and dark for text; no text, logos, people, QR codes or watermarks.`

- **夜行节拍**：`Sculptural sound waves and a luminous orbital form at a night electronic festival; ultraviolet, cobalt, coral and acid yellow on midnight navy.`
- **心动合唱**：`Luminous translucent vocal ribbons intertwining into a collective bloom; coral, peach, fuchsia and aqua on aubergine.`
- **日落漫游**：`A huge glowing sun, layered landscape and long sinuous soundwave horizon; analog film and risograph; amber, persimmon, mauve and plum.`
- **自由电波**：`Rebellious broken radio signal, jagged zigzags, ripped paper and interference grid; cyan, chartreuse, ultraviolet and navy.`

正式版的逐人背景提示词可加入审核后的 `{音乐人格}`、`{视觉风格}`、`{情绪}`，并强制“不生成文字或商标，底部保留排版空间”；**本原型没有接入运行时生图模型**。

## 候选人主导的产品判断与待核对事项

候选人提出以「现场共创感」为记忆点，选定全场共振谱，并要求保留昵称和一句话输入；同时指出四种音乐人格需要真正不同的视觉，而非仅替换文案。实现据此增加四张底图、四种声波轮廓、匿名编号和加入动画。提交前请候选人亲自体验并确认这一段能准确代表自己的工作与判断。
