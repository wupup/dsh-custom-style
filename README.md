# dsh-custom-style

[![CI](https://github.com/wupup/dsh-custom-style/actions/workflows/ci.yml/badge.svg)](https://github.com/wupup/dsh-custom-style/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**DSH 网页端界面样式自定义插件。** 在「设置」里获得一个完整的样式工作台：写全局 CSS、用鼠标点选界面元素直接改样式、覆盖设计令牌、微调界面密度，并把整套配置导出分享。

**A DSH web GUI style-customization plugin.** A live CSS editor, a click-to-style element picker, a design-token panel, density controls, and shareable preset packs — all in one settings page.

[中文](#中文文档) · [English](#english)

> ⚠️ **非官方项目。** 这是一个社区插件，与 DeepSeek 官方无关，未获其背书或赞助。DSH 是 DeepSeek 的产品；本项目只针对其公开的插件机制开发。
>
> **Unofficial project.** This is a community plugin. It is not affiliated with, endorsed by, or sponsored by DeepSeek. DSH is a DeepSeek product; this project only targets its documented plugin mechanism.

---

## 中文文档

### 功能

| 标签页 | 能做什么 |
|---|---|
| **全局 CSS** | 直接写任意 CSS，实时注入生效并自动保存。带撤销、大括号/引号/注释配对检查（写错会即时提示而不是静默失效）、以及一个「插入变量」菜单（点一下就把 `var(--dsw-…)` 插到光标处）。 |
| **点选元素** | 打开点选模式后，**设置面板自动隐藏**（它就是挡住页面的那一层），鼠标划过任意元素高亮边框，点击即可为它写样式规则；结束后设置面板自动恢复，选中结果已经在那里等你。顶部浮出提示条，随时可点「停止点选」或按 Esc 退出。自动生成稳定的 CSS 选择器（优先用语义化的 id / `data-*` 属性，跳过哈希类名），并显示当前计算值、匹配元素数量。 |
| **主题变量** | 列出 DSH 全部 **163 个 `--dsw-*` 设计令牌**（从已安装的 DSH 样式表里实际提取，不是猜的），按品牌色/文字/边框/背景/状态色等分组，可搜索。每个令牌都能分别设置浅色与深色两套值，改错了可以单项恢复。 |
| **界面密度** | 字体缩放、界面密度、全局圆角、内容宽度上限、气泡圆角五个滑块，实时预览。 |
| **预设与分享** | 7 套内置预设一键套用；把当前全部配置导出为 JSON 备份或分享；导入别人的配置；一键清空。 |

### 截图

> 待补充。欢迎在 Discussions 或 Issue 里贴出你的配置截图。

### 安装

插件装进 **web profile**（默认位置 `$DSH_HOME/profiles/web`，Windows 上通常是 `C:\Users\<你>\.dsh\profiles\web`）。

#### 方式一：从 GitHub 安装（推荐）

```powershell
dsh plugin --profile web add github:wupup/dsh-custom-style
```

也可以先克隆再本地 link：

```powershell
git clone https://github.com/wupup/dsh-custom-style.git
cd dsh-custom-style
dsh plugin --profile web add .
```

#### 方式二：手动安装

1. 把仓库目录链接或复制到 `$DSH_HOME/profiles/web/node_modules/dsh-custom-style`
2. 编辑 `$DSH_HOME/profiles/web/package.json`，在 `dsh.profile.bundles` 数组里加上 `"dsh-custom-style"`

#### 方式三：pnpm link（`dsh plugin` 失败时）

```powershell
cd $env:DSH_HOME\profiles\web
pnpm add link:<插件仓库的绝对路径>
```

然后手动把 `"dsh-custom-style"` 加进 `package.json` 的 `dsh.profile.bundles`（`pnpm add` 只改 `dependencies`，不认 `dsh.profile` 字段）。

### 让改动生效

改完 profile 后**必须重启 dsh web 服务**，只刷新浏览器没用：

```powershell
# Ctrl+C 停掉当前服务，然后重新启动
dsh web
```

然后打开 http://127.0.0.1:3080 ，进入 **设置 → 自定义样式**（界面语言为英文时显示 Custom Style）。

> **为什么必须重启**：DSH 在启动时扫描 profile、把每个插件的客户端 bundle 快照进内存，再通过 `/plugins/<包名>/client.js` 提供。服务启动之后才装的插件，这个路由根本不存在（直接 404），刷新浏览器也拿不到。

**自查是否装上**：

```powershell
# 200 = 服务已加载本插件；404 = 需要重启 dsh web
Invoke-WebRequest http://127.0.0.1:3080/plugins/dsh-custom-style/client.js -UseBasicParsing |
  Select-Object StatusCode
```

> **不需要构建。** 仓库已提交构建产物 `lib/client.js`，并且插件没有任何运行时依赖（浏览器侧唯一需要的 `react` 由 DSH shell 的模块表提供）。只有你修改了 `src/` 下的源码，才需要重新构建。

### 与其他插件共存

本插件**不注册主题**，也不碰 `ctx.theme`。它的全部输出是一层独立的 CSS 覆盖层 + 一层 `--dsw-*` 变量覆盖：

- 你正在用的换肤插件（如 [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin)）切换皮肤后，这里的自定义依然生效
- 反之，这里的自定义不会锁死你的主题选择
- 插件自带的界面配色全部读取 `--dsw-*` 令牌，所以在任何主题下都不会突兀

覆盖层被注入到 `<head>` 最末尾，选择器写在 `body` 层级（与 DSH 内置样式表同级），靠**源码顺序**取胜而不是靠 `!important` 互相加码。点选生成的规则才带 `!important`，因为 DSH 组件用 CSS Modules，类选择器优先级可能更高——这也是这层规则独立成层、可被总开关一键关掉的原因。

唯一的取舍：如果你在换肤插件里也改了同一个 `--dsw-*` 令牌，**后加载的那个赢**（两者选择器同级，靠 `<head>` 插入顺序决胜）。想彻底避免重叠，用「点选元素」写具体的组件样式，而不是在两个地方覆盖同一个令牌。

### 数据存放位置

| 位置 | 用途 |
|---|---|
| `$DSH_HOME/custom-style.json` | **权威副本**。宿主半通过 `/custom-style/api` 读写，跨 origin、跨端口重启都不会丢。 |
| 浏览器 `localStorage`（`dsh-custom-style:state`） | 首屏缓存，保证刷新后立刻是正确的样子，随后被宿主副本覆盖。 |

为什么需要宿主那一半：`localStorage` 按 origin 隔离，而 DSH Desktop 每次启动绑一个随机端口，GUI 的 origin 会变，缓存就「失忆」了。宿主副本让配置与访问地址无关。

卸载插件不会自动删除 `custom-style.json`，可以手动删。

### 安全说明

- 持久化路由 `/custom-style/api` 带**信任围栏**：只接受 loopback（或部署时配置的可信主机）的 `Host`，拒绝 `sec-fetch-site: cross-site`，有 `Origin` 时比对 **hostname**（不比对端口，否则 DSH Desktop 的随机端口下每次写入都会 403）。这是防 DNS rebinding / 跨站请求的措施，**不是认证**。
- 路由只承载你自己的视觉偏好，请求体上限 16 MB。
- 写入只接受 `string` / `null` 值，且对「读改写」重新读取文件而不是用缓存，因此两个标签页同时保存不会互相覆盖。
- 插件不收集、不上传任何数据，没有任何外部网络请求。

### 从源码构建

```powershell
npm run build      # = tokens + client
npm run tokens     # 仅重新提取 --dsw-* 令牌目录
npm run client     # 仅重新打包 lib/client.js
npm test           # 运行行为测试
```

构建**不压缩、不转译**，产物是可读的普通 JS——你想确认「这个插件到底往页面注入了什么」时，打开就能看。

```
src/client.js      插件主体：状态模型、CSS 合成、持久化、点选引擎、设置页注册
src/panel.js       React 设置面板（用 React.createElement，不依赖 JSX 运行时）
lib/tokens.json    从已安装 DSH 提取的 --dsw-* 令牌目录（生成物）
        ↓ tools/build-client.mjs
lib/client.js      最终产物：单个 window.__ModuleLoader__.load({ id, factory }) 工厂
```

两个源文件会被拼进**同一个工厂作用域**（这样组件与插件主体共享 `PLUGIN_ID`、store、`commit`、点选引擎），并注入生成的令牌目录。`lib/client.js` 是生成文件，请改 `src/` 下的源码。

DSH 升级后如果令牌有变化，重新跑 `npm run tokens && npm run client` 即可。

### 测试

```powershell
npm test
```

89 个测试，覆盖：模块契约、`apply()` 的注册与销毁、状态规范化（信任边界）、持久化编解码往返、CSS 合成、单位补全、大括号配对、选择器转义与生成、颜色归一化、预设行为、设置页的真实渲染输出、样式标签生命周期、点选引擎的启动/停止/回调/一次性模式、**点选时设置弹层的隐藏与精确恢复**，以及「刷新后从缓存完整还原」这条端到端路径。

测试**跑的是构建产物 `lib/client.js`**，并通过 `window.__ModuleLoader__.load` 这一真实契约加载——所以测试通过意味着用户实际安装的那个文件就是这个行为，而不是「源码如果按另一种方式拼装大概会这样」。

> `npm test` 走的是 `node test/run.mjs`（单进程 import），而不是 `node --test test/*.test.mjs`。后者会为每个测试文件 spawn 子进程，在禁止打开命名管道的沙箱里会以 `EPERM` 失败。两种方式跑的是同一套 `node:test` 用例。

### 已知边界

- **不猜 DSH 的私有类名。** 插件不依赖任何压缩后的组件类名，因此密度滑块作用于字号、行高和 `.markdown` 这类语义选择器。想精细控制某个具体组件，请用「点选元素」——那正是为此设计的路径。
- **令牌面板列出的是别名层。** 改动 `--dsw-alias-*`（以及色板层 `--dsw-static-*`）会覆盖内置值，但不会重算派生令牌（阴影、高度等仍按原样计算）。
- **点选时只隐藏设置弹层本身。** 插件从自己的 DOM 位置向上找最近的 `role="dialog"`（不用类名——DSH 的类名是每次构建都变的 CSS Module 哈希），再沿「只属于这个弹窗」的祖先链取最外层：判定条件是兄弟节点要么是 `aria-hidden` 的遮罩，要么已经在链里。这既能把遮罩一起藏掉（只藏 dialog 会留下一层挡住页面的遮罩），又不会多爬一层把侧栏按钮甚至整个应用一起藏掉。找不到 `role="dialog"` 时退化为「不隐藏」而不是报错——点选仍可用，手动关掉设置面板再点即可。
- **自定义 CSS 写坏了不会崩。** 大括号/引号/注释不配对会即时提示，注入的是纯文本，浏览器最多忽略无效声明。

### 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。特别欢迎：新的预设样式包、更多语言的界面文案、以及针对新版 DSH 的适配。

### 致谢与出处

本项目是独立实现，没有复制任何第三方代码，但它在两个意义上站在别人的工作之上：

- **[dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin)**（MIT）——一个已经成熟的手写 bundle 插件。本项目的浏览器半采用与它相同的形态（plain-CJS 工厂 + 种子探测降级 + `data-plugin` 标记的样式标签）。该形态最初由它实践并记录，是本项目能快速做对的原因。
- **[dsh-better-sidebar](https://github.com/liustack/dsh-better-sidebar)**——宿主半的 `/sidebar` 路由展示了信任围栏的写法；`lib/index.js` 的围栏与「比对 hostname 而非 host」这一决定沿用了它的做法。
- **DSH 官方客户端包**（`@deepseek-ai/dsh-client-ui-*`，MIT）——`docs/api-notes.md` 对 slot / store / locale / 主题令牌契约的梳理，来自阅读这些包的代码与文档。

`docs/api-notes.md` 记录了 DSH 客户端插件机制的逐条契约，每条都标注了来源文件与行号。它不包含任何第三方源代码，可以自由复用。

### 许可

[MIT](LICENSE)

---

## English

### Features

| Tab | What it does |
|---|---|
| **Global CSS** | Write any CSS; it is injected live and saved automatically. Undo, brace/quote/comment balance checking (a broken sheet tells you instead of silently failing), and an "insert token" menu that drops `var(--dsw-…)` at the caret. |
| **Element picker** | Enter picking mode and **the settings panel hides itself** (it is the layer covering the page). Hover any element to see its bounds; click to author style rules for it. The panel returns the moment you finish, with the selection waiting. A floating bar offers Esc or an explicit stop. Generates stable selectors (prefers semantic ids / `data-*` attributes, skips hashed class names) and shows computed values plus match counts. |
| **Tokens** | Lists all **163 `--dsw-*` design tokens** (extracted from your installed DSH's actual stylesheets, not guessed), grouped by brand/text/border/background/state and searchable. Every token takes separate light and dark values, and each override is individually reversible. |
| **Density** | Five live sliders: type scale, density, corner radius, content width cap, bubble radius. |
| **Presets** | Seven built-in packs applied in one click; export everything to JSON for backup or sharing; import someone else's configuration; one-click clear. |

### Installation

The plugin is installed into your **web profile** (`$DSH_HOME/profiles/web`).

```powershell
dsh plugin --profile web add github:wupup/dsh-custom-style
```

Or clone and link locally:

```powershell
git clone https://github.com/wupup/dsh-custom-style.git
cd dsh-custom-style
dsh plugin --profile web add .
```

Then **restart the web server** — a browser refresh is not enough:

```powershell
dsh web
```

Open http://127.0.0.1:3080 and go to **Settings → Custom Style**.

> **Why the restart matters:** DSH scans the profile at startup and snapshots each plugin's client bundle in memory before serving it at `/plugins/<package-name>/client.js`. A plugin installed after startup has no route at all (a plain 404), and refreshing the browser cannot change that.

Verify it loaded:

```powershell
Invoke-WebRequest http://127.0.0.1:3080/plugins/dsh-custom-style/client.js -UseBasicParsing |
  Select-Object StatusCode
```

> **No build step required.** The built bundle `lib/client.js` is committed, and the plugin has no runtime dependencies — the only module it needs (`react`) comes from the DSH shell's frozen module table. Rebuilding is only necessary if you edit `src/`.

### Coexistence with other plugins

This plugin **registers no theme** and never touches `ctx.theme`. Everything it emits is an independent CSS layer plus `--dsw-*` variable overrides, so it composes with a theming plugin (such as [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin)) rather than competing with it.

Its own UI reads `--dsw-*` tokens throughout, so it looks native under any theme.

The only trade-off: if you override the same token in a theming plugin, the one loaded later wins (both use equal-specificity selectors, decided by `<head>` insertion order). To avoid the overlap entirely, use the element picker to style the specific component instead of overriding the same token twice.

### Where data lives

| Location | Purpose |
|---|---|
| `$DSH_HOME/custom-style.json` | The authoritative copy, read and written by the host half over `/custom-style/api`. Survives origin and port changes. |
| Browser `localStorage` (`dsh-custom-style:state`) | First-paint cache, so a refresh is styled immediately; superseded by the host copy. |

### Security

- The `/custom-style/api` route is fenced: loopback `Host` only (or a trusted authority configured at deploy time), `sec-fetch-site: cross-site` refused, and `Origin` compared by **hostname** rather than host — a port-sensitive check would 403 every write under DSH Desktop's OS-assigned port. This is a DNS-rebinding / cross-site defense, **not authentication**.
- The route carries only your own visual preferences, capped at a 16 MB body.
- Writes accept only `string`/`null` values and re-read the file before merging, so two tabs saving concurrently cannot clobber each other.
- The plugin collects nothing, uploads nothing, and makes no external network requests.

### Building from source

```powershell
npm run build      # tokens + client
npm run tokens     # regenerate the --dsw-* token catalog only
npm run client     # rebuild lib/client.js only
npm test           # run the behavior suite
```

The build does **no minification and no transpilation**: the output is readable plain JS, so you can open it and see exactly what the plugin injects.

### Testing

89 tests run against the **built bundle** (`lib/client.js`), loaded through the real `window.__ModuleLoader__.load({ id, factory })` contract the DSH web shell uses — so a passing suite means the artifact users install behaves this way, not that the sources would if assembled differently.

### Known limitations

- **No guessing at DSH's private class names.** The density sliders act on type scale, line height, and semantic selectors like `.markdown`. For fine-grained control of a specific component, use the element picker — that is the path designed for it.
- **The token panel covers the alias layer.** Overriding `--dsw-alias-*` (or the raw `--dsw-static-*` palette) replaces the shipped value but does not recompute derived tokens such as shadows and elevations.
- **Picking hides the settings modal and only that.** The layer is resolved from the plugin's own DOM position by ARIA contract (`role="dialog"`), never by class name, then climbed along the ancestors that belong solely to the modal. If a future DSH build renders the panel without `role="dialog"`, the plugin degrades to "not hidden" rather than erroring — picking still works, you just close the panel manually first.

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Especially welcome: new preset packs, more UI languages, and adaptations to newer DSH releases.

### License

[MIT](LICENSE)
