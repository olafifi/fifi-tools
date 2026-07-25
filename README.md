# FIFI Lab · 菲菲实验站

一些能让生活省点力气的小实验。

FIFI Lab 是一个收纳个人网页工具、轻量小游戏和日常小功能的实验站。首页采用全屏交互布局：左侧集中放置“智力检测站”，中间展示工具的真实界面缩略图，背景会随鼠标产生流动反馈，左下角还有一个可以拖拽开合的拉链待办清单。

在线访问：[https://olafifi.github.io/fifi-tools/](https://olafifi.github.io/fifi-tools/)

## 站内内容

### 网页工具

- [FiFi 图片处理工具](https://olafifi.github.io/ui-image-processor/)：通过真实网页缩略图进入，适合进行图片加框、裁剪、格式转换和批量导出。
- [FiFi 富文本转换](https://olafifi.github.io/rich-text-translator/)：通过真实网页缩略图进入，用于可视化编辑和转换富文本内容。

点击工具卡片后，缩略图会先放大，再自然过渡到工具页面，避免新页面突然闪现。

### 智力检测站

- 2048
- 数独
- 俄罗斯方块
- 贪吃蛇
- 合成大蛋白

五个游戏都在首页同一区域中展示，并在站内悬浮窗口里打开，不会离开首页。“合成大蛋白”使用蛋白表情作为游戏等级形象，其余传统游戏使用与玩法更匹配的定制图标。

### 拉链待办清单

- 点击拉链，或沿弧线拖动拉链头，即可展开和收回。
- 最多保存 8 条待办，每条最多 50 个字符。
- 勾选后会计入完成数量；数据只保存在当前浏览器的本地存储中。
- 收回时只保留贴合弧线的标题、总待办数和完成数，不会直接展示任务正文。

## 合成大蛋白排行榜

“合成大蛋白”支持全站最高分排行榜。服务端采用 Cloudflare Workers + D1，并遵循免费额度优先的部署方式。排行榜只保存玩家填写的昵称、最高分和达成时间；接口不可用时会隐藏提交入口，但不影响单机游戏。

服务端的部署、迁移、备份和恢复说明见 [排行榜服务说明](server/leaderboard/README.md)。前端通过仓库变量 `LEADERBOARD_API_BASE` 接入服务。

## 本地运行

建议使用 Node.js 22 或更高版本。

```bash
npm ci
npm run dev
```

开发服务启动后，按照终端提示在浏览器中打开本地地址。

## 测试与构建

```bash
npm test
npm run test:games
npm run build
npm run e2e
npm test --prefix server/leaderboard
```

## 发布

`main` 分支更新后，GitHub Actions 会构建并发布到 GitHub Pages。发布流程会检查排行榜接口的 HTTPS 地址、健康状态和跨域许可；仓库变量 `LEADERBOARD_API_BASE` 必须填写为 Worker 的 HTTPS origin，不能包含路径或末尾斜杠。

## 第三方项目

部分小游戏基于开源项目进行本地化适配。来源、固定版本和许可证信息见 [第三方声明](THIRD_PARTY_NOTICES.md)，完整许可证文本保存在 `public/games/licenses/`。
