# Contributing to dsh-custom-style

Thanks for wanting to help. This document covers everything you need to build, test, and ship a change.

[中文](#中文) · [English](#english)

---

## English

### Ground rules

- Be kind. This project follows the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
- **This is an unofficial community plugin.** Do not present it as affiliated with DeepSeek, and do not copy DeepSeek branding into new UI.
- One change per pull request. A focused PR gets reviewed in minutes; a sweeping one sits for weeks.
- **No new runtime dependencies.** The plugin deliberately has zero — the browser half only resolves modules from the DSH shell's frozen 9-entry module table, and the host half uses Node built-ins. A PR that adds a dependency needs a very good argument.

### Development setup

Requirements: Node ≥ 18, `pnpm`, a working DSH install (for the token extraction step).

```powershell
git clone https://github.com/wupup/dsh-custom-style.git
cd dsh-custom-style

npm run build     # regenerate lib/tokens.json + lib/client.js
npm test          # 89 behavior tests
```

There is nothing to `npm install` — the project has no dependencies at all.

### The three-layer source layout

| Path | Role |
|---|---|
| `src/client.js` | Plugin body: state schema, CSS composition, persistence, the picker engine, settings-section registration. |
| `src/panel.js` | The React settings panel. Uses `React.createElement` (aliased to `h`), never JSX — the shell's `react/jsx-runtime` seed is deliberately avoided to keep the plugin to one platform seed. |
| `lib/tokens.json` | **Generated.** The `--dsw-*` catalog extracted from your installed DSH. |
| `lib/client.js` | **Generated.** The shipped bundle. Never edit by hand. |

`tools/build-client.mjs` concatenates `src/client.js` and `src/panel.js` into **one factory scope** (so the components and the plugin body share `PLUGIN_ID`, the store, `commit`, and the picker engine) and injects the generated token catalog. Edit `src/`, then run `npm run build`.

### Testing

Tests run against the **built bundle**, not the sources. `test/harness.mjs` loads `lib/client.js` in a `node:vm` sandbox through the same `window.__ModuleLoader__.load({ id, factory })` contract the real shell uses, with a stubbed `require` for the platform seeds.

That design has a consequence worth internalizing: **if a test passes, the artifact users install behaves that way.** A test can never pass against a source file that the build would assemble differently.

Three conventions the suite depends on:

1. **Shared host intrinsics.** The vm sandbox receives the host realm's `Object`, `Array`, `Map`, … Without that, `assert.deepEqual` fails with "same structure but not reference-equal" — a cross-realm artifact, not a bug.
2. **Honest stubs.** `test/dom.test.mjs` has a minimal DOM stub. Where it cannot model reality (selector matching), it uses an explicit counter the test controls, and defaults to "matches nothing" so a document query truthfully finds no dialogs. Do not build a clever fake that makes tests pass by coincidence.
3. **The test handle.** `src/panel.js` publishes a `testHandle` object marked with a `/* @__TEST_HANDLE__ */` sentinel. The build recognizes the sentinel, lifts the object into the real `exports`, and **fails the build if the sentinel disappears** — that is what keeps the suite anchored to the shipped artifact. Reusing this mechanism requires adding your export to that object.

Run the suite:

```powershell
npm test
```

> `npm test` invokes `node test/run.mjs` (in-process imports) rather than `node --test test/*.test.mjs`. The latter spawns one child per file with piped stdio, which fails with `EPERM` inside sandboxes that forbid named pipes. Both run the same `node:test` cases, so use whichever your environment allows.

### Hard rules that protect users

These are not style preferences; breaking them breaks other people's GUIs.

**Browser half (a factory that throws takes the entire web shell down with "Failed to load plugins"):**

- Resolve every platform seed inside `try`. Detect success by `require` *returning*, never by matching host error text.
- On total seed failure, return a **dumb module** (`apply: () => {}`, `inject: []`) — invisible, never fatal.
- **Never name a service in `exports.inject` whose provider might not exist.** A fiber left `PENDING` fails the boot exactly like a throw does.
- Wrap registration calls in `try/catch`. One broken registration should cost one feature, not the whole shell.
- Guard documentless runs: the module system materializes bundles before the shell mounts.

**Host half:**

- Any new route needs the trust fence: loopback/trusted `Host`, refuse `sec-fetch-site: cross-site`, and compare `Origin` by **hostname** (never host — DSH Desktop binds an OS-assigned port, and a port-sensitive check 403s every write).
- Validate everything from the wire. The state file is attacker-reachable by construction, so `normalizeState()` treats every field as hostile and falls back rather than throwing.
- Keep writes to `string | null`. Anything else is a schema leak across the trust boundary.

**Styling:**

- Never target DSH's CSS-module class names — they are per-build hashes. Use ARIA contracts, `data-*` attributes, or structural relationships.
- Any DOM node you hide or mutate must have a rule you can prove from structure, plus a regression test with a counterexample. (See the modal-concealment tests: an early "climb to the outermost wrapper" rule walked past the overlay and hid the app root instead.)
- Style tags must be created inside the factory with `dataset.plugin` set verbatim, and removed by a `ctx.effect` disposer.

### Adding a preset pack

1. Add an entry to `PRESETS` in `src/client.js`. Use **only** knobs, `--dsw-*` tokens the catalog knows, or your own variables — never a guessed DSH class name.
2. Add `preset.<id>.name` and `preset.<id>.description` to **both** the `zh` and `en` dictionaries. A test asserts the two key sets stay identical.
3. Run `npm test`. Tests assert that every preset id is unique, that its patch only uses keys the state schema knows, that its variable names exist in the shipped token catalog, and that applying it yields a non-empty stylesheet.

### Adding a language

1. Copy the `zh` dictionary in `src/client.js` and translate the values — do not change the keys.
2. Add it to the `ctx.locale.register(SETTINGS_NS, { zh, en, … })` call.
3. Add the language to `test/client.test.mjs`'s key-parity expectation if the suite checks a fixed language list.
4. Machine translation is fine as a first pass; say so in the PR so a native speaker can review.

### Adapting to a new DSH release

1. Run `npm run tokens` and inspect the diff in `lib/tokens.json` — added/removed tokens show up here before anything else breaks.
2. Run `npm run build && npm test`.
3. Manually verify the settings section still mounts and that picking still hides the modal (step 2 in the manual checklist below).

### Manual verification checklist

The suite cannot reach a real browser, so these need a human before a release:

- [ ] Install into a profile, restart `dsh web`, and confirm `GET /plugins/dsh-custom-style/client.js` returns **200** (a 404 means the server predates the install).
- [ ] The settings section appears and every tab renders without a console error.
- [ ] Typing CSS applies live; a deliberately unbalanced brace shows the warning.
- [ ] Picking hides the settings modal, highlights on hover, and restores the modal on Esc, on stop, and on pick.
- [ ] A token override survives switching light↔dark, and survives a browser reload.
- [ ] With a theming plugin (e.g. dsh-dream-skin) installed, switching skins does not wipe this plugin's customizations.

### Commit and PR conventions

- Conventional-commit subjects: `feat:`, `fix:`, `docs:`, `test:`, `build:`, `chore:`. The subject line states the user-visible effect, not the file touched.
- Explain **why** in the body. If you fixed a bug, include the reproduction and the mechanism.
- Note any manual verification performed, and which DSH version you tested against.
- Keep the diff reviewable: if you must reformat unrelated code, do it in a separate PR.

### Reporting bugs

Open an issue with: DSH version, OS, what you did, what you expected, what happened, and any browser-console output. For a rendering problem, a screenshot of the affected area with the relevant tab visible is worth a lot.

---

## 中文

### 基本原则

- 保持友善。本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) 的精神。
- **这是非官方社区插件。** 不要把它描述为与 DeepSeek 有关联，也不要把 DeepSeek 的品牌元素放进新 UI。
- 一个 PR 只做一件事。聚焦的 PR 几分钟就能看完，大杂烩会拖几周。
- **不引入新的运行时依赖。** 本插件刻意保持零依赖——浏览器半只能解析 DSH shell 冻结的 9 项模块表，宿主半只用 Node 内建。要加依赖需要非常充分的理由。

