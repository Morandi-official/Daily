# Daily

一个可部署到 Cloudflare Pages 的每日图片 + 按日期评论区项目。

## 已实现功能

- 主界面中央显示每日图片预留区。
- 图片下方是评论区。
- 发布评论前可选择角色 A / B / C。
- 点击图片左半边或「前一天」按钮切换到前一天。
- 点击图片右半边或「后一天」按钮切换到后一天；如果后一日还没到，按钮会禁用，点击无效。
- 评论按日期分开保存。
- 接入 Cloudflare D1 后，评论会保存在云端数据库；未接入 D1 时，会自动进入浏览器本地存储模式，仅自己可见。

## 文件结构

```text
Daily/
├── index.html                 # 页面结构
├── styles.css                 # 页面样式
├── app.js                     # 前端逻辑
├── functions/api/comments.js  # Cloudflare Pages Functions 评论 API
├── data/days.json             # 每日图片配置
├── images/placeholder.svg     # 默认占位图片
├── schema.sql                 # D1 数据库表结构
├── wrangler.toml              # 可选 Wrangler 配置
└── README.md
```

## 1. 修改每日图片

把图片放进 `images` 文件夹，例如：

```text
images/2026-05-22.jpg
```

然后编辑 `data/days.json`：

```json
{
  "2026-05-22": {
    "image": "/images/2026-05-22.jpg",
    "alt": "这一天的图片说明",
    "caption": "这一天图片下方的文字"
  }
}
```

没有配置的日期会自动显示默认占位图。

## 2. 部署到 Cloudflare Pages

在 Cloudflare：

1. 进入 **Workers & Pages**。
2. 点击 **Create application**。
3. 选择 **Pages**。
4. 选择 **Connect GitHub**，授权后选择 `Daily` 仓库。
5. 部署配置建议如下：

```text
Project name: daily
Production branch: main
Build command: exit 0
Build output directory: /
Root directory: /
```

部署完成后，Cloudflare 会给你一个 `*.pages.dev` 网址。

## 3. 开启云端评论存储：绑定 D1

如果不绑定 D1，网站也能打开，但评论只会保存在当前浏览器里，别人看不到。

要让评论真正保存在云端：

1. 在 Cloudflare 进入 **D1 SQL Database**。
2. 创建数据库，名字建议：`daily-db`。
3. 回到 Pages 项目 `daily`。
4. 进入 **Settings → Bindings**。
5. 添加 **D1 database binding**。
6. 变量名必须写：`DB`。
7. 选择刚创建的 `daily-db`。
8. 保存后重新部署项目。

项目中的 `functions/api/comments.js` 会自动创建评论表。如果你想手动建表，也可以在 D1 的控制台执行 `schema.sql`。

## 4. 绑定你的自定义域名

Pages 项目部署成功后，在 Pages 项目中进入 **Custom domains**，添加你在 DigitalPlat + Cloudflare 配好的域名，例如：

```text
你的域名.dpdns.org
```

然后按 Cloudflare 提示完成 DNS 记录即可。

## 5. 本地预览

安装 Node.js 后，在项目目录运行：

```bash
npx wrangler pages dev .
```
