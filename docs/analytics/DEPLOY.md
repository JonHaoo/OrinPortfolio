# 访问监控模块 · 部署指南

个人作品集的轻量访问监控，三条组件构成：

| 组件 | 位置 | 作用 |
| --- | --- | --- |
| 埋点脚本 | `src/scripts/analytics.ts`（经 `Layout.astro` 全站注入） | 采集 PV / 停留时长 / 点击 / 滚动深度，批量上报 |
| 接收与查询 | `edge-functions/api/collect.js`、`edge-functions/api/stats.js` | EdgeOne 边缘函数；写入/读取 KV，服务端注入 IP 与归属地 |
| 监控看板 | `docs/analytics/dashboard.html` | 纯前端单文件，双击即用，看实时数据 |

数据落在腾讯云 EdgeOne KV（免费 1GB，按天分桶 `evt_YYYYMMDD`）。**不依赖任何第三方统计服务**，数据完全在自己账号里。

---

## 一、部署到 EdgeOne Makers（免费，国内访问稳定）

站点目前只有 GitHub Pages（大陆访问不稳）。把同一个仓库接入 EdgeOne Makers 后：站点托管、边缘函数、KV 三件事都解决，埋点与站点同源（`/api/collect`），无跨域问题。**GitHub Pages 原样保留**，两条发布渠道互不影响。

### 1. 创建项目（约 3 分钟）

1. 登录腾讯云 → 进入控制台 **[EdgeOne Pages](https://console.cloud.tencent.com/edgeone/pages)**（即 EdgeOne Makers）；免费版无需付费，开通即可
2. **创建项目 → 从 Git 导入**：授权 GitHub 后选择 `JonHaoo/OrinPortfolio` 仓库，分支 `main`
3. 构建配置：
   - 框架：`Astro`（或手动填写）
   - **构建命令**：`npm run build`
   - **输出目录**：`dist`
   - 环境变量：**不要**设置 `ASTRO_BASE`（保持 base 为 `/`，与 GitHub Pages 工作流的子路径模式不同，这是故意的）
4. 保存后自动构建，成功后获得默认域名，形如 `https://xxx.edgeone.app`（自带免费 SSL，大陆访问走腾讯边缘节点，这就是访客要访问的稳定地址）

### 2. 开通 KV 并绑定（约 2 分钟）

1. 控制台左侧 **存储 → KV 存储** → 开通 KV 账户（免费 1GB）
2. **创建命名空间**：名称随意（如 `orin_analytics`）
3. 打开**项目详情 → KV 存储 → 绑定命名空间**：
   - 选择命名空间 `orin_analytics`
   - **变量名必须填 `ANALYTICS_KV`**（与 `edge-functions/api/` 两个函数代码里的引用一致，填错会收到 `kv_not_bound` 提示）

### 3. 配置查询 Token

看板拿数据走 `/api/stats`，需要 token 鉴权：

1. 本地生成一串随机 token（示例）：

   ```bash
   openssl rand -hex 16
   ```

2. 项目详情 → **环境变量** → 新增：
   - 键：`ANALYTICS_TOKEN`
   - 值：上面生成的随机串（生产/预览环境都加）

`stats.js` 优先读环境变量；未配置时会明确报错提示，不会裸奔。

### 4. 发布与验证

1. 把本仓库最新代码 push 到 `main`（EdgeOne 随 Git 自动构建；`edge-functions/` 目录会被平台按路由规则 `/api/collect`、`/api/stats` 一并部署）
2. 打开 `https://xxx.edgeone.app/`，正常浏览几分钟（点几处、滚动、切页）
3. 验证链路（任选）：
   - 浏览器 DevTools → Network：应看到 `POST /api/collect` 返回 `{"ok":true}`
   - 或访问 `https://xxx.edgeone.app/api/stats?token=<你的token>&days=1`，应返回 JSON 事件列表
4. 双击打开 `docs/analytics/dashboard.html`：
   - 首次进入填写 API Base（`https://xxx.edgeone.app`）与 token，保存后即可看到数据
   - 配置存本机 localStorage，之后打开直连；「导出」按钮可把原始事件备份为 JSON

## 二、监控口径（看板怎么算的）

- **PV**：页面加载/软导航进入（`ty=pv`）
- **UV**：独立访客 `vid`（localStorage 持久），清缓存或换设备会重复计数
- **会话**：`sid`，30 分钟无事件切新会话（与主流统计工具口径一致）
- **停留时长**：只累计前台可见时间（切后台暂停）；页面离开/切换前经 `sendBeacon` 上报，极端断网可能丢失最后一次上报
- **点击**：a/button 等交互元素；元素加 `data-track="名称"` 可自定义显示名（优先级最高）；同页 800ms 节流
- **IP / 归属地 / 运营商**：由边缘函数从 `request.eo` 注入（EdgeOne 出口信息），浏览器端不采集
- **疑似爬虫**：UA 命中常见爬虫特征时在访客列表标记
- **dnt**：用户开启「禁止跟踪」时不采集

## 三、附录

### A. 站点继续用 GitHub Pages 时的跨域上报

埋点默认同源 `/api/collect`。若想让 `jonhaoo.github.io` 上的版本也上报到 EdgeOne，改两个函数任一处把端点指过去：

- 在 `.github/workflows/deploy.yml` 的 build 步骤加环境变量，构建时注入：

  ```yaml
      - name: Build
        run: npm run build
        env:
          ASTRO_BASE: /OrinPortfolio
          PUBLIC_ANALYTICS_ENDPOINT: https://xxx.edgeone.app/api/collect
  ```

- 或在 `src/layouts/Layout.astro` 的 `<head>` 里加一行全局覆盖：

  ```html
  <script is:inline>window.__ANALYTICS_ENDPOINT__ = 'https://xxx.edgeone.app/api/collect';</script>
  ```

（两个边缘函数均返回 `Access-Control-Allow-Origin: *`，跨域 POST 可直连。）

### B. 数据管理

- **存储位置**：控制台 → 存储 → KV 存储 → 命名空间 → 按天查看 `evt_YYYYMMDD` 记录
- **容量估算**：单事件约 300–400 字节；日均 100 PV、每 PV 约 8 事件 → 每年约 100MB，远低于免费 1GB
- **备份**：看板「导出」按钮（按当前时间范围导出 JSON）
- **清理**：控制台可直接删除单个 key（整天的数据）
- **本地开发**：`localhost/127.0.0.1` 自动不上报，不产生脏数据

### C. 已知限制（诚实口径）

1. KV 写入是「读-改-写」，两个事件**同一毫秒**并发到达时有小概率丢失 1 批——个人站流量下基本不触发，若日均 PV 上千再考虑加小时级分桶
2. 单日事件超过 8000 条后当日停止记录（防刷量撑爆容量）
3. EdgeOne 地理库按边缘节点视角解析 IP 归属地，与商业 IP 库可能有个别城市级偏差，省级精度可靠
4. 隐私合规：IP 属个人信息，已在页脚加了「本站使用匿名访问统计」告知；数据仅供站长自用，请勿公开分享看板链接或 token