### 开发环境

需要 Node ≥ 18、`pnpm`，以及一个装好的 DSH（提取令牌需要）。

```powershell
git clone https://github.com/wupup/dsh-custom-style.git
cd dsh-custom-style

npm run build     # 重新生成 lib/tokens.json + lib/client.js
npm test          # 89 个行为测试
```

**不需要 `npm install`**——本项目没有任何依赖。

### 三层源码结构

| 路径 | 作用 |
|---|---|
| `src/client.js` | 插件主体：状态模型、CSS 合成、持久化、点选引擎、设置页注册 |
| `src/panel.js` | React 设置面板。用 `React.createElement`（别名为 `h`），**不用 JSX**——刻意避开 shell 的 `react/jsx-runtime` 种子，让插件只依赖一个平台种子 |
| `lib/tokens.json` | **生成物**。从你本机安装的 DSH 提取的 `--dsw-*` 目录 |
| `lib/client.js` | **生成物**。最终产物，永远不要手改 |

`tools/build-client.mjs` 把 `src/client.js` 和 `src/panel.js` 拼进**同一个工厂作用域**（这样组件与插件主体共享 `PLUGIN_ID`、store、`commit`、点选引擎），并注入生成的令牌目录。改 `src/`，然后 `npm run build`。

### 测试

