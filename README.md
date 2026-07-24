# Fifi 工具站

一个收纳个人网页工具和轻量小游戏的小站，使用蛋白表情包作为统一的视觉角色。

在线访问：[https://olafifi.github.io/fifi-tools/](https://olafifi.github.io/fifi-tools/)

## 现有内容

### 实用工具

- [FIFI 图片处理](https://olafifi.github.io/ui-image-processor/)：在浏览器本地完成抠图、裁剪、格式转换和批量导出。
- [FIFI-Richly](https://olafifi.github.io/rich-text-translator/)：可视化编辑富文本，并同步生成便于复制的标签。

### 智力检测站

- 2048
- 数独
- 俄罗斯方块
- 贪吃蛇
- 合成大蛋白

小游戏会在站内悬浮窗口中打开，不会跳离首页。桌面和手机端均使用响应式布局。

## 合成大蛋白排行榜

“合成大蛋白”支持全站最高分排行榜。排行榜服务采用 Cloudflare Workers + D1 免费套餐，独立部署后通过 `VITE_LEADERBOARD_API_BASE` 接入前端。

服务端的本地测试、免费部署、备份和恢复说明见 [排行榜服务说明](server/leaderboard/README.md)。排行榜不可用时只会隐藏提交入口，不影响游戏继续运行。

## 本地运行

建议使用 Node.js 24。

```bash
npm ci
npm run dev
```

开发服务器启动后，根据终端提示在浏览器中打开页面。

## 测试与构建

```bash
npm test -- --run
npm run test:games
npm run build
npm run e2e
npm test --prefix server/leaderboard
```

## 发布

首页通过 GitHub Actions 发布到 GitHub Pages。正式发布前需要在仓库变量中配置可用的 `LEADERBOARD_API_BASE`；发布流程会验证 HTTPS、健康状态和跨域许可，避免上线无法使用的排行榜。

## 第三方项目

部分小游戏基于开源项目进行本地化适配。来源、固定版本和许可证信息见 [第三方声明](THIRD_PARTY_NOTICES.md)，完整许可证文本保存在 `public/games/licenses/`。
