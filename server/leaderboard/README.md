# FIFI Lab 全站排行榜服务

这个目录是一套独立的 Cloudflare Worker + D1 排行榜，只保存“合成大蛋白”的昵称、最高分和达成时间。它不保存账号、Cookie 或设备编号；用于提交限流的来源地址会先经过 HMAC，再写入短期窗口表。

服务使用 Cloudflare Workers Free 和 D1 免费额度，不需要腾讯 Lighthouse，也不应开启 Workers Paid。达到免费额度或服务临时不可用时，网页会显示“排行榜暂时休息”，游戏本身仍可继续。

## 本地安装与测试

建议使用 Node.js 22 或更高版本。在本目录执行：

```bash
npm ci
npm test
```

本地 D1 数据保存在被忽略的 `.wrangler/` 目录。`vitest` 会自动应用 `migrations/` 中的数据库迁移，不会访问线上数据。

需要启动本地 Worker 时，先在 `server/leaderboard/.dev.vars` 写入仅供本地使用的随机值：

```text
SOURCE_HASH_SECRET=请替换为本地随机长字符串
```

然后执行：

```bash
npm run migrate:local
npm run dev
```

`.dev.vars` 已被 Git 忽略，不能提交。

## 首次免费部署

先确认 Cloudflare 账户处于 Workers Free 套餐。任何要求购买套餐、绑定付费计划或开启按量计费的步骤都应停止。

```bash
npx wrangler login
npx wrangler whoami
npx wrangler d1 create fifi-leaderboard
```

创建命令会返回 D1 的 `database_id`。把这个 UUID 写入 `wrangler.jsonc` 的同名字段；D1 UUID 是公开配置，不是数据库密码。

为来源地址散列设置至少 32 字节的随机 secret。Wrangler 会加密保存它，不能把原值写入仓库：

```bash
npx wrangler secret put SOURCE_HASH_SECRET
```

应用迁移、运行测试并部署：

```bash
npm run migrate:remote
npm test
npm run deploy
```

部署成功后会得到一个 HTTPS `workers.dev` 地址。生产检查示例：

```bash
curl -i -H "Origin: https://olafifi.github.io" https://你的-worker地址/healthz
curl -i -H "Origin: https://olafifi.github.io" "https://你的-worker地址/api/v1/leaderboards/merge-danbai?limit=10"
```

两个响应都应为 HTTP 200，并包含：

```text
Access-Control-Allow-Origin: https://olafifi.github.io
```

最后在 GitHub 仓库 `olafifi/fifi-tools` 创建变量 `LEADERBOARD_API_BASE`，值为 Worker 的 HTTPS origin，不带路径和末尾斜杠。GitHub Pages 发布流程会先检查健康状态和跨域许可，再构建网站。

## 数据规则

- 每个规范化昵称只保存最高分；同分保留更早记录。
- 昵称为 1–12 个可见字素，禁止控制字符、不可见字符和网页标签符号。
- 分数必须是 0–1,000,000,000 的安全整数。
- 每个匿名来源五分钟最多提交十次。
- 生产跨域来源固定为 `https://olafifi.github.io`。

这是休闲小游戏排行榜，不提供竞技级反作弊保证。

## 备份

执行下面的命令即可，脚本会自动创建本地备份目录：

```bash
npm run backup
```

导出的 SQL 位于 `backups/fifi-leaderboard.sql`。`backups/` 已被 Git 忽略；请确认文件非空，并把需要长期保留的副本放到个人安全存储中。

## 恢复与回滚

D1 每次 migration 都保留迁移记录，新迁移应保持向前兼容，不在发布流程中删除现有表。需要恢复数据时，新建临时 D1 数据库并导入已验证的 SQL，检查无误后再调整 Worker binding，避免直接覆盖唯一的线上数据。

Worker 代码异常时在 Cloudflare 的部署版本中回滚到上一版本。排行榜回滚不需要重新发布游戏页面，只要 API 契约保持不变即可。