测试跑的是**构建产物**，不是源码。`test/harness.mjs` 用 `node:vm` 把 `lib/client.js` 加载进沙箱，走的是真实 shell 用的同一个 `window.__ModuleLoader__.load({ id, factory })` 契约，`require` 由桩提供平台种子。

这个设计有一个必须理解的推论：**测试通过，意味着用户实际安装的那个文件就是这个行为**。测试不可能对「源码会被构建成另一种样子」的情况误判为通过。

测试套件依赖三条约定：

1. **共享宿主内建。** 沙箱会注入宿主 realm 的 `Object`、`Array`、`Map` 等。否则 `assert.deepEqual` 会报 "same structure but not reference-equal"——那是跨 realm 的假失败，不是 bug。
2. **诚实的桩。** `test/dom.test.mjs` 有一个最小 DOM 桩。它建模不了的地方（比如选择器匹配）用测试可控的显式计数器，并且默认「什么都不匹配」，这样文档查询会如实报告「没有 dialog」。**不要**写一个聪明的假 DOM 让测试靠巧合通过。
3. **测试 handle。** `src/panel.js` 导出一个带 `/* @__TEST_HANDLE__ */` 哨兵的 `testHandle` 对象。构建脚本识别这个哨兵、把对象挪进真正的 `exports`，并在**哨兵消失时直接让构建失败**——这就是测试与产物不脱钩的保证。要复用它，就把你的导出加进那个对象。

### 保护用户的硬性规则

这些不是风格偏好，违反了会弄坏别人的界面。

**浏览器半（工厂抛异常会让整个 web GUI 白屏 "Failed to load plugins"）：**

- 每个平台种子都在 `try` 里解析，靠 `require` **返回了**判断成功，绝不匹配宿主的错误文案
- 种子全失败时返回**哑模块**（`apply: () => {}`、`inject: []`）——隐形，但绝不致命
- **绝不在 `exports.inject` 里写 provider 可能不存在的服务**——fiber 卡在 PENDING 和抛异常一样会让启动失败
- 注册调用全部包 `try/catch`：一个注册坏了只该损失一个功能，而不是整个 shell
- 处理无 document 的运行环境：模块系统会在 shell 挂载前就物化 bundle

