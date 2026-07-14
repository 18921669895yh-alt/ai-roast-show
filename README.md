# AI 吐槽大会

一个中文、安全边界优先的 AI 喜剧节目式 Web 应用。用户可以提交文字或照片素材，获得结构化吐槽、最佳金句、五回合即兴反击、喜剧观察报告和不含原照片的分享卡片。

## 功能与路由

- `/`：节目首页、示例和安全说明。
- `/roast`：文字或照片素材、吐槽模式和浓度选择。
- `/result`：开场、观察、最佳金句、观众反应和后续入口。
- `/battle`：最多五回合的即兴反击与娱乐性评分。
- `/report`：非正式喜剧观察报告、复制金句和 PNG 分享卡。

所有评分、标签和奖项均为喜剧化虚构，不是真实心理或能力测量。

## 本地运行

需要 Node.js 20 或更新的 LTS 版本。

```bash
npm install
npm run dev
```

复制环境变量模板：

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

访问 `http://localhost:3000`。不配置密钥时也会安全回退到演示内容；若希望始终使用确定性 Mock，请在 `.env.local` 设置 `AI_MOCK_MODE=true`。

## 环境变量与模型路由

`.env.example` 列出全部变量。密钥只允许存在于服务端环境变量，绝不能添加 `NEXT_PUBLIC_` 前缀或写入客户端代码、日志、截图与仓库。

推荐的本地配置示例（请只把真实密钥写入被忽略的 `.env.local`）：

```dotenv
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
KIMI_MODEL=kimi-k2.6
AI_MOCK_MODE=false
AI_ROAST_MAX_TOKENS=1800
AI_COMEBACK_MAX_TOKENS=900
AI_REPORT_MAX_TOKENS=900
```

- 纯文字吐槽优先 DeepSeek，遇到可重试错误时可回退 Kimi。
- 图片吐槽使用支持视觉输入的 Kimi；Mock 模式完全离线于供应商密钥。
- 反击和报告按可用供应商路由，并在无密钥时使用安全 Mock。
- `DEEPSEEK_MODEL`、`KIMI_MODEL` 均可配置，因为供应商的模型名称和可用性可能变化；部署前请核对供应商当前文档。
- `AI_ROAST_MAX_TOKENS`、`AI_COMEBACK_MAX_TOKENS`、`AI_REPORT_MAX_TOKENS` 控制结构化输出上限。

## 隐私

- 照片仅在本次请求中临时转发给所选 AI 服务提供方；本应用服务器不把照片写入磁盘、数据库、日志或浏览器长期存储。服务提供方仍会依据其条款处理请求。
- 生成的文字结果只保存在当前设备的浏览器中，最多 24 小时，用于继续查看结果、对决和报告。
- `/roast` 的隐私卡提供“清除最近结果”控制。
- 分享海报只包含文字摘要、标签、金句和虚构指标，不包含原照片或图片 Data URL。

## 安全边界

应用不羞辱身体或不可改变特征，不攻击敏感身份，不做心理诊断，也不鼓励现实伤害。检测到脆弱或求助语境时会采用更温和的表达。用户素材始终按不可信数据处理，不能改变系统规则或输出合同。

## 测试与构建

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright 会自行启动 `AI_MOCK_MODE=true` 的本地服务器，不需要 API 密钥，也不使用系统浏览器会话。首次运行必须安装 Playwright Chromium。失败时保留 trace、截图和视频到测试输出目录。

默认 E2E 端口是 `3211`，端口冲突时可临时覆盖：

```powershell
# Windows PowerShell
$env:PLAYWRIGHT_PORT = "3212"; npm run test:e2e
```

```bash
# macOS / Linux
PLAYWRIGHT_PORT=3212 npm run test:e2e
```

## 部署

部署平台需要支持 Next.js App Router 和服务端 Route Handlers。把密钥配置在平台的服务端 Secret 管理中，保持 `AI_MOCK_MODE=false`，并在发布前重新运行 lint、单元测试、生产构建和 Chromium E2E。不要把 `.env.local` 或 Playwright 产物上传到部署包。

## 资源说明

`public/generated` 中的舞台视觉资源为本项目的 AI 生成素材。测试图片 `tests/fixtures/tiny.png` 是程序生成的 2×2 色块，不包含用户照片、人物或外部版权素材。
## GitHub + Cloudflare Workers 部署

本项目已经配置为通过 GitHub Actions 部署到 Cloudflare Workers，适合保留 Next.js 页面和 `/api/roast`、`/api/comeback`、`/api/report` 这些服务端接口。

1. 在 GitHub 新建仓库，把本项目推送到 `main` 或 `master` 分支。
2. 在 Cloudflare 创建一个 API Token，权限至少包含 Workers Scripts 编辑权限。
3. 在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 第一次部署后，在 Cloudflare Worker 的 `Settings -> Variables and Secrets` 里添加运行时密钥：
   - `DEEPSEEK_API_KEY`
   - `MOONSHOT_API_KEY`
5. 推送到 `main` / `master` 后，`.github/workflows/deploy-cloudflare.yml` 会自动测试并部署。

本地预览 Cloudflare 运行时可以执行：

```bash
npm run preview
```

手动部署可以执行：

```bash
npm run deploy
```