**宿主半：**

- 任何新路由都要带信任围栏：loopback/可信 `Host`、拒绝 `sec-fetch-site: cross-site`、`Origin` 比对 **hostname**（绝不比 host——DSH Desktop 绑随机端口，比端口会让每次写入 403）
- 校验所有来自网络的数据。状态文件在构造上就是可被攻击者触及的，所以 `normalizeState()` 把每个字段当敌意输入，宁可回退也不抛错
- 写入只接受 `string | null`，其他类型是跨信任边界的 schema 泄漏

**样式：**

- 绝不针对 DSH 的 CSS Module 类名——它们是每次构建都变的哈希。用 ARIA 契约、`data-*` 属性或结构关系
- 任何隐藏或改动的 DOM 节点，都必须有一条**能从结构证明**的规则，并配一个带反例的回归测试。（参考弹层隐藏的测试：早期「爬到最外层包装」的规则会越过 overlay 把应用根节点藏掉。）
- 样式标签必须在工厂内创建、`dataset.plugin` 逐字正确，并由 `ctx.effect` 的 disposer 清理

### 新增预设样式包

1. 在 `src/client.js` 的 `PRESETS` 里加一项。**只用**滑块、令牌目录里确实存在的 `--dsw-*`、或你自己的变量——绝不猜 DSH 类名
2. 给 `zh` 和 `en` **两份**字典都加上 `preset.<id>.name` 和 `preset.<id>.description`。有测试断言两份字典的键集完全一致
3. 跑 `npm test`。测试会检查：预设 id 唯一、patch 只用状态 schema 认识的键、变量名在令牌目录里存在、套用后生成的样式表非空

### 新增语言

1. 复制 `src/client.js` 里的 `zh` 字典并翻译**值**——不要改键
2. 把它加进 `ctx.locale.register(SETTINGS_NS, { zh, en, … })`
3. 如果测试断言了固定的语言列表，同步更新 `test/client.test.mjs` 里的键对齐检查
4. 机翻可以接受，但请在 PR 里说明，方便母语者复核

### 适配新版 DSH

1. 跑 `npm run tokens`，看 `lib/tokens.json` 的 diff——令牌的增删会在这里最先暴露
2. 跑 `npm run build && npm test`
3. 手动确认设置页仍能挂载、点选仍能隐藏弹层（见下面清单第 2 项）

### 手动验收清单

测试套件到不了真实浏览器，所以发版前必须有人过一遍：

- [ ] 装进 profile、重启 `dsh web`，确认 `GET /plugins/dsh-custom-style/client.js` 返回 **200**（404 说明服务是在安装之前启动的）
- [ ] 设置页出现，每个标签页都能渲染且 Console 无报错
- [ ] 输入 CSS 实时生效；故意写不配对的大括号会出警告
- [ ] 点选会隐藏设置弹层、hover 高亮，并且在 Esc / 停止 / 选中后都会恢复弹层
- [ ] 令牌覆盖在浅色↔深色切换后仍生效，刷新浏览器后仍在
- [ ] 装了换肤插件（如 dsh-dream-skin）时，切换皮肤不会清掉本插件的自定义

### 提交与 PR 约定

- 用约定式提交前缀：`feat:`、`fix:`、`docs:`、`test:`、`build:`、`chore:`。标题写**用户可见的效果**，不写改了哪个文件
- 正文里解释**为什么**。修 bug 请附上复现方式和成因
- 说明你做了哪些手动验证，以及测试用的 DSH 版本
- 保持 diff 可读：如果必须顺手重排无关代码，请单独开一个 PR

### 报告 bug

开 Issue 时请附上：DSH 版本、操作系统、你做了什么、期望什么、实际发生了什么，以及浏览器 Console 的输出。渲染类问题附一张显示相关标签页的截图，价值极高。
