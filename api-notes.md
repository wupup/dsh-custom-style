# DSH Web Client Plugin API — evidence-backed contract

Scope: the browser-half plugin API of the DSH web shell as it exists **on this machine**
(`@deepseek-ai/dsh` **0.1.5-rc.2**, profile `web`, shell served by `dsh-web-app`).

Every claim below cites a file and line that was actually read. Nothing here is inferred
from documentation prose alone unless the prose itself is the artifact being cited.

## Source inventory (what was read)

| Tag | Path |
|---|---|
| **MOD** | `C:\Users\wind\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-client-modules\lib\client.js` |
| **MODH** | `…\@deepseek-ai\dsh-client-modules\lib\index.js` |
| **MODT** | `…\@deepseek-ai\dsh-client-modules\lib\types\client\manifest.d.ts` |
| **RND** | `…\@deepseek-ai\dsh-client-ui-renderer\lib\client.js` |
| **THM** | `…\@deepseek-ai\dsh-client-ui-theme\lib\client.js` |
| **THMT** | `…\@deepseek-ai\dsh-client-ui-theme\lib\types\client\index.d.ts` |
| **SET** | `…\@deepseek-ai\dsh-client-ui-settings\lib\client.js` |
| **SETT** | `…\@deepseek-ai\dsh-client-ui-settings\lib\types\client\contract\slots.d.ts` |
| **SETG** | `…\@deepseek-ai\dsh-client-ui-settings-general\lib\client.js` |
| **SPLICY** | `…\@deepseek-ai\dsh-client-ui-settings\lib\types\client\settings-contract.d.ts` |
| **SPBIND** | `…\@deepseek-ai\dsh-client-ui-settings\lib\types\client\settings-scope.d.ts` |
| **LOC** | `…\@deepseek-ai\dsh-client-locale\lib\types\client\index.d.ts` |
| **WS** | `…\@deepseek-ai\dsh-host-webserver\lib\types\index.d.ts` |
| **SHELL** | `…\@deepseek-ai\dsh-web-frontend\dist\assets\index-BKQ_L1z6.js` (minified; one logical region per line — line + byte offset given) |
| **HMR** | `…\@deepseek-ai\dsh-client-hmr\lib\client.js` |
| **HMRT** | `…\@deepseek-ai\dsh-client-hmr\lib\types\client\index.d.ts` |
| **CCR** | `…\@deepseek-ai\dsh-cordis-client-runner\lib\client.js` (model-facing service/slot catalog — authoritative prose) |
| **BOOT** | `…\@deepseek-ai\dsh-app-boot\lib\index.js` |
| **WEBPATCH** | `…\@deepseek-ai\dsh-web-app\cordis.patch.yml` |
| **LD** | `…\@deepseek-ai\cordis-plugin-loader\src\config\entry.ts` |
| **COR** | `…\@deepseek-ai\cordis\lib\types\registry.d.ts`, `…\@deepseek-ai\cordis\lib\types\fiber.d.ts` |
| **DS** | `C:\Users\wind\.dsh\profiles\web\node_modules\dsh-dream-skin\lib\client.js` (readable hand-written CJS bundle, 5897 lines) |
| **DSHOST** | `…\dsh-dream-skin\lib\index.js` |
| **BSSRC** | `C:\Users\wind\.dsh\profiles\web\node_modules\dsh-better-sidebar\src\…` (original TypeScript) |

> Note on `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-store`,
> `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`:
> **none of these exist as installed packages.** They are compiled into the shell bundle
> and exposed only through the platform seed table (§1.3). Their `.d.ts` files are
> therefore *not* on disk; the runtime implementations in **SHELL**/**RND** are the contract,
> and the type names (`PropsRuntime`, `PropsStore`, `PropsLocale`, `PropsRenderSlots`,
> `InjectFace`, `HostObservable`, `SlotCore`, …) appear as imports in the shipped packages'
> declarations (e.g. **RND** `lib/types/client/bind.d.ts:1`).

---

## 1. Bundle entry contract

### 1.1 The exact wrapper

A client bundle is **plain CJS** inside a closure handed to `window.__ModuleLoader__.load`.
The canonical readable specimen is the modules bundle itself:

```js
// MOD:1-6
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-modules",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// … whole bundle body …
		return module.exports;   // MOD:372
	}
});
```

Sibling specimen (a third-party bundle, identical shape):

```js
// DS:18-23
window.__ModuleLoader__.load({
	id: "dsh-dream-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
```

And the shipped tsdown bundles emit exactly this too:

```js
// THM:1-9
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
```

**Required fields** (typed): `id` and `factory` only.

```ts
// MODT:147-157
export interface ClientBundleRegistration {
    /** Plugin id (package name) — the registration key; must match the graph row being executed. */
    id: string;
    /**
     * Closure factory holding the whole bundle body: receives the synchronous
     * require bound to the module table and returns the bundle's exports. Runs
     * once, at materialization.
     */
    factory: (require: (spec: string) => unknown) => Record<string, unknown>;
}
```

Rules derived from the loader implementation:

- `id` is normalized with `stripClientSuffix` before use, so `"pkg/client"` and `"pkg"` are
  the same key (**MOD:230**, **MOD:61-63**).
- Registering twice without an intervening `invalidate()` is a **loud throw** — i.e. a bundle
  `<script>` that executes twice breaks the entry:
  ```js
  // MOD:228-233
  register(registration) {
      const id = stripClientSuffix(registration.id);
      if (this.bootstrapIds.has(id) || this.factories.has(id)) throw new Error(`client-modules: duplicate factory registration for "${registration.id}" (bundle executed twice without invalidate?)`);
      this.factories.set(id, registration.factory);
  }
  ```
- Script execution **only registers the factory**. Every side effect — including CSS
  injection — must live inside the factory closure and runs at *materialization*:
  ```js
  // MOD:16-23 (doc comment)
  * Lazy CJS model: executing a plugin bundle only REGISTERS its
  * factory (`window.__ModuleLoader__.load({id, factory})`); every module body
  * side effect — including CSS injection — lives inside the factory closure
  * and runs at materialization, not at script execution.
  ```
  A top-level `;` IIFE placed *after* the `load({...})` call therefore also runs at script
  time, not at materialization — dream-skin does this for a cosmetic nav icon and documents
  the hazard at **DS:5863-5869**.

### 1.2 How exports are exposed; how the shell resolves `require(name)`

`return module.exports` (or assigning onto `exports`) is the whole contract. There is no
ESM interop, no `default` unwrapping requirement, and **no export is mandatory** unless you
want cordis to do something:

- `apply(ctx)` — the plugin body (cordis `Plugin.Object.apply`).
- `name` — fiber/logger display name.
- `inject` — cordis service dependencies required before `apply` runs.
- anything else is a plain module export.

The shell's resolution order for the synchronous `require` handed to the factory is
seed → materialized → registered factory → **throw**:

```js
// MOD:300-310
makeRequire(edges) {
    return (spec) => {
        edges.add(spec);
        if (this.seed.has(spec)) return this.seed.get(spec);
        const id = stripClientSuffix(spec);
        const record = this.loadCache.get(id);
        if (record !== void 0) return record.exports;
        if (this.factories.has(id)) return this.materialize(id).exports;
        throw new Error(`client-modules: require("${spec}") missed the module table — not a platform seed word, not a materialized module, and no registered package factory (a build-time externals drift, or a dynamic dependency that did not arrive)`);
    };
}
```

Async `import(specifier)` adds a graph-row branch and an even louder error:

```js
// MOD:311-320
async import(specifier) {
    if (this.seed.has(specifier)) return this.seed.get(specifier);
    const id = stripClientSuffix(specifier);
    const existing = this.loadCache.get(id);
    if (existing !== void 0) return existing.exports;
    const row = this.graphRows.get(id);
    if (row !== void 0) await this.arriveGraphRow(row);
    else if (!this.factories.has(id)) throw new Error(`client-modules: cannot resolve "${specifier}" — not a seed word, not a materialized module, and not a row in the boot graph (the runtime mirror of the bundle purity gate)`);
    return this.materialize(id).exports;
}
```

Requiring another plugin bundle (`require("other-plugin/client")`) works only if that row
has already arrived (declared via `dsh.client.external`, §2). Cycles are **fatal**:

```js
// MOD:271-293
materialize(id) {
    const existing = this.loadCache.get(id);
    if (existing !== void 0) return existing;
    const registered = this.factories.get(id);
    if (registered === void 0) throw new Error(`client-modules: no registered factory for "${id}"`);
    if (this.materializing.has(id)) throw new Error(`client-modules: require cycle through "${id}" (factory-form CJS cannot deliver partial exports)`);
    this.materializing.add(id);
    try {
        const edges = /* @__PURE__ */ new Set();
        const record = {
            id,
            exports: registered(this.makeRequire(edges)),
            styles: claimStyles(id),
            edges
        };
        this.loadCache.set(id, record);
        return record;
    } finally { this.materializing.delete(id); }
}
```

### 1.3 The platform seed table — the exact specifier strings

The web entry builds the module system with `staticModules: by()`, and `by()` is a literal
object frozen into the shell bundle:

```js
// SHELL:114, byte offset 553121
function by(){return{
  react:ec,
  "react/jsx-runtime":ic,
  "react-dom":cc,
  "react-dom/client":fc,
  "@deepseek-ai/cordis":Ha,
  "@deepseek-ai/dsh-client-store":Hc,
  "@deepseek-ai/dsh-client-ui-slots":Ac,
  "@deepseek-ai/dsh-client-ui-primitives":Zg,
  "@deepseek-ai/dsh-client-ui-dockkit":Ey
}}
```

That is the **complete** set: **9 seed words**. Anything else must be a graph row
(another plugin's `/client` bundle) reachable through `dsh.client.external`.

Module-table interaction for the seeds (invocation site):

```js
// SHELL:114, byte offset 553816
const i=globalThis.__DSH_TRANSPORT__;
this.modules=r.create({boot:t.__DSH_BOOT__,staticModules:by(), …});
```

Seed surfaces actually exported (for the ones defined in this bundle):

| Specifier | Exports (verified) |
|---|---|
| `@deepseek-ai/dsh-client-store` | `createSnapshotStore`, `defineStore`, `notifySubscribers`, `shallowEqual` — **SHELL:56**, offset 206155 area: `const Hc=Object.freeze(Object.defineProperty({__proto__:null,createSnapshotStore:b6,defineStore:Pc,notifySubscribers:v3,shallowEqual:Oc},…))` |
| `@deepseek-ai/dsh-client-ui-slots` | `SlotCore`, `SlotOwnershipError`, `StaleAuthorizationError`, `resolveSlotLabel`, `standardHookPropName` — **SHELL:56**, offset 206155 |
| `@deepseek-ai/dsh-client-ui-primitives` | 123 named exports — see §6.4 |
| `@deepseek-ai/dsh-client-ui-dockkit` | dock pane/split surface (`DockSurface`, `DockController`, `DOCK_ZONES`, `planAddTab`, …) — **SHELL:114**, offset 553121 region |
| `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client` | the React 18 singletons |
| `@deepseek-ai/cordis` | the vendored cordis runtime |

Important: only **one** occurrence of the literal substring `slots` exists in the whole
shell bundle — the seed table entry itself. The `ctx.slots` **service** is not a seed
module; it is provided by `ui-renderer` (§5), which itself `require`s the seed to get
`SlotCore` (**RND:14**).

### 1.4 How to fail safely without white-screening the shell

This is the single most dangerous surface in the whole API. The shell creates one loader
entry per graph row, then asserts every entry is `active`:

```js
// SHELL:114, byte offset 554709 — WebBoot.runPluginBoot
async runPluginBoot(t, r) {
  await t.plugin(Ba);
  const i = t.loader;
  i.internal = this.modules;
  t.on("internal/status", a => { const c = a.entry; c === void 0 || c.fiber === void 0 || this.page.setState(c.options.name, K5[c.fiber.state]); });
  const s = this.manifest.plugins.map(a => a.id);
  this.page.setTotal(s.length);
  await r;
  await Promise.all(s.map(async a => {
    this.page.setState(a, "loading");
    const c = await i.create({ name: a });
    i.resolve(c).fiber === void 0 && this.page.setState(a, "failed");
  }));
  await i.await();
  this.assertEntriesActive(t)
}
```

```js
// SHELL:114, byte offset 555208
assertEntriesActive(t) {
  const r = [];
  for (const i of t.loader.entries()) {
    const s = i.options.name;
    if (i.fiber === void 0) { r.push(`${s}: import failed (see console for the import error)`); continue; }
    const a = K5[i.fiber.state];
    if (a !== "active")
      if (a === "pending") {
        const c = Object.keys(i.fiber.inject).filter(h => t.get(h) === void 0);
        r.push(`${s}: pending (waiting for service${c.length === 1 ? "" : "s"}: ${c.join(", ") || "unknown"})`)
      } else r.push(`${s}: ${a}`)
  }
  if (r.length > 0) throw new Error(`web boot: ${String(r.length)} entr${r.length === 1 ? "y" : "ies"} did not activate\n${r.join("\n")}`)
}
```

The player renders `"Failed to load plugins"` as a full-screen failure card
(`SHELL:114`, the `jy` page class: `ot(rt.failedTitle,"Failed to load plugins")`).
So there are **two** ways one plugin takes the whole GUI down:

1. **The factory throws.** `materialize` → factory → throw rejects the `import`, so
   `i.create()` rejects, `Promise.all` rejects, `run()`'s catch calls `page.fail(...)`.
2. **`apply` leaves the fiber non-active.** Either it throws (`FAILED`), or it declares
   `inject: ["someService"]` where `someService` never appears (`PENDING` — reported by
   `assertEntriesActive`).

The defensive pattern used by the reference third-party plugin — probe every seed inside
`try`, and if anything is missing return a **dumb module** instead of throwing:

```js
// DS:24-73
// ── Platform seed resolution (defensive — blue-team R3/R4) ─────────────
// The host does NOT isolate loader-entry factories: one throwing factory
// aggregates into `entries did not activate` and takes the whole web
// shell down ("Failed to load plugins" — the exact issue #43 blast
// radius). So every platform seed is resolved inside a try. …
const seedProbe = { lastError: null };
const requireSeed = (name) => {
    try { return require(name); } catch (err) { seedProbe.lastError = err; return null; }
};
let react_jsx_runtime = requireSeed("react/jsx-runtime");
let _react = requireSeed("react");
let _runtime_client = null;
for (const seed of ["@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-runtime/client"]) {
    _runtime_client = requireSeed(seed);
    if (_runtime_client !== null) break;
}
if (react_jsx_runtime === null || _react === null || _runtime_client === null) {
    const last = seedProbe.lastError;
    try { console.warn("[dsh-dream-skin] required host modules unavailable — plugin disabled for this session:", last && last.message); } catch {}
    exports.SETTINGS_NS = "settings.dreamSkin";
    exports.SKINS = [];
    exports.DEFAULT_SKIN = "system";
    exports.apply = () => {};
    exports.inject = [];
    return module.exports;
}
```

Note the second half of that lesson: the downgrade path also sets `exports.inject = []`.
A dumb module that still declared `inject: ["theme"]` would be a **pending** fiber and would
still trip `assertEntriesActive`. (`exports.inject = []` at **DS:71**.)

Correspondingly, `apply` itself should swallow per-feature failures rather than throw.
Two real patterns:

```js
// DS:5092-5102 — a collision in another plugin must not escape apply()
try {
    disposers.push(ctx.theme.register(skinDefinition));
} catch (err) {
    try { console.warn(`[dsh-dream-skin] could not register skin "${skinDefinition.id}":`, err && err.message); } catch {}
}
ctx.effect(() => () => { for (const dispose of disposers) dispose(); }, "dsh-dream-skin: theme registration");
```

```js
// BSSRC src/client/index.tsx:455-457 — wrap the whole apply body
} catch (error) {
    fail('load', error)
}
```

---

## 2. `dsh.client` declaration in `package.json`

The declaration lives at `package.json` → `dsh.client`. It is parsed by the **host** half of
`dsh-client-modules`.

### 2.1 Exact validation

```js
// MODH:139-154
/** Narrow an unknown parsed JSON value to the `dsh.client` declaration, throwing on malformed fields. */
function parseDshClient(pkgName, value) {
	if (value === void 0) return void 0;
	if (typeof value !== "object" || value === null) throw new Error(`client-modules: ${pkgName} has a non-object dsh.client declaration`);
	const decl = value;
	if (typeof decl.platform !== "string") throw new Error(`client-modules: ${pkgName} dsh.client.platform must be a string`);
	const inject = optionalStringArray(pkgName, "dsh.client.inject", decl.inject);
	const external = optionalStringArray(pkgName, "dsh.client.external", decl.external);
	if (decl.immediately !== void 0 && typeof decl.immediately !== "boolean") throw new Error(`client-modules: ${pkgName} dsh.client.immediately must be a boolean`);
	return {
		platform: decl.platform,
		...inject !== void 0 ? { inject } : {},
		...external !== void 0 ? { external } : {},
		...decl.immediately !== void 0 ? { immediately: decl.immediately } : {}
	};
}
```

```js
// MODH:47-51
function optionalStringArray(subject, field, value) {
	if (value === void 0) return void 0;
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`client-modules: ${subject} ${field} must be a string array`);
	return value;
}
```

| Field | Required | Type | Validation / meaning |
|---|---|---|---|
| `platform` | **yes** | `string` | Must be **exactly `"web"`** or the package is silently *not* a client package (§2.3). Any other string is accepted by the parser but then skipped. Non-string throws. |
| `inject` | no | `string[]` | Package-name dependency edges. Each element must be a string (array-of-strings is enforced). |
| `external` | no | `string[]` | Exact non-baseline module specifiers this bundle `require`s. Same string-array rule. |
| `immediately` | no | `boolean` | Stage-one prefetch mark. Must be a real boolean if present. |

### 2.2 `inject` vs `external` — precise semantics

```ts
// MODT:38-59
/**
 * One composed client entry pushed by the host (a graph row). Wire
 * single source: the host node half (package root) produces this same shape.
 * `immediately` marks stage-one prefetch. `inject` names package rows whose
 * factories must arrive before this row materializes, while Cordis separately
 * uses the same package edges to compose entries. `external` carries exact
 * non-inject module requests (see {@link WebBootGraph.entries}).
 */
export interface WebBootEntry {
    /** Entry name == package name. */
    id: string;
    url: string;
    rev: string;
    /** Package-name dependency edges used for factory arrival and plugin composition. */
    inject?: string[];
    /** Stage-one prefetch mark: load the script for factory registration during module-face boot. */
    immediately?: boolean;
    /** Non-baseline module specifiers this row requests; omitted when it requests none. */
    external?: string[];
}
```

```ts
// MODT:86-100
export interface BootModuleRow {
    id: string;
    url: string;
    initialUrl: string;
    rev: string;
    /** Injected package rows whose factories arrive before this row materializes. */
    inject: string[];
    /** Module specifiers this row requests from the module table ([] when the wire omits them). */
    external: string[];
}
/** The cordis-plugin view of one boot row: what entry composition needs (optional wire fields normalized). */
export interface BootPluginRow {
    id: string;
    /** Package-name dependency edges ([] when the wire omits them). */
    inject: string[];
    /** Stage-one prefetch tier (false when the wire omits it). */
    immediately: boolean;
}
```

Runtime arrival order is driven by `external` (each external specifier either names a graph
row that must arrive first, or is a seed word that adds no edge) and `inject`:

```js
// MOD:252-270
async arriveGraphRow(row, open = [], visited = /* @__PURE__ */ new Set()) {
    const cycleStart = open.indexOf(row.id);
    if (cycleStart !== -1) throw new Error(`client-modules: module arrival cycle ${[...open.slice(cycleStart), row.id].join(" -> ")} (the host must reject this graph before serving it)`);
    if (visited.has(row.id)) return;
    visited.add(row.id);
    const next = [...open, row.id];
    for (const request of row.external) {
        const id = stripClientSuffix(request);
        if (this.seed.has(request) || this.loadCache.has(id)) continue;
        const dependency = this.graphRows.get(id);
        if (dependency !== void 0) await this.arriveGraphRow(dependency, next, visited);
    }
    for (const packageName of row.inject) {
        const dependency = this.graphRows.get(packageName);
        if (dependency !== void 0) await this.arriveGraphRow(dependency, [], visited);
    }
    await this.arrive(row);
}
```

The host composes `external` into a **module graph** and rejects self-requests and cycles:

```js
// MODH:349-371
function orderByModuleGraph(entries) {
	const rowsById = /* @__PURE__ */ new Map();
	for (const entry of entries) rowsById.set(entry.id, entry);
	const ordered = [];
	const placed = /* @__PURE__ */ new Set();
	const open = [];
	const visit = (entry) => {
		if (placed.has(entry.id)) return;
		const cycleStart = open.indexOf(entry.id);
		if (cycleStart !== -1) throw new Error(`client-modules: module graph cycle ${[...open.slice(cycleStart), entry.id].join(" -> ")} — a requested package row must precede its consumers, and factory-form CJS cannot deliver partial exports`);
		open.push(entry.id);
		for (const name of entry.external ?? []) {
			const dependency = rowsById.get(name) ?? rowsById.get(stripClientSuffix(name));
			if (dependency === entry) throw new Error(`client-modules: "${entry.id}" requests module "${name}" that it answers itself — a row must not declare its own package in dsh.client.external`);
			if (dependency !== void 0) visit(dependency);
		}
		open.pop();
		placed.add(entry.id);
		ordered.push(entry);
	};
	for (const entry of entries) visit(entry);
	return ordered;
}
```

**Practical rule.** `inject` = "other DSH *plugin packages* whose client halves I need"
(graph edges + cordis entry composition). `external` = "module specifiers my bundle
literally `require`s". Both take package names / specifiers, not service names.

Real, shipped examples:

```jsonc
// ui-theme package.json  dsh.client
"dsh": { "client": {
  "inject": [
    "@deepseek-ai/dsh-client-connection",
    "@deepseek-ai/dsh-client-locale",
    "@deepseek-ai/dsh-client-ui-renderer",
    "@deepseek-ai/dsh-client-ui-settings",
    "@deepseek-ai/dsh-api-remotes"
  ],
  "platform": "web",
  "immediately": true
}}
```

```jsonc
// dsh-dream-skin package.json  dsh.client
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": {
    "inject": [
      "@deepseek-ai/dsh-client-runtime",
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-theme",
      "@deepseek-ai/dsh-client-ui-settings",
      "@deepseek-ai/dsh-client-ui-settings-general"
    ],
    "platform": "web",
    "immediately": true
  }
}
```

`external` in the wild (grep over every installed `@deepseek-ai/dsh-*` package.json):

```
dsh-api-session-controller:   external=@deepseek-ai/dsh-api-gateway/client
dsh-api-workspace-controller: external=@deepseek-ai/dsh-api-gateway/client
```

Both are pure browser-half companions of a host API gateway — a plugin that
`require`s another plugin's client bundle.

`ui-renderer` declares only `{"platform":"web","immediately":true}` (no `inject`), because
its only non-seed dependency (`dsh-client-ui-slots`) is a seed word.

### 2.3 How `dsh.client` is consumed, including the bundle-path rule

```js
// MODH:637-667
resolveMeta(loaderName, baseUrl) {
    …
    const { packageName, path: pkgPath } = located;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const dsh = pkg.dsh;
    const decl = parseDshClient(packageName, dsh !== null && typeof dsh === "object" ? dsh.client : void 0);
    if (decl === void 0 || decl.platform !== "web") { this.pkgMeta.set(sourceKey, null); return null; }
    const clientRel = clientExportOf(packageName, pkg.exports);
    if (clientRel === void 0) throw new Error(`client-modules: ${packageName} declares dsh.client but exports no "./client" bundle`);
    const resolved = {
        packageName,
        meta: {
            clientPath: join(dirname(pkgPath), clientRel),
            ...decl.inject !== void 0 ? { inject: decl.inject } : {},
            external: decl.external ?? [],
            immediately: decl.immediately === true
        }
    };
    this.pkgMeta.set(sourceKey, resolved);
    return resolved;
}
```

```js
// MODH:155-166
function clientExportOf(pkgName, exportsField) {
	if (typeof exportsField !== "object" || exportsField === null) return void 0;
	const client = exportsField["./client"];
	if (client === void 0) return void 0;
	if (typeof client === "string") return client;
	if (typeof client === "object" && client !== null) {
		const fallback = client.default;
		if (typeof fallback === "string") return fallback;
	}
	throw new Error(`client-modules: ${pkgName} exports["./client"] must be a string or an object with a string default`);
}
```

So the **minimum viable `package.json`** for a browser-half plugin is:

```jsonc
{
  "type": "module",
  "exports": {
    ".":        { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

`exports["./client"]` may also be `{ "types": "...", "default": "..." }` — only `.default`
is read (**MODH:161-164**), which is why every shipped package uses that form.

Note `dsh.client` and the cordis entry `inject` are **different things** (`inject` there
is a *service* list — see §3.3), and a package may appear in `dsh.client.inject` while the
host row is mounted with its own `inject:` list in the patch (compare **WEBPATCH:181-188**
with ui-theme's `dsh.client.inject`).

---

## 3. `dsh.bundle.patch` / `cordis.patch.yml`

### 3.1 Where the patch is declared and resolved

```js
// BOOT:843-871
function loadProfileDirectory(binName, dir, installAnchor, options = {}) {
	const manifest = readProfileManifest(binName, dir);
	const bundles = manifest.dsh?.profile?.bundles ?? [];
	…
	const layers = bundles.map((packageName) => {
		const packageDir = resolveBundleDir(binName, packageName, installAnchor, dir);
		const declared = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")).dsh?.bundle?.patch;
		if (declared === void 0) throw new Error(`${binName}: profile bundle ${JSON.stringify(packageName)} declares no dsh.bundle in its package.json`);
		const patchPath = join(packageDir, declared);
		return { packageName, packageDir, patchPath, patches: loadOverlayPatches(binName, patchPath) };
	});
	const patchPath = join(dir, PROFILE_PATCH_FILENAME);
	const patches = options.userLayer !== false && existsSync(patchPath) ? loadOverlayPatches(binName, patchPath) : [];
	return { name: basename(dir), dir, layers, patchPath, patches, patchReload };
}
```

Consequences:
- A package that wants its own loader row **must** ship `dsh.bundle.patch` **and** be listed
  in the profile's `dsh.profile.bundles`. Missing patch file = **loud throw** at boot.

  ```js
  // BOOT:1151-1168
  function loadOverlayPatches(binName, file) {
      let content;
      try { content = readFileSync(file, "utf8"); }
      catch (error) { throw new Error(`${binName}: failed to read overlay ${file}: ${String(error)}`); }
      return parsePatchList(binName, file, content, "overlay");
  }
  ```
- The file **must be a top-level YAML array**; a non-array or a non-mapping element throws:

  ```js
  // BOOT:1192-1204
  function parsePatchList(binName, file, content, label) {
      let parsed;
      try { parsed = yaml.load(content, { schema: userPatchesSchema }); }
      catch (error) { throw new Error(`${binName}: failed to parse ${label} ${file}: ${String(error)}`); }
      if (!Array.isArray(parsed)) throw new Error(`${binName}: ${label} ${file} must be a top-level YAML array of loader patch entries`);
      parsed.forEach((entry, index) => {
          if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error(`${binName}: ${label} entry ${index + 1} in ${file} must be a mapping (a loader patch entry)`);
      });
      return anchorInsertedPluginNames(parsed, file);
  }
  ```
- A patch that names an absent row is only a **warning** (per-row Loader warning), so one
  overlay can be shared across surfaces: **BOOT:1180-1185**.

### 3.2 Exact YAML shape for inserting a plugin loader entry

The whole patch grammar is 20 lines. `insert` **appends** to the root entry list when no
`id` is given:

```js
// BOOT:59-107 (same algorithm in cordis-plugin-include)
function applyEntryPatches(data, patches, warn) {
	data = structuredClone(data);
	if (!patches?.length) return data;
	…
	for (const patch of patches) {
		const { id, insert, name, ...overrides } = patch;
		if (insert) {
			if (id) {
				const target = entryMap.get(id);
				if (!target) { warn("patch insert: entry %C not found", id); continue; }
				if (!target.group) { warn("patch insert: entry %C is not a group", id); continue; }
				if (!Array.isArray(target.config)) target.config = [];
				target.config.push(...insert);
			} else data.push(...insert);
			buildMap(insert);
			continue;
		}
		if (!id) { warn("patch: id is required for non-insert patches"); continue; }
		const target = entryMap.get(id);
		if (!target) { warn("patch: entry %C not found", id); continue; }
		if (name && name !== target.name) { warn("patch: name mismatch for %C (expected %C, got %C), skipping", id, target.name, name); continue; }
		for (const [key, value] of Object.entries(overrides)) {
			if (key === "id") continue;
			target[key] = value;
		}
	}
	return data;
}
```

Entry options accepted (the loader's own shape):

```ts
// LD:8-22
export interface EntryOptions {
  /** Stable id inside the containing entry tree. */
  id: string
  /** Module specifier imported by the entry tree. */
  name: string
  /** Config passed to the plugin. */
  config?: any
  /** Marks this entry as a nested group. */
  group?: boolean | null
  /** Prevents this entry and descendants from running. */
  disabled?: boolean | null
  /** Required services or service intercept config for this entry. */
  inject?: Inject | null
}
```

**The minimal, copy-pasteable insert** (this is literally what both reference plugins ship):

```yaml
# dsh-dream-skin/cordis.patch.yml  (identical in shape to the workspace's own file)
# dsh-dream-skin profile patch layer — insert one loader entry for the plugin
# package. The entry is a normal cordis loader entry (id + package name); the
# browser half is picked up by dsh-client-modules through the package's
# dsh.client declaration, exactly like the shipped ui-* packages.
- insert:
    - id: dream-skin
      name: 'dsh-dream-skin'
```

Richer forms, taken from the shipped web bundle patch:

```yaml
# WEBPATCH:135-143 — config + service injection on the inserted row
- insert:
    - id: webserver
      name: '@deepseek-ai/dsh-host-webserver'
      inject: [webStartup]
      config:
        host: !!js ctx.webStartup.host ?? '127.0.0.1'
        port: !!js ctx.webStartup.port ?? 3080
        compression: gzip
```

```yaml
# WEBPATCH:201-202 — the plain browser-roster row
    - id: ui-theme
      name: '@deepseek-ai/dsh-client-ui-theme'
```

```yaml
# WEBPATCH:306-308 — a shipped row that is composed but off
    - id: ui-schedule
      name: '@deepseek-ai/dsh-client-ui-schedule'
      disabled: true
```

```yaml
# C:\Users\wind\.dsh\profiles\web\cordis.patch.yml — the *profile* layer
- id: modlens
  disabled: true
```

Ordering note from the shipped patch banner (**WEBPATCH:1-12**): bundle patches are applied
in `dsh.profile.bundles` order, then the profile's own `cordis.patch.yml`, then `--patch`
overlays; and *"A patch replaces the targeted row's whole `config`, so each row below
restates every key it owns."*

### 3.3 Does the host half need `name` / `inject` / `apply`?

No field is *structurally* mandatory. The loader accepts three plugin shapes:

```ts
// COR registry.d.ts:47-81
export type Plugin<T = any> = Plugin.Function<T> | Plugin.Constructor<T> | Plugin.Object<T>;
export namespace Plugin {
    interface Base<T = any> {
        /** Display name used for fiber diagnostics and logger names. */
        name?: string;
        /** Standard-schema validator applied to config before the plugin starts. */
        Config?: StandardSchemaV1<any, T>;
        /** Services the plugin requires; it only loads while all are available. */
        inject?: Inject;
        /** Service name(s) the plugin provides (read by `Service` and by loaders). */
        provide?: string | string[];
        /** Service names whose intercept config the plugin declares it consumes. */
        intercept?: Dict<boolean>;
    }
    interface Function<T = any> extends Base<T> { (ctx: Context, config: T): any; }
    interface Constructor<T = any> extends Base<T> { new (ctx: Context, config: T): any; }
    /** Object plugin with an `apply(ctx, config)` method. */
    interface Object<T = any> { apply(ctx: Context, config: T): any; }
}
```

In practice a browser-half/host-half plugin package exports, from `lib/index.js`:

```js
// DSHOST:44-47
/** Plugin identity for cordis.yml rows. */
export const name = "dsh-dream-skin";
/** Services required before mounting: the web server routes and the trust fence host list. */
export const inject = ["webServer", "webRuntime"];

// DSHOST:264-287
export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({ … }), "dsh-dream-skin: persistence API routes");
}
```

**`export const name`** — cosmetic/diagnostic (fiber + logger name). Without it, fiber names
fall back to a generated identity.
**`export const inject`** — services that must exist before `apply` runs; the fiber stays
`PENDING` until they do. It is *not* the same as `dsh.client.inject` (package edges).
**`export function apply(ctx)`** — required for anything to happen. Note the browser-side
`exports.apply` is the client plugin body; both halves export the same names, which is why
the dual-face pattern works.

For **dynamic** (in-browser-authored) plugins the object form is mandatory, because the
runtime reads the declaration from the returned plugin:

```js
// CCR:320-323
const declared = new Set(Object.keys(ctx.fiber.inject));
const denyRead = (prop) => {
    if (ctx.get(prop) !== void 0) return rejectGuard(env, `service "${prop}" is not declared by your plugin. Declare it on the plugin you return: { inject: ['${prop}', …], apply(ctx) { … } } — a plain \`function\` has no declaration site, so use the object form. The runtime then parks the package if the provider unloads.`);
```

---

## 4. Host-side route registration

### 4.1 Exact signature

```ts
// WS:30-39
/** Route match kind: 'exact' matches the pathname verbatim; 'prefix' p matches p and p/<anything>. */
export type WebRouteKind = 'exact' | 'prefix';
/** One named route registration. */
export interface WebRoute {
    kind: WebRouteKind;
    /** Absolute pathname, no trailing slash. */
    path: string;
    /** Owns the full response lifecycle (may hold the response open, e.g. SSE). */
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
```

```ts
// WS:84-97
/**
 * Register a named route. Duplicate (kind, path) throws — route patterns are
 * a composition-level contract, so a collision is a misconfiguration.
 * @param route - kind, path, and the owning handler.
 * @returns the disposer removing the route.
 */
register(route: WebRoute): () => void;
/**
 * Register an exact-path HTTP upgrade route. Duplicate paths throw because
 * one socket can have only one protocol owner.
 */
registerUpgrade(route: WebUpgradeRoute): () => void;
```

- `kind: 'exact'` — pathname matches verbatim.
- `kind: 'prefix'` — `p` matches both `p` itself and `p/<anything>`; matching is
  **longest-prefix-wins over the prefix table after an exact-table miss** (**WS:117**).
- The handler owns the response completely: headers, status, body, and even holding the
  connection open (**WS:37-38**).
- `register` returns the **disposer**; always hang it on `ctx.effect` so plugin unload and
  HMR remove the route.
- Unmatched requests during startup fall through to the fallback seat (**WS:60-66**).

### 4.2 `ctx.webRuntime.trustedHosts`

The service face a plugin may rely on, mirrored by a third-party plugin that must not depend
on package internals:

```ts
// BSSRC src/context-types.ts:99-107
/**
 * The web runtime service face (mirror of @deepseek-ai/dsh-web-app's
 * WebRuntimeValues): the bind-derived trust list the /api gateway's fence
 * accepts — LAN IP literals sampled when the server binds all interfaces,
 * plus explicit `--trusted-host` authorities.
 */
export interface SidebarWebRuntime {
  trustedHosts: readonly string[]
}
```

It is produced after the socket binds, by the `web-runtime` row:

```yaml
# WEBPATCH:154-161
    - id: web-runtime
      name: '@deepseek-ai/dsh-web-app'
      inject: [webStartup]
      config:
        openBrowser: !!js ctx.webStartup.openBrowser
        printUrl: true
        surfaceContext: true
        trustedHosts: !!js ctx.webStartup.trustedHosts
```

and consumed by the connection row exactly the same way a plugin would:

```yaml
# WEBPATCH:181-188
    - id: connection
      name: '@deepseek-ai/dsh-client-connection'
      inject: [webRuntime]
      config:
        # LAN literals derived from the active bind plus --trusted-host extras.
        trustedHosts: !!js ctx.webRuntime.trustedHosts
```

So: `export const inject = ["webServer", "webRuntime"]` (**DSHOST:47**), then read
`ctx.webRuntime.trustedHosts` inside the handler (**DSHOST:273**).

### 4.3 The trust-fence pattern (Host header + `sec-fetch-site` + `Origin`)

The authoritative copy — with the *why* — is better-sidebar's original TypeScript:

```ts
// BSSRC src/trust-fence.ts:1-9
/**
 * Browser-trust fence for the sidebar routes, behaviorally identical to the
 * /api gateway's fence in @deepseek-ai/dsh-client-connection
 * (src/api-request-trust.ts + src/loopback-hostname.ts, BSD-3-Clause,
 * copied here because the package does not export these helpers and the
 * plugin must not depend on its internals). Host-header loopback or a
 * configured trusted authority passes; cross-site browser markers refuse.
 * This is a DNS-rebinding / cross-site defense, not authentication.
 */
```

```ts
// BSSRC src/trust-fence.ts:57-84
export function isTrustedApiRequest(request: ApiTrustRequest, trustedHosts: readonly string[]): boolean {
  const host = header(request.headers, 'host')
  if (host === undefined) return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false
  if (header(request.headers, 'sec-fetch-site') === 'cross-site') return false
  // Origin fence: when a browser attaches an Origin it must name this
  // hostname (the Host fence above already bound the authority, so the port
  // must not re-decide trust). Comparing hostname, not host: some Chromium
  // builds (Edge 151) serialize the Origin of a non-default-port loopback page
  // without the port, and refusing those bricks every /sidebar route. Absent
  // Origin is fine — the Host fence above already bound the request. The
  // literal "null" (sandboxed iframes, file: pages) is an opaque origin, refused.
  const origin = header(request.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).hostname === hostUrl.hostname
  } catch {
    return false
  }
}
```

Supporting helpers (same file):

```ts
// BSSRC src/trust-fence.ts:31-55
export function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function canonicalAuthority(entry: string, entryUrl: URL): string {
  const port = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port
  return port === '' ? entryUrl.hostname : `${entryUrl.hostname}:${port}`
}

function isTrustedAuthority(hostUrl: URL, trustedHosts: readonly string[]): boolean {
  return trustedHosts.some((entry) => {
    const entryUrl = parseAuthority(entry)
    if (entryUrl === undefined) return false
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
      ? entryUrl.hostname === hostUrl.hostname
      : entryUrl.host === hostUrl.host
  })
}
```

dream-skin ships a **third copy** with one divergence and one extra hardening step. The
hardening step (refuse a `trustedHosts` entry that WHATWG parsing would silently rewrite —
so a misconfigured entry cannot quietly broaden the grant):

```js
// DSHOST:111-124
function assertTrustedAuthority(entry) {
	const entryUrl = parseAuthority(entry);
	if (entryUrl !== undefined && canonicalAuthority(entry, entryUrl) === entry.toLowerCase()) return;
	throw new Error(`dsh-dream-skin: trustedHosts entry ${JSON.stringify(entry)} is not a bare host[:port] authority`);
}
```

The divergence (⚠️ **`Origin` compared by `host` not `hostname`**):

```js
// DSHOST:144-158
function isTrustedApiRequest(req, trustedHosts) {
	const host = typeof req.headers.host === "string" ? req.headers.host : undefined;
	if (host === undefined) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === undefined) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (req.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = req.headers.origin;
	if (origin === undefined) return true;
	try {
		return new URL(origin).host === hostUrl.host;      // ← better-sidebar compares .hostname
	} catch {
		return false;
	}
}
```

The workspace's own host half currently uses the `host` comparison
(`D:\work\dsh-plugin\dsh-custom-style\lib\index.js:188`:
`return new URL(origin).host === hostUrl.host;`). Per the better-sidebar comment above,
`.hostname` is the safer choice.

### 4.4 Minimal working example (host half)

Reproduced verbatim from a shipped third-party plugin — this is the pattern to copy:

```js
// DSHOST:42 — route prefix owned by the plugin
const API_PREFIX = "/dream-skin/api";

// DSHOST:47
export const inject = ["webServer", "webRuntime"];

// DSHOST:268-287
export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: API_PREFIX,
		handler: async (req, res) => {
			if (!isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)) {
				writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
				return;
			}
			try {
				await handleApi(req, res);
			} catch (error) {
				// Do not echo the internal error back to the browser — the
				// trusted-origin page does not need filesystem paths etc.
				console.error("[dsh-dream-skin] persistence API error:", error);
				writeJson(res, 500, { ok: false, error: { code: "internal", message: "internal error" } });
			}
		}
	}), "dsh-dream-skin: persistence API routes");
}
```

Dispatcher shape worth copying (method fence → content-type fence → capped body read →
method switch), **DSHOST:211-262**, with helpers:

```js
// DSHOST:200-208
function writeJson(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, {
		"content-type": "application/json",
		"cache-control": "no-store"
	});
	res.end(body);
}
```

```js
// DSHOST:216-224 — the content-type fence, with its rationale
	// Content-type fence: only JSON bodies are meaningful here. Without it a
	// cross-site form POST (which the trust fence already blocks via
	// sec-fetch-site) would otherwise be parsed as `{}` and mis-handled. This
	// keeps the surface narrow and matches the official plugin behavior.
	const contentType = typeof req.headers["content-type"] === "string" ? req.headers["content-type"].toLowerCase() : "";
	if (!contentType.startsWith("application/json")) {
		writeJson(res, 415, { ok: false, error: { code: "unsupported-media-type", message: "content-type must be application/json" } });
		return;
	}
```

Body cap (32 MiB in dream-skin, sentinel for 413 rather than 400), **DSHOST:162-198**; the
write path is atomic tmp+rename with a documented Windows fallback, **DSHOST:67-83**.

The browser half then talks to it with a plain `fetch(API_PREFIX, {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({method:"get"})})`.

---

## 5. Slots

`ctx.slots` is **`SlotRegistry`**, provided by `dsh-client-ui-renderer` (its own plugin name
is `"slots"`; `super(ctx, "slots")` at **RND:995**). Registration semantics live in
`SlotCore`, which the shell imports from the `@deepseek-ai/dsh-client-ui-slots` **seed**
(**RND:14**, **SHELL:56** offset 206155).

### 5.1 `ctx.slots.inject(name, cb)` — exact signature

```js
// RND:1000-1074 (doc comment + body)
/**
 * Install an effect for each declaration lifetime of a slot. The callback
 * runs synchronously when the declaration already exists; otherwise it runs
 * inside the declaring `register()` call after the declaration is committed.
 * Collapse disposes the effect and a later declaration runs it again.
 * Callback effects are synchronous disposers; iterable effects install
 * transactionally and dispose in reverse order. The controller belongs to the
 * caller's fiber, so plugin unload cancels a pending wait and removes any
 * active contribution.
 *
 * @param key - declared SlotMap key to depend on.
 * @param callback - creates one disposer or an iterable of disposers.
 * @returns idempotent disposer for the wait and active effect.
 * @throws callback setup failures synchronously when the slot is already declared.
 */
inject(key, callback) {
    const ctx = this.ctx;
    const disposeController = ctx.effect(() => {
        let active;
        let activeEpoch;
        let stopped = false;
        let unsubscribe = () => {};
        const stop = () => { … };
        const reconcile = () => {
            if (stopped) return;
            const spec = this._core.specDynamic(key);
            const epoch = this._core.declarationEpoch(key);
            if (active !== void 0 && activeEpoch === epoch) return;
            const dispose = active;
            active = void 0;
            activeEpoch = void 0;
            dispose?.();
            if (spec === void 0) return;
            const disposeEffect = ctx.effect(callback, `slots.inject(${JSON.stringify(key)}): declaration`);
            active = () => { disposeEffect(); };
            activeEpoch = epoch;
        };
        …
        unsubscribe = this._core.subscribeDeclaration(key, changed);
        try { reconcile(); } catch (error) { stop(); throw error; }
        return stop;
    }, `slots.inject(${JSON.stringify(key)})`);
    return () => { disposeController(); };
}
```

Key consequences:
- **The callback's return value is the disposer** — so `() => ctx.slots.register(...)` is the
  idiom, because `register` itself returns a disposer.
- The slot may not be declared yet. `inject` **waits** (correct for `settings.section`, which
  only exists while the settings shell occupant is mounted).
- If it is already declared, the callback runs **synchronously** and its throws propagate to
  the caller. If it runs later, throws are re-thrown in a microtask (**RND:1047-1061**) —
  i.e. they become *unhandled* errors, not apply-time failures.
- Unloading the caller's fiber cancels the wait and removes the contribution.

The production comment on why this indirection exists:

```ts
// BSSRC src/client/index.tsx:443-454
    // The "Side card" settings section: appears in the DSH Settings shell
    // once the shell's declaration is on the ledger (slots.inject waits for
    // it); the section reads/writes the prefs through the plugin's own
    // fenced settings route, keeps the shared store in sync, and renders the
    // declarative enable/disable inventory from the tab/viewer registry.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'better-sidebar',
      order: 100,
      label: () => t('settingsNav'),
      inject: () => ({ store: sidebarStore, service }),
    }, SideCardSection))
```

### 5.2 `ctx.slots.register(options, Component)` — exact signature

Public wrapper (hangs the registration on the caller's fiber):

```js
// RND:1388-1391
SlotRegistry.prototype.register = function register(rawOptions, component) {
    const options = rawOptions;
    return this.ctx.effect(() => this["_register"](options, component), "slots.register()");
};
```

```js
// RND:1250-1271
/** Delegating registration path: factory minting + registrant stamp + core write + instance-axis bookkeeping. */
_register(options, component) {
    const store = typeof options.store === "function" ? options.store() : options.store;
    const registrant = options.registrant ?? this.ctx.fiber?.name;
    const erased = {
        ...options,
        ...store !== void 0 ? { store } : {},
        ...registrant !== void 0 ? { registrant } : {}
    };
    const dispose = this._core.register(erased, component);
    if (store !== void 0) {
        const scope = this._core.specDynamic(options.name).scope;
        this._acquire(store, scope);
    }
    let disposed = false;
    return () => {
        if (disposed) return;
        disposed = true;
        dispose();
        if (store !== void 0) this._release(store);
    };
}
```

`store` accepts **either** a handle or a zero-arg factory returning one (**RND:1252**) — but
`dsh.better-sidebar`'s mirror types `inject`/`store` loosely (**BSSRC
src/context-types.ts:110-125**).

Full options set accepted by `SlotCore.register`, with the exact validation throws:

```js
// SHELL:56 (byte offset ~199798) — SlotCore.register
register(t, r) {
    const i = this.records.get(t.name);
    if (!i?.spec) throw new Error(`slot "${t.name}" is not declared (a parent entry's children table must declare it)`);
    const s = i.spec, a = t.priority ?? 0,
        c = m => `at priority ${a}${m.registrant !== void 0 ? ` (registered by ${m.registrant})` : ""} — register at a different priority to shadow it (lowest renders)`;
    switch (s.kind) {
        case "single": {
            const m = i.entries.find(g => (g.options.priority ?? 0) === a);
            if (m) throw new Error(`single slot "${t.name}" already has a registration ${c(m)}`);
            break;
        }
        case "keyed": {
            if (t.key === void 0) throw new Error(`keyed slot "${t.name}" requires options.key`);
            const m = i.entries.find(g => g.options.key === t.key && (g.options.priority ?? 0) === a);
            if (m) throw new Error(`keyed slot "${t.name}" already has an entry for key "${t.key}" ${c(m)}`);
            break;
        }
        case "list": {
            if (t.id === void 0) throw new Error(`list slot "${t.name}" requires options.id`);
            const m = i.entries.find(g => g.options.id === t.id && (g.options.priority ?? 0) === a);
            if (m) throw new Error(`list slot "${t.name}" already has an entry with id "${t.id}" ${c(m)}`);
            break;
        }
        case "chain": if (t.select === void 0) throw new Error(`chain slot "${t.name}" requires options.select`); break;
    }
    if (t.children) for (const m of Object.keys(t.children)) {
        const g = this.records.get(m);
        if (g?.spec) throw new Error(`slot "${m}" is already declared (by ${g.declaredBy ?? "an unknown entry"})`);
    }
    if (t.store !== void 0 && typeof t.store != "function") {
        const m = this.handleScopes.get(t.store);
        if (m && m.scope !== s.scope) throw new Error(`store handle mounted under "${t.name}" (scope "${s.scope}") is already mounted under scope "${m.scope}" — one handle, one scope`);
        m ? m.count += 1 : this.handleScopes.set(t.store, { scope: s.scope, count: 1 });
    }
    const h = { component: r, options: {…} , … };
    const p = [...i.entries, h];
    if (p.sort(s.kind === "list"
        ? (m, g) => (m.options.priority ?? 0) - (g.options.priority ?? 0) || (m.options.order ?? 0) - (g.options.order ?? 0)
        : (m, g) => (m.options.priority ?? 0) - (g.options.priority ?? 0)), i.entries = p, this.markDirty(t.name, i), t.children) { … }
    return () => { i.entries.includes(h) && (i.entries = i.entries.filter(m => m !== h), this.markDirty(t.name, i), this.releaseEntry(h)) };
}
```

| Option | Type | Required by | Effect |
|---|---|---|---|
| `name` | `string` | always | Target slot key. **Mandatory**; the runner's facade rejects a missing one: `"slots.register(options, component) needs an options object with a 'name'"` (**CCR:258-261**) |
| `id` | `string` | **`list`** slots | Cell key. A **fresh** id is added beside shipped entries; reusing a shipped id **replaces** it (**CCR:3597-3603**) |
| `key` | `string` | **`keyed`** slots | Cell key |
| `select` | `(owner) => unknown` | **`chain`** slots | Election; returns matched value or `null` to pass on (**BSSRC src/context-types.ts:116-117**) |
| `order` | `number` | optional | Position among entries, ascending, default `0` |
| `priority` | `number` | optional | Shadowing tier; lowest renders. Same priority + same cell ⇒ **throw** |
| `label` | `string \| (() => string)` | optional | Display text where the owner projects one; a thunk is re-read on every projection. Resolved with `resolveSlotLabel` (**SETG:570**) |
| `locale` | `string` | optional | Namespace name for the `t` prop (see §8) |
| `store` | handle \| `() => handle` | optional | Gives the component `useStore` + `actions` |
| `inject` | `(...args) => Record<string, unknown>` | optional | Registration-private props (see §5.4) |
| `children` | `Record<string, {kind, scope}>` | optional | **Declares** child slots (**RND:1250-1263**, **SHELL:56** above) |
| `registrant` | `string` | optional | Diagnostic owner; defaults to `ctx.fiber?.name` (**RND:1253**) |

### 5.3 `settings.section` — required options, props, real live registration

Contract:

```ts
// SETT:56-71
        /**
         * One settings page per list entry. Registrant options carry the nav
         * identity: `id` (section key, drives `only` filtering), `order` (nav
         * position), `label` (registrant-localized display text — the registrant
         * re-registers with fresh text on locale change, so the shell never
         * subscribes locale state; the ledger bump doubles as the shell's
         * re-render trigger). Sections render inside the panel content column.
         */
        'settings.section': {
            kind: 'list';
            scope: 'root';
            owner: SettingsSectionOwnerProps;
        };
```

```ts
// SETT:141-151
/**
 * Owner share of a settings section entry. The shell owns modal visibility
 * and navigation; a section's data arrives through its own inject faces and
 * stores. `close` is the one shell affordance a section receives, for flows
 * that leave settings altogether (starting a session from a section) …
 */
export interface SettingsSectionOwnerProps {
    /** Close the settings panel (the shell owns the open state). */
    close: () => void;
}
```

Machine-readable summary published by the client cordis tool:

```js
// CCR:3871-3920
{
    key: "settings.section",
    kind: "list",
    scope: "root",
    summary: "One settings page per list entry.",
    registerOptions: [
        { name: "id",    requirement: "required", type: "string",
          doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it." },
        { name: "order", requirement: "optional", type: "number",
          doc: "Position among the entries, ascending (default 0)." },
        { name: "label", requirement: "optional", type: "string | (() => string)",
          doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering." }
    ],
    ownerProps: ["… export interface SettingsSectionOwnerProps { close: () => void }"],
    standardProps: [
        "useResource: UseResource",
        "useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
        "usePanelInfo: UsePanelInfo",
        "useSessions: UseSessions",
        "useSessionPendingInteraction: UseSessionPendingInteraction",
        "useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
    ],
    declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
    occupants: [
        "client-ui-agent-preset AgentPresetSection id 'agent-presets'",
        "client-ui-settings-general GeneralSection id 'general'",
        "client-ui-settings-models ModelsSection id 'models'",
        "client-ui-settings-plugins PluginsSettingsSection id 'plugins'"
    ],
    replaceRisk: "none",
    example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.section', () => ctx.slots.register(\n      { name: 'settings.section', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
    source: "packages/client/ui-settings/src/client/contract/slots.ts:54"
}
```

The declaration site (who actually puts `settings.section` on the ledger — and wraps it in
the settings shell so it disappears when the shell unloads):

```js
// SETG:601-631
ctx.slots.inject("sidebar.settings", () => ctx.slots.register({
    name: "sidebar.settings",
    locale: NS,
    children: {
        "settings.trigger":  { kind: "single", scope: "root" },
        "settings.header":   { kind: "single", scope: "root" },
        "settings.action":   { kind: "list",   scope: "root" },
        "settings.close":    { kind: "single", scope: "root" },
        "settings.section":  { kind: "list",   scope: "root" },
        "settings.onboarding": { kind: "list", scope: "root" }
    },
    inject: shellInjected
}, SettingsRoot));
```

How the shell renders the selected section (owner props = `{ close }`; third argument is a
filter), and how it builds the nav rows:

```js
// SETG:165-168
                    }), (0, react_jsx_runtime.jsx)("div", {
                        className: SettingsRoot_module_css_default.options,
                        children: active !== void 0 && renderSlot("settings.section", { close: onClose }, { only: active })
                    })]
```

```js
// SETG:559-583
sections: {
    getSnapshot: () => {
        const version = ctx.slots.getVersion("settings.section");
        const revision = ctx.locale.getSnapshot().revision;
        if (version !== rowsVersion || revision !== rowsRevision) {
            rowsVersion = version; rowsRevision = revision;
            rows = ctx.slots.entries("settings.section").map((e) => ({
                id: e.options.id ?? "",
                order: e.options.order ?? 0,
                label: (0, _deepseek_ai_dsh_client_ui_slots.resolveSlotLabel)(e.options.label) ?? ""
            })).sort((a, b) => a.order - b.order);
        }
        return rows;
    },
    subscribe: (listener) => {
        const offLedger = ctx.slots.subscribe("settings.section", listener);
        const offLocale = ctx.locale.subscribe(listener);
        return () => { offLedger(); offLocale(); };
    }
},
```

**REAL live `settings.section` registration #1 — dsh-dream-skin** (a tabs page, exactly the
architecture this project needs: the section declares one private child slot, then registers
one component per tab into it):

```js
// DS:5367-5389
			// Register our own "Theme / 外观" settings section. It appears in the
			// settings left-nav and hosts all skin features (skin, wallpaper,
			// advanced wallpaper, accent, theme packs) under a single category.
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dream-skin",
				order: 10,
				label: "Theme / 外观",
				locale: SETTINGS_NS,
				children: { "settings.dreamSkin.item": {
					kind: "list",
					scope: "root"
				} }
			}, DreamSkinSection));

			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin",
				order: 20,
				store: skinStore,
				locale: SETTINGS_NS,
				inject: skinInjected
			}, SkinRow));
```

…and the section component renders the child slot itself:

```js
// DS:5045-5052
			return react.createElement("section", {
				style: styles.section,
				children: renderSlot("settings.dreamSkin.item", {})
			});
```

(That pattern is the supported way to get tabs: a private child slot declared by your own
section. `ui-settings-plugins` does the same with `settings.plugins.tab` — see **SETT:72-84**
and **CCR:3865-3866**.)

**REAL live `settings.section` registration #2 — dsh-better-sidebar** (**BSSRC
src/client/index.tsx:448-454**, quoted in §5.1).

**REAL live `settings.section` registration #3 — the shipped General section itself**:

```js
// SETG:651-661
ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "general",
    order: 0,
    label: () => t("general.nav"),
    locale: NS,
    children: { "settings.general.item": {
        kind: "list",
        scope: "root"
    } }
}, GeneralSection));
```

### 5.4 `settings.general.item` — required options, props, real live registration

```ts
// SETT:100-125
        /**
         * One preference row inside the General section — the additive seat for a
         * single setting that needs no page of its own (a whole page is
         * `settings.section`), contributed by the feature plugin that owns the
         * preference (locale → Language, ui-theme → Appearance, ui-conversation →
         * Composer Enter). Options: `id` (row key), `order` (row position). The
         * section column only stacks rows, so a row draws its own internals,
         * including its label: nothing projects a `label` here and the owner passes
         * no props at all — copy, current value, and the write path are all yours,
         * through your own inject face and `host.call`. Declared at runtime by
         * ui-settings-general's General entry; the type lives here with every other
         * settings slot type, …
         */
        'settings.general.item': {
            kind: 'list';
            scope: 'root';
            owner: SettingsGeneralItemOwnerProps;
        };
}

/** Owner share of a General preference row (the section supplies nothing). */
export interface SettingsGeneralItemOwnerProps {
    /** Marker field: item owner props are intentionally empty. */
    children?: never;
}
```

- **`id` is required**, `order` optional, **`label` is ignored** (nothing projects it) —
  **CCR:3592-3641**, `declaredBy: "an entry in 'settings.section' (client-ui-settings-general), so it exists while that entry is mounted"`.
- Owner props are empty (`children?: never`), so a row is a pure self-contained component.

**REAL live registration — ui-theme's Appearance row** (the best example: store + locale +
inject):

```js
// THM:1477-1500
			const store = createAppearanceRowStore();
			let bound;
			…
			const injected = (actions) => {
				bound = actions;
				sync(theme.getTheme());
				return { setTheme: (id) => {
					theme.setTheme(id);
				} };
			};
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "appearance",
				order: 10,
				store,
				locale: SETTINGS_NS,
				inject: injected
			}, AppearanceRow));
```

```js
// THM:1501-1515
			const fontSizeInjected = (actions) => {
				fontSizeBound = actions;
				sync(theme.getTheme());
				return { setFontSize: (px) => {
					theme.setFontSize(px);
				} };
			};
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "font-size",
				order: 11,
				store: fontSizeStore,
				locale: SETTINGS_NS,
				inject: fontSizeInjected
			}, FontSizeRow));
```

### 5.5 How `store` + `props.useStore` works

```js
// RND:599-627
function standardKit(host, entry, scope, rootBinding, scopeBinding) {
    const standard = standardProps(scope, rootBinding, scopeBinding);
    const kit = { ...standard };
    if (entry.locale !== void 0) {
        const face = host.locale;
        if (face === void 0) throw new SlotAssemblyError(`entry declares locale namespace '${entry.locale}' but no locale face is installed (locale plugin missing from the composition?)`);
        kit["t"] = localeSeat(face, entry.locale);
    }
    const scopedStoreBinding = scopeBinding?.key === void 0 ? void 0 : scopeBinding;
    const store = host.storeOf(entry, scopedStoreBinding);
    if (store !== void 0) {
        kit["useStore"] = observableHook(store);
        kit["actions"] = store.actions;
    }
    if (entry.children !== void 0) {
        kit["renderSlot"] = boundRenderSlot(host, entry);
        if (Object.values(entry.children).some((spec) => spec.kind === "chain")) kit["renderSlotChain"] = boundRenderSlotChain(host, entry);
        if (Object.values(entry.children).some((spec) => spec.scope === "session")) {
            const adapter = host.scope("session");
            if (adapter === void 0) throw new SlotAssemblyError(`entry declares a session child without an installed 'session' scope adapter`);
            kit["SessionProvider"] = scopeAreaProvider(adapter);
        }
    }
    return { kit, standard, actions: store?.actions };
}
```

So a component with `store` gets **two** props: `useStore` (a uSES selector hook) and
`actions` (the store's action object). Consume them as:

```js
// THM:74-77 — AppearanceRow
function AppearanceRow({ t, setTheme, useStore }) {
    const preference = useStore((s) => s.preference);
```

```js
// THM:955-956 — FontSizeRow
function FontSizeRow({ t, setFontSize, useStore }) {
    const fontSize = useStore((s) => s.fontSize);
```

Store instance resolution (root slots get one instance; scoped slots get one per session id):

```js
// RND:1328-1345
resolveStore(handle, scopeBinding) {
    const record = this._stores.get(handle);
    if (record === void 0) throw new Error("store handle is not registered (entry unloaded, or the handle never went through register)");
    let key;
    if (record.scope === "root") key = ROOT_INSTANCE_KEY;
    else {
        if (scopeBinding === void 0) throw new Error(`${record.scope} store resolution requires a session id`);
        key = scopeBinding.key;
        this.bindStoreScope(scopeBinding);
    }
    let instance = record.instances.get(key);
    if (instance === void 0) {
        instance = record.scope === "root" ? handle.create() : handle.create(key);
        record.instances.set(key, instance);
    }
    return instance;
}
```

### 5.6 How `inject` works

`inject` is a per-registration factory run on the **same cache axis as the registration**.
It receives the slot's binding key (for `keyed` slots) and the store's `actions`, and its
returned object is spread into the component's props:

```js
// RND:333-340
function runInject(entry, binding, actions) {
    const inject = entry.inject;
    if (!inject) return EMPTY_INJECTED_PROPS;
    const args = [];
    if (binding !== void 0) args.push(binding.key);
    if (actions !== void 0) args.push(actions);
    return bindInjectSources(inject(...args));
}
```

```js
// RND:397-417
function cachedRootInject(entry, actions) {
    let props = rootInjectCache.get(entry);
    if (!props) { props = runInject(entry, void 0, actions); rootInjectCache.set(entry, props); }
    return props;
}
function cachedSessionInject(entry, binding, actions) {
    let perBinding = sessionInjectCache.get(entry);
    if (!perBinding) { perBinding = /* @__PURE__ */ new WeakMap(); sessionInjectCache.set(entry, perBinding); }
    let props = perBinding.get(binding);
    if (!props) { props = runInject(entry, binding, actions); perBinding.set(binding, props); }
    return props;
}
```

**Why `inject` exists at all**: the returned props are an escape hatch for wiring that must
not be re-created per render — the theme rows use it to capture the store's `actions` and
push a synchronous store sync at the moment the row mounts (**THM:1486-1492**,
**DS:5340-5366**). It is *not* a general prop channel: `useStore`/`actions`/`t`/`renderSlot`
all come from the standard kit.

**Full props object assembled for one rendered entry** (later spreads win — the owner wins
over everything):

```js
// RND:652-658
function renderEntry(slotKey, Comp, kit, standard, injected, slotInjected, ownerProps, hookContext, hasHookContext) {
    if (slotInjected.slotHookFactories === void 0) return (0, react_jsx_runtime.jsx)(Comp, {
        ...kit,
        ...injected,
        ...slotInjected.props,
        ...ownerProps
    });
```

### 5.7 `renderSlot` — the child-slot outlet available to a registrant

Only an entry that **declares** `children` receives `renderSlot` (**RND:613-615**). Signature
`(key, ownerProps, opts?)`:

```js
// RND:279-297
const renderSlotCache = /* @__PURE__ */ new WeakMap();
function boundRenderSlot(host, entry) {
    let binding = renderSlotCache.get(entry);
    if (!binding) {
        binding = (key, owner, opts) => {
            if (!host.isLive(entry)) throw new _deepseek_ai_dsh_client_ui_slots.StaleAuthorizationError(`renderSlot('${key}') from a disposed registration`);
            const declared = entry.children?.[key];
            if (declared === void 0) throw new _deepseek_ai_dsh_client_ui_slots.SlotOwnershipError(`slot '${key}' is not declared by this entry's children`);
            if (declared.kind === "chain") throw new _deepseek_ai_dsh_client_ui_slots.SlotOwnershipError(`slot '${key}' is declared 'chain' — use renderSlotChain`);
            return (0, react_jsx_runtime.jsx)(SlotOutlet, { slotKey: key, ownerProps: owner, opts });
        };
        renderSlotCache.set(entry, binding);
    }
    return binding;
}
```

`opts` supports `{ only, fallback, overlay }`:

```js
// RND:866-869
let list = [...rows].sort((a, b) => a.order - b.order);
if (opts?.only !== void 0) list = list.filter((item) => item.id === opts.only);
if (list.length === 0) return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: opts?.fallback ?? null });
```

`ctx.slots.*` inspection surface (useful in a picker panel): `entries(key)`,
`entriesOfSlot(key)`, `getVersion(key)`, `subscribe(key, fn)`, `spec(key)`, `snapshot(root?)`,
`onEntryError(fn)`, `install(renderer)`, `installLocale(face)`, `installScope(scope, adapter)`,
`provideRoot(contribution)`, `renderSlot(key, owner)` (root only) — **RND:1000-1391**.

---

## 6. React component conventions

### 6.1 They are plain React function components using `React.createElement` / `jsx-runtime`

Shipped bundles use `react/jsx-runtime` and the compiled `jsx`/`jsxs` calls:

```js
// THM:7
let react_jsx_runtime = require("react/jsx-runtime");
```

```js
// THM:74-80
function AppearanceRow({ t, setTheme, useStore }) {
    const preference = useStore((s) => s.preference);
    return (0, react_jsx_runtime.jsxs)("div", {
        className: AppearanceRow_module_css_default.group,
        children: [(0, react_jsx_runtime.jsx)("div", {
            className: AppearanceRow_module_css_default.title,
            children: t("appearance.title")
        }),
```

The model-facing documentation of the slot system uses the classic factory instead —
either works, both are the same React element:

```js
// CCR:3918
example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.section', () => ctx.slots.register(\n      { name: 'settings.section', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
```

Hand-written plugins use `react.createElement` / `react.Fragment` directly and get React via
`require("react")` (**DS:45-46**). The renderer itself is written that way:

```js
// RND:644-650
return (0, react_jsx_runtime.jsx)(Comp, {
    ...kit, ...injected, ...slotInjected.props, ...contextual, ...ownerProps
});
```

Hooks are ordinary React hooks from the `react` seed:

```js
// RND:634-637
const contextual = (0, react.useMemo)(() => { … }, [ … ]);
```
```js
// SETG:180-182
const [open, setOpen] = (0, react.useState)(false);
const [activeId, setActiveId] = (0, react.useState)(void 0);
```
```js
// RND:487
return (0, react.useSyncExternalStore)(subscription?.subscribe ?? noopSubscribe, subscription?.getRevision ?? zeroRevision);
```

### 6.2 Which `require` specifier for React

`react` and `react/jsx-runtime` (and `react-dom`, `react-dom/client`) are **seed words**
(§1.3) — require them by that exact name. Never bundle a second React.

### 6.3 What props a component actually receives

Full spread order (**RND:652-658**): `kit` → `injected` → `slotInjected.props` → `contextual`
→ `ownerProps`.

`kit` = standard root props + `t` (if `locale`) + `useStore`/`actions` (if `store`) +
`renderSlot`/`renderSlotChain`/`SessionProvider` (if `children`).

The "standard" props for **every root-scope slot** (`settings.section`,
`settings.general.item`, `shell.overlay`, `settings.trigger`, …, per **CCR:3619-3626**):

| Prop | Type | Provided by |
|---|---|---|
| `useResource` | `UseResource` | `dsh-client-resources` — `ctx.slots.provideRoot({ keyedHooks: { resource: (address) => resources.source(address) } })` (**resources/lib/client.js:176**) |
| `useWorkspaces` | `SnapshotSelectorHook<WorkspaceSnapshot>` | `dsh-client-ui-workspace` — `ctx.slots.provideRoot({ hooks: { workspaces: workspaces.list } })` (**ui-workspace/lib/client.js:2730**) |
| `usePanelInfo` | `UsePanelInfo` | `dsh-client-ui-layout` (**ui-layout/lib/client.js:519-522**) |
| `useSessions` | `UseSessions` | `dsh-client-ui-session` (**ui-session/lib/client.js:321-324**) |
| `useSessionPendingInteraction` | `UseSessionPendingInteraction` | same, `sessionPendingInteraction: service.pendingInteractions` |

Missing a strict standard hook is a **loud assembly error**, not a fallback:

```js
// RND:538-548
function materializeStandardBinding(binding, optional) {
    const standard = { ...binding.props };
    for (const [name, source] of Object.entries(binding.hooks)) {
        if (source === void 0 && !optional) throw new SlotAssemblyError(`strict standard hook '${name}' has no source`);
        standard[(0, _deepseek_ai_dsh_client_ui_slots.standardHookPropName)(name)] = optional ? maybeObservableHook(source) : observableHook(source);
    }
    …
}
```

**Naming rule.** Every hook name is exposed as `use<Capitalized(name)>`:

```js
// SHELL:56 (byte offset ~199800)
function Rc(t){return`use${t[0]?.toUpperCase()??""}${t.slice(1)}`}
```

…and that is exactly how `store`/`hooks` sources become `useStore` / `useSessions` /
`usePanelInfo` / **`use<YourName>`** — including for your own `inject: { hooks: { … } }`
faces (**RND:342-357**, **RND:374-380**).

### 6.4 Design-token conventions and the shared primitive module

**`@deepseek-ai/dsh-client-ui-primitives`** (a seed word) exports 123 names (plus the module
marker `__proto__`). Full list as frozen in the shell bundle (**SHELL:114**, byte offset
≈553,000 region):

Components: `BrandWordmark`, `Button`, `CodeBlock`, `ConnectionIndicator`, `DiffBlock`,
`DisclosureRow`, `FileTypeIcon`, `FishLogo`, `HoverCard`, `Input`, `JsonBlock`, `JsonTree`,
`LinkIcon`, `MarkdownText`, `Menu`, `Modal`, `OnboardingSurface`, `Pill`, `ReadBlock`,
`ReferenceIcon`, `RiskConfirmation`, `SearchBlock`, `StateDot`, `Switch`, `Tag`,
`TerminalBlock`, `Toast`, `Tooltip`, `WebBlock`.

Hooks / helpers: `useAnchoredMaxHeight`, `useAnchoredPosition`, `useDismissOnOutsidePointer`,
`writeClipboard`, `classifyFileType`, `classifyLinkPath`, `diffTotals`,
`extractMarkdownPlainText`, `fileExtension`, `fileSizeText`, `projectUserText`,
`rankByName`, `relativeTime`, `FISH_LOGO_PATH`, `FISH_LOGO_VIEWBOX`,
`DEFAULT_DIFF_MAX_LINES`, `DEFAULT_READ_MAX_LINES`, `DEFAULT_SEARCH_MAX_LINES`,
`DEFAULT_TERMINAL_MAX_LINES`.

Icons: ~60 `Icon*` exports, e.g. `IconLightOutline16`, `IconDarkOutline16`,
`IconFollowsystemOutline16`, `IconChevronUpOutline14`, `IconChevronDownOutline14`,
`IconCloseOutline16`, `IconSettingsOutline16`, `IconPlusOutline16`, `IconTrashOutline16`,
`IconCheckOutline16`, `IconRefreshOutline16`, `IconSearchOutline16`, `IconWarningOutline16`.

Real usage (**THM:8**, **THM:56-67**, **THM:985-994**):

```js
// THM:52-68
const CUBES = [
    { id: "light",  labelKey: "appearance.light",  Icon: _deepseek_ai_dsh_client_ui_primitives.IconLightOutline16 },
    { id: "dark",   labelKey: "appearance.dark",   Icon: _deepseek_ai_dsh_client_ui_primitives.IconDarkOutline16 },
    { id: "system", labelKey: "appearance.system", Icon: _deepseek_ai_dsh_client_ui_primitives.IconFollowsystemOutline16 }
];
```

`@deepseek-ai/dsh-client-ui-dockkit` (also a seed) is the second shared surface — dock
panes/splits (`DockSurface`, `DockController`, `DOCK_ZONES`, `planAddTab`, `Sequencer`, …;
**SHELL:114**). Useful if the picker needs a docked palette rather than a modal.

**Token vocabulary.** The whole token sheet is design-platform CSS shipped inside ui-theme.
Light values are declared on `body` (**THM:1053**, byte offset 49286), dark on
`body[data-ds-dark-theme]` (**THM:1053**, byte offset 54596). The exact names present in that
stylesheet (79 `--dsw-alias-*` names, extracted from **THM:1053–1062**):

- **Surfaces:** `--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`, `--dsw-alias-bg-layer-2`,
  `--dsw-alias-bg-layer-3`, `--dsw-alias-bg-module-platform`, `--dsw-alias-bg-overlay`,
  `--dsw-alias-bg-multi-select`, `--dsw-alias-bg-skeleton`, `--dsw-alias-bg-mask-1`,
  `--dsw-alias-bg-mask-2`, `--dsw-alias-bg-mask-3`, `--dsw-alias-bg-mask-drop`,
  `--dsw-alias-bg-mask-photo`, `--dsw-specific-sidebar-fill`
- **Borders:** `--dsw-alias-border-l1`, `--dsw-alias-border-l2`,
  `--dsw-alias-border-l2-darkmode-thin`, `--dsw-alias-border-l3`, `--dsw-alias-border-l4`,
  `--dsw-alias-border-inverted`, `--dsw-alias-border-inverted2`
- **Labels / text:** `--dsw-alias-label-primary`, `--dsw-alias-label-primary-bluish`,
  `--dsw-alias-label-primary-dimmed`, `--dsw-alias-label-primary-foreground`,
  `--dsw-alias-label-primary-inverted`, `--dsw-alias-label-secondary`,
  `--dsw-alias-label-tertiary`, `--dsw-alias-label-caption`, `--dsw-alias-label-dimmed`,
  `--dsw-alias-link`
- **Accent / brand:** `--dsw-alias-brand-primary`, `--dsw-alias-brand-primary-invert`,
  `--dsw-alias-brand-primary-new-colorprimary-new-color`, `--dsw-alias-brand-text`
- **Interactive:** `--dsw-alias-interactive-bg-hover`, `--dsw-alias-interactive-bg-hover-solid`,
  `--dsw-alias-interactive-bg-hover-accent`, `--dsw-alias-interactive-bg-hover-danger`,
  `--dsw-alias-interactive-bg-active`
- **Buttons:** `--dsw-alias-button-primary-fill`, `--dsw-alias-button-primary-hover`,
  `--dsw-alias-button-primary-dimmed`, `--dsw-alias-button-contrast-fill`,
  `--dsw-alias-button-elevated-fill`, `--dsw-alias-button-floating-fill`,
  `--dsw-alias-button-floating-hover`, `--dsw-alias-button-ghost-active-fill`,
  `--dsw-alias-button-ghost-active-border`, `--dsw-alias-button-ghost-active-hover`,
  `--dsw-alias-button-info-fill`, `--dsw-alias-button-info-hover`,
  `--dsw-alias-button-tool-bar-fill`, `--dsw-alias-button-tool-bar-fill-invisible`,
  `--dsw-alias-button-tool-bar-hover`
- **State:** `--dsw-alias-state-error-primary`, `--dsw-alias-state-error-secondary`,
  `--dsw-alias-state-success-primary`, `--dsw-alias-state-success-secondary`,
  `--dsw-alias-state-success-tertiary`, `--dsw-alias-state-warn-primary`,
  `--dsw-alias-state-warn-secondary`, `--dsw-alias-state-warn-tertiary`,
  `--dsw-alias-state-warn-label`, `--dsw-alias-state-business-primary`,
  `--dsw-alias-state-business-tertiary`
- **Markdown / code:** `--dsw-alias-markdown-code-block`,
  `--dsw-alias-markdown-code-block-banner`, `--dsw-alias-markdown-inline-code`,
  `--dsw-alias-markdown-citation`, `--dsw-alias-markdown-tag`,
  `--dsw-alias-markdown-placeholder`, `--dsw-alias-markdown-code-segment-selected`,
  `--dsw-alias-markdown-code-segment-unselected`
- **Scrollbar:** `--dsw-alias-scrollbar-bg-l1`, `--dsw-alias-scrollbar-bg-l2`,
  `--dsw-alias-scrollbar-hover-l1`, `--dsw-alias-scrollbar-hover-l2`
- **Chrome:** `--dsw-alias-toast-bg`, `--dsw-alias-tooltip-bg`

Plus non-alias families in the same sheets: `--dsw-static-*` (raw palette),
`--dsw-font-*`, `--dsw-shadow-lv1..lv3`, `--dsw-elevation-stroke`,
`--dsw-elevation-panel/prominent/soft`, `--dsw-linear-gradient-think`,
`--dsw-corner-shape`, `--dsh-scrollbar-*`, `--dsh-content-font-size*`
(**THM:1047**, **THM:1050**, **THM:1056**, **THM:1059**).

Only **13** of these are in the *official override catalog* (`BUILTIN_INSPECT_TOKENS`,
**THM:1131-1230**) — see §9.

Two concrete style idioms from shipped rows (copy these):

```css
/* THM:26 — AppearanceRow.module.css */
._8HJdBW_group{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}
._8HJdBW_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
._8HJdBW_themeCube{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:20px;…}
._8HJdBW_themeCube:hover:not(._8HJdBW_selected){background:var(--dsw-alias-interactive-bg-hover)}
._8HJdBW_selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}
```

```css
/* THM:918 — FontSizeRow.module.css */
.bVCLcG_row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}
.bVCLcG_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}
.bVCLcG_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.bVCLcG_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}
.bVCLcG_stepper{background:var(--dsw-alias-bg-module-platform);border-radius:18px;…}
```

> ⚠️ **No shared layout helper exists.** Nothing in the shipped packages exposes a
> `SettingSection`/`Row` wrapper: `settings.general.item` has *no* owner props at all
> (**SETT:121-125**), and `settings.section` receives only `close` (**SETT:148-151**). Each
> section/row draws its own internals. The de-facto convention is the CSS above:
> full-width flex row, `padding: 16px 0`, `border-bottom: .5px solid var(--dsw-alias-border-l2)`,
> title `14px/22px var(--dsw-alias-label-primary)`, description `12px/18px
> var(--dsw-alias-label-tertiary)`, controls right-aligned.

### 6.5 Per-entry failure containment (what happens if your component throws)

```js
// RND:509-533
/**
 * Per-entry isolation: one registrant crashing (component render or inject
 * factory) must not take down siblings. Assembly errors (missing providers)
 * rethrow — a miswired shell must fail loud, not degrade into fallbacks.
 * Every catch reports through `onEntryError` (the ledger's supervision
 * seam); for shadowing kinds the report abdicates the entry, the outlet
 * re-renders onto the cell's next survivor, and this boundary's crash face
 * only shows until that re-render lands (permanently once the cell is dry —
 * the outlet then owns the crash face).
 */
var SlotErrorBoundary = class extends react.Component {
    state = { failed: false };
    static getDerivedStateFromError(error) {
        if (error instanceof SlotAssemblyError) throw error;
        return { failed: true };
    }
    componentDidCatch(error) {
        console.error(`slot entry crashed in '${this.props.slotKey}':`, error);
        this.props.onEntryError(error);
    }
    render() {
        if (this.state.failed) return (0, react_jsx_runtime.jsx)("div", { "data-slot-error": this.props.slotKey });
        return this.props.children;
    }
};
```

So: a component render throw inside `settings.section` **crashes only your section** and
paints `<div data-slot-error="settings.section">`. But an **inject-factory** throw is not
inside a React boundary (it runs during kit synthesis) — it propagates. Wrap risky work in
the component, not in `inject`.

---

## 7. Store API

`@deepseek-ai/dsh-client-store` (seed) exports exactly four things
(**SHELL:56**, byte offset ≈206,155):

```js
const Hc = Object.freeze(Object.defineProperty({
  __proto__: null,
  createSnapshotStore: b6,
  defineStore: Pc,
  notifySubscribers: v3,
  shallowEqual: Oc
}, Symbol.toStringTag, { value: "Module" }));
```

### 7.1 `defineStore({ init, actions })` — exact contract

```js
// SHELL:56, byte offset 198966
function Pc(t) {
    return {
        spec: t,
        create(r) {
            const i = t.persist === void 0 ? void 0 : r === void 0 ? t.persist : `${t.persist}.${r}`,
                  s = b6(t.init(), i !== void 0 ? { persist: { name: i } } : void 0),
                  a = {};
            for (const c of Object.keys(t.actions)) {
                const h = t.actions[c];
                a[c] = (...p) => { s.update(m => { h(m, ...p) }); };
            }
            return {
                actions: a,
                getSnapshot: () => s.getSnapshot(),
                subscribe: c => s.subscribe(c),
                store: s,
                clearPersisted: () => {
                    if (!(i === void 0 || typeof localStorage > "u")) try { localStorage.removeItem(i) } catch {}
                }
            };
        }
    };
}
```

- `init: () => State` — called **once per instance** to seed the store.
- `actions: Record<string, (draft, ...args) => void>` — each action is wrapped so the caller
  passes only `...args`; the draft is injected first and mutated in place.
- `persist?: string` — optional localStorage key (per-instance suffix: `${persist}.${key}`
  for scoped stores).
- `defineStore(...)` returns a **handle** `{ spec, create(instanceKey?) }`. That handle is
  what you pass as the slot's `store`.
- `create()` returns `{ actions, getSnapshot, subscribe, store, clearPersisted }` — which is
  why `host.storeOf(...)` can hand `actions` and an observable to the component.

### 7.2 The underlying snapshot store

```js
// SHELL:56, byte offset 198211
function b6(t, r) {
    const i = gc(() => t), s = Cc()(i);
    r?.persist && Tc(s, r.persist.name);
    let a = c => s.subscribe(() => { v3([c], "[client-store]") });
    if (r?.flush === "raf") {
        const c = new Set, h = Nc(() => { v3(c, "[client-store]") });
        s.subscribe(h), a = p => (c.add(p), () => { c.delete(p) });
    }
    return {
        getSnapshot: () => s.getState(),
        subscribe: c => a(c),
        update: c => { s.setState(Ic(s.getState(), h => { c(h) }), !0) },
        set: c => { s.setState(M6(c), !0) }
    };
}
```

Note `Ic` is immer's `produce` (**SHELL:56**, byte offset ≈198,000: `var Mc=new jc, Ic=Mc.produce`)
and `M6(t){return No(t,!0)}` is a deep-freeze. So:
- actions mutate an immer draft; immutability is automatic;
- `getSnapshot()` returns a deep-frozen, referentially-stable-until-change value, which is
  exactly what `useSyncExternalStore` wants (**RND:610**, **RND:487**);
- `persist` rehydrates from `localStorage` synchronously and writes on every change
  (**SHELL:56**, `function Tc(t, r)` in the same region).

### 7.3 Writing one (copy-paste shape, from ui-theme)

```js
// THM:1011-1044
function createAppearanceRowStore() {
    return (0, _deepseek_ai_dsh_client_store.defineStore)({
        init: () => ({ preference: "system", revision: -1 }),
        actions: { sync: (d, preference, revision) => {
            if (revision <= d.revision) return;
            d.preference = preference;
            d.revision = revision;
        } }
    });
}
function createFontSizeRowStore() {
    return (0, _deepseek_ai_dsh_client_store.defineStore)({
        init: () => ({ fontSize: 14, revision: -1 }),
        actions: { sync: (d, fontSize, revision) => {
            if (revision <= d.revision) return;
            d.fontSize = fontSize;
            d.revision = revision;
        } }
    });
}
```

**Binding pattern (important).** The component only *reads* through `useStore`. The store is
*driven* from `apply`, because `inject(actions)` is the only place `actions` is visible:

```js
// THM:1477-1485
const store = createAppearanceRowStore();
let bound;
…
const sync = (snapshot) => {
    bound?.sync(snapshot.preference, snapshot.revision);
    fontSizeBound?.sync(snapshot.fontSize, snapshot.revision);
};
ctx.on("theme/change", sync);

// THM:1486-1492
const injected = (actions) => {
    bound = actions;              // ← captured for use outside React
    sync(theme.getTheme());       // ← push current state at mount
    return { setTheme: (id) => { theme.setTheme(id); } };
};
```

The `revision <= d.revision` guard inside the action is the shipped idiom for
"the service may publish a stale snapshot; never move state backwards".

---

## 8. Locale API

### 8.1 `ctx.locale.register(...)` — two overloads

```ts
// LOC:176-215
    /**
     * Register a declared namespace's dictionaries, all locales in one call —
     * the typed form: each dictionary is checked against the namespace's
     * {@link LocaleNamespaceMap} key union (a missing or extra key is a
     * compile error), and every shipped locale is required (bilingual balance
     * enforced at registration). Duplicate (ns, locale) throws (single occupant; a
     * namespace's texts have one owner). Registration bumps the revision so
     * mounted outlets pick up late-arriving dictionaries.
     * @param ns - a namespace merged into LocaleNamespaceMap.
     * @param dicts - complete dictionaries keyed by built-in locale id.
     * @returns disposer removing every locale registered by this call (idempotent).
     */
    register<N extends Extract<keyof LocaleNamespaceMap, string>>(ns: N, dicts: Record<BuiltInLocaleId, LocaleDictOf<N>>): () => void;
    /**
     * Single-locale untyped form for language-pack contributions and namespaces
     * outside the merge table.
     * @param ns - namespace.
     * @param locale - locale tag.
     * @param dict - dictionary.
     * @returns disposer (idempotent).
     * @throws when locale is not a BCP 47-style tag.
     */
    register(ns: string, locale: string, dict: LocaleDict): () => void;
```

```ts
// LOC:26-27
/** Locale dictionary: flat key to template string ({name} placeholders). */
export type LocaleDict = Record<string, string>;
```

### 8.2 What `{zh, en}` means, and whether more languages are expected

`ctx.locale.register(ns, { zh, en })` is the object form: keys **are locale ids**. The two
built-ins are `zh` and `en`, `en` is the fallback, and the shipped ui-theme passes exactly
two:

```js
// THM:1473-1476
ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
    zh,
    en
}), "ui-theme: settings row dictionaries");
```

Dictionaries (**THM:1093-1117**) are flat key → string; `{name}` placeholders are supported
(**THM:1094-1117** and `DS:5821` uses `localeT("packs.imported", { name: skinId })`).

**More languages are absolutely expected.** dream-skin registers **eight** in one call:

```js
// DS:5320-5329
ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
    zh,
    en,
    ja,
    ko,
    es,
    fr,
    de,
    ru
}), "dsh-dream-skin: settings row dictionaries");
```

…and dsh-better-sidebar ships **26** locale dictionary modules
(`src/client/locales.ts` + `locales-ar.ts, -de, -fr, -hi, -id, -it, -ja, -ko, -nl, -pl, -pt,
-ru, -sv, -th, -tr, -vi, -zh-HK, -zh-MO, -zh-TW`; see the file listing of
`dsh-better-sidebar/lib/types/client/locales-*.d.ts`).

Fallback resolution and the exact contract for extra languages:

```ts
// LOC:71-80
/**
 * English is both the locale the UI opens in when the browser names no registered
 * language (and for non-browser runs), and the dictionary consulted after the
 * active locale misses a key. One constant serves both because the shipped
 * `zh`/`en` dictionaries carry identical key sets, so neither direction can
 * leave a key unresolved; …
 */
export declare const FALLBACK_LOCALE: BuiltInLocaleId;
```

```ts
// LOC:71-93 (class doc)
 * Dictionary registry plus locale preference. Lookup walks the active
 * language's declared fallback chain in the entry namespace, then repeats it
 * in the shared common namespace before showing the key itself. …
```

Practical recommendation for this plugin: **`{ zh, en }` is sufficient and safe.** Add more
ids only if you also want them; unknown ids require `addLanguage` to be selectable
(**LOC:159**).

### 8.3 How a component resolves a key — the `t` prop

Declare `locale: "<namespace>"` on the slot registration; you get `t` as a prop. There is no
hook to call and no `require` for a translator:

```js
// RND:602-606
if (entry.locale !== void 0) {
    const face = host.locale;
    if (face === void 0) throw new SlotAssemblyError(`entry declares locale namespace '${entry.locale}' but no locale face is installed (locale plugin missing from the composition?)`);
    kit["t"] = localeSeat(face, entry.locale);
}
```

```js
// RND:431-456
/**
 * Locale `t` seat bindings, cached per (face, namespace, revision). The
 * revision is part of the cache key ON PURPOSE: a locale switch mints a NEW
 * function reference per namespace, so `React.memo` components taking `t`
 * re-render through ordinary shallow comparison — freshness rides identity,
 * no extra invalidation channel. Within one revision the reference is stable
 * (memoized children do not churn on unrelated re-renders).
 */
const localeSeatCache = /* @__PURE__ */ new WeakMap();
function localeSeat(face, ns) {
    let perNs = localeSeatCache.get(face);
    if (!perNs) { perNs = /* @__PURE__ */ new Map(); localeSeatCache.set(face, perNs); }
    const revision = face.getSnapshot().revision;
    const cached = perNs.get(ns);
    if (cached && cached.revision === revision) return cached.t;
    const bound = face.bind(ns);
    const t = (key, params) => bound(key, params);
    perNs.set(ns, { revision, t });
    return t;
}
```

Usage in a component: `t("appearance.title")`, `t("fontSize.unit")` (**THM:74-80**,
**THM:963-999**).

**Non-React code** (alerts, confirm dialogs) should bind explicitly and defensively:

```js
// DS:5331-5338
// Bound translator for non-React code paths (import/remove alerts), so
// user-facing messages follow the active locale instead of hardcoded text.
// Fall back to an identity translator when the locale service has no
// bind() (or registered dictionaries arrive later) — alerts must never
// take the whole settings section down.
const localeT = typeof ctx.locale?.bind === "function"
    ? ctx.locale.bind(SETTINGS_NS)
    : (key) => key;
```

The **nav label** of a section is *not* given `t`: use a thunk, which the shell re-reads on
every projection (**SETG:570**, **CCR:3849**):

```js
// SETG:655
label: () => t("general.nav"),
```

…but note that `t` at that point is the plugin-level bound translator, not a prop:

```js
// DS:5374 / BSSRC src/client/index.tsx:452
label: "Theme / 外观",
label: () => t('settingsNav'),
```

If you also want the section to react to locale switches, `t` reaches the component through
the `locale:` option and the renderer already re-renders on revision change
(**RND:485-488**).

---

## 9. Theme token API

### 9.1 `ctx.theme.overrideTokens(source, tokens)` — exact contract

Types:

```ts
// THMT:27-41
/** Theme token dictionary: --dsw-alias-* overrides keyed by variable name. */
export type ThemeTokens = Record<string, string>;
/**
 * One override-layer token value: both palette modes are mandatory (repeat
 * the same value when the token is scheme-invariant) so an override never
 * goes illegible when the user switches to the other scheme.
 */
export interface ThemeTokenModes {
    /** Value applied while the light base palette is active. */
    light: string;
    /** Value applied while the dark base palette is active. */
    dark: string;
}
/** Override-layer dictionary: token names to per-mode value pairs. */
export type ThemeTokenOverrides = Record<string, ThemeTokenModes>;
```

```ts
// THMT:162-178
    /**
     * Stack a token override layer on top of the active theme — the token-level
     * analogue of slot shading: the base theme stays untouched, layers compose
     * in seq order with later layers winning per-token, and removing a layer
     * restores whatever it covered. Calling again with the same source replaces
     * that source's whole layer and restacks it on top (effect re-registration
     * semantics). Emits `theme/change` with the recomposed snapshot.
     * @param source - layer identity; one layer per source (dynamic packages
     * pass their package id — the façade pins it, so it also names the layer's
     * origin for inspection).
     * @param tokens - token-name → `{ light, dark }` value pairs. Validated at
     * runtime (model-authored callers reach this boundary with untyped JS);
     * a bare string value throws a teaching error.
     * @returns disposer removing exactly the layer this call created; a no-op
     * once the source has re-overridden (the newer layer is not torn down).
     */
    overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void;
```

Implementation + the runtime validator (this is where the `{light, dark}` requirement is
enforced, with the exact error text):

```js
// THM:1364-1376
overrideTokens(source, tokens) {
    const layer = { seq: this.overrideSeq++, tokens: validateOverrides(source, tokens) };
    this.overrides.set(source, layer);
    this.publish();
    return () => {
        if (this.overrides.get(source) !== layer) return;
        this.overrides.delete(source);
        this.publish();
    };
}
```

```js
// THM:1425-1442
/**
 * Runtime shape check for one override layer (model-authored callers pass
 * untyped JS through the dynamic-package façade, so the static type cannot
 * enforce the pair shape there). Returns a defensive per-token copy so later
 * caller mutation cannot reach the stored layer.
 */ function validateOverrides(source, tokens) {
    const validated = {};
    for (const [name, value] of Object.entries(tokens)) {
        if (typeof value === "string") throw new TypeError(`theme override "${name}" from "${source}" is a bare string — pass { light: ${JSON.stringify(value)}, dark: ${JSON.stringify(value)} } (repeat the value when it is the same in both palettes); a single value goes illegible when the user switches color scheme`);
        if (typeof value !== "object" || value === null || typeof value.light !== "string" || typeof value.dark !== "string") throw new TypeError(`theme override "${name}" from "${source}" must map to a { light, dark } pair of strings — one value per color scheme`);
        const modes = value;
        validated[name] = { light: modes.light, dark: modes.dark };
    }
    return validated;
}
```

So: **`{ light: string, dark: string }` is mandatory per token; a bare string throws.**
Unknown token names are **accepted** (no allowlist check) — `exportInspectTokens` even
synthesizes entries for them (**THM:1287-1291**).

**Dynamic-package façade pinning** — if a plugin is loaded as a *dynamic* package (the
in-browser authoring path), `source` is **forced** to the package id and the disposer is
additionally hung on the calling fiber:

```js
// CCR:302-308
return (source, tokens) => {
    if (tokens === void 0 && typeof source === "object" && source !== null) return rejectGuard(env, "theme.overrideTokens(source, tokens) takes two arguments; source is replaced with your package id, so pass any string first and the token map second: overrideTokens('mine', { '--dsw-alias-…': { light: '…', dark: '…' } })");
    const method = Reflect.get(target, "overrideTokens", target);
    const dispose = Reflect.apply(method, target, [`${env.pkg.pluginId}.${env.pkg.packageId}`, tokens]);
    ctx.effect(() => dispose, "cordis-client-runner: dynamic theme override layer");
    return dispose;
};
```

For a **statically loaded** plugin, `source` is yours to choose — dream-skin uses one stable
constant and re-registers to replace the whole layer each time (note the explicit dispose of
the previous layer, and the re-entrancy guard because `overrideTokens` emits):

```js
// DS:1738-1758
function applyCombinedTokenOverrides(ctx) {
    if (combinedOverrideApplying) return;
    combinedOverrideApplying = true;
    try {
        const overrides = { ...popupTokenOverrides, ...accentTokenOverrides, ...wallpaperTokenOverrides };
        if (Object.keys(overrides).length > 0) {
            const previousDispose = combinedOverrideDispose;
            combinedOverrideDispose = ctx.theme.overrideTokens(COMBINED_OVERRIDE_SOURCE, overrides);
            previousDispose?.();
        } else {
            combinedOverrideDispose?.();
            combinedOverrideDispose = null;
        }
    } finally { combinedOverrideApplying = false; }
}
```

```js
// DS:4297-4302 (the re-entrancy note)
/** Guards against re-entrant wallpaper re-shading (overrideTokens emits theme/change). */
…
// Re-entrancy guard: overrideTokens() below emits `theme/change`, which our
```

### 9.2 The official override catalog (13 tokens)

```js
// THM:1131-1230 — BUILTIN_INSPECT_TOKENS
```

| Token | Description |
|---|---|
| `--dsw-alias-bg-base` | Application base background. |
| `--dsw-alias-bg-layer-1` | Primary raised surface background. |
| `--dsw-alias-bg-layer-2` | Secondary nested surface background. |
| `--dsw-alias-bg-overlay` | Overlay and popover background. |
| `--dsw-alias-border-l1` | Primary subtle border. |
| `--dsw-alias-border-l2` | Secondary stronger border. |
| `--dsw-alias-brand-primary` | Primary brand accent. |
| `--dsw-alias-label-primary` | Primary text color. |
| `--dsw-alias-label-secondary` | Secondary text color. |
| `--dsw-alias-state-error-primary` | Primary error state color. |
| `--dsw-alias-state-success-primary` | Primary success state color. |
| `--dsw-alias-state-warn-primary` | Primary warning state color. |
| `--dsw-specific-sidebar-fill` | Sidebar column and title-row background. |

All 13 are `valueType: "CSS color"`, `requiresLightAndDark: true` (**THM:1131-1230**).
`ctx.theme.exportInspectTokens()` returns this list, sorted by name, **plus** every
override-only / registered-theme token name with `valueType: "CSS value"` and
`description: "Theme token registered by the current Client composition."`
(**THM:1287-1291**, **THM:1443-1451**). That is the API a `--dsw-*` variable panel should
enumerate — do not hard-code.

### 9.3 `ctx.theme.getTheme()` snapshot shape

```ts
// THMT:54-70
/** Immutable theme state published on every change. */
export interface ThemeSnapshot {
    /** The persisted preference (may be `system`). */
    preference: ThemePreference;
    /** Conversation content font size in px (integer within FONT_SIZE_MIN..FONT_SIZE_MAX). */
    fontSize: number;
    /**
     * The resolved active theme (`system` resolved via prefers-color-scheme)
     * with override layers folded into its tokens (seq order, later layers win
     * per-token; each value picked for the active color scheme).
     */
    active: ThemeDefinition;
    /** Registered themes in registration order. */
    themes: readonly ThemeDefinition[];
    /** Monotonic change counter (registry or active changes). */
    revision: number;
}
```

```ts
// THMT:42-53
/** One selectable theme: id, dark/light semantics, and alias-token overrides. */
export interface ThemeDefinition {
    /** Theme id (the setTheme argument for concrete themes). */
    id: string;
    /**
     * Which base palette this theme builds on. The presenter switches
     * `body[data-ds-dark-theme]` from this field — never from the id.
     */
    colorScheme: 'light' | 'dark';
    /** Alias-layer overrides applied as inline CSS variables over the base palette. */
    tokens: ThemeTokens;
}
```

Important detail for a variable panel: `snapshot.active.tokens` is the **already-composed**
map (base theme + every override layer, each token resolved to a single string for the
active scheme) — see `composeActive` at **THM:1396-1404**:

```js
composeActive(active) {
    if (this.overrides.size === 0) return active;
    const tokens = { ...active.tokens };
    for (const layer of [...this.overrides.values()].sort((a, b) => a.seq - b.seq))
        for (const [name, modes] of Object.entries(layer.tokens)) tokens[name] = modes[active.colorScheme];
    return Object.freeze({ ...active, tokens: Object.freeze(tokens) });
}
```

So `ctx.theme.getTheme().active.tokens["--dsw-alias-brand-primary"]` is the *live effective*
value, and `active.colorScheme` tells you which scheme it is. To read the base
(un-overridden) value, use `getComputedStyle(document.body).getPropertyValue(name)` or the
stylesheet.

Read surface: `getTheme()` (**THMT:131**), `exportInspectTokens()` (**THMT:136**),
`setTheme(id)` (**THMT:143**), `setFontSize(px)` (**THMT:150**), `register(definition)`
(**THMT:161**), `overrideTokens(...)` (**THMT:178**).

`register()` restrictions (**THM:1336-1347**): `"system"` is refused as a theme id; a
duplicate id throws `theme "<id>" is already registered`; the disposer resets the preference
if the disposed theme was active. `setTheme` on an unregistered id throws
`theme "<id>" is not registered` (**THM:1300**).

### 9.4 The `theme/change` event

```ts
// THMT:88-96
    interface Events {
        /**
         * Theme state changed (preference switched, registry updated, or the OS
         * color scheme changed while the preference is `system`).
         * @param snapshot - Current immutable theme snapshot.
         * @mode emit
         */
        'theme/change'(snapshot: ThemeSnapshot): void;
    }
```

```js
// THM:1405-1409
publish() {
    this.revision += 1;
    this.snapshot = this.buildSnapshot();
    this.ctx.emit("theme/change", this.snapshot);
}
```

**Emission is synchronous.** dream-skin learned this the hard way and defers its reaction:

```js
// DS:5291-5303
// Theme events are synchronous. Re-shading inside this listener publishes a
// nested theme/change; a presenter registered after us can then apply the
// outer (pre-shade) snapshot last, leaving the wallpaper one skin behind.
// Run after the current event stack instead. Events emitted by our own
// override happen while _applyingWallpaper is true and must not enqueue a
// second pass.
if (wallpaperBackgroundCss() !== null && !_applyingWallpaper) {
    if (wallpaperReshadeTimer !== null) clearTimeout(wallpaperReshadeTimer);
    wallpaperReshadeTimer = setTimeout(() => {
        wallpaperReshadeTimer = null;
        applyWallpaper2(ctx, ctx.theme.getTheme());
    }, 0);
}
```

Subscribe with `ctx.on("theme/change", handler)` (**DS:5305**, **THM:1485**). Available only
if `theme` is declared in your runtime `inject` (**DS:5061-5065**).

---

## 10. Host settings scope (`ctx.settingsScope.bind(...)`)

### 10.1 Exact contract

```ts
// SPBIND:88-140
declare module '@deepseek-ai/cordis' {
    interface Context {
        settingsScope: SettingsScopeBinder;
    }
}
/**
 * The settings domain's base service. Features that own a preference reach the
 * settings transport through this service rather than a shared function: the
 * client bundle purity gate forbids cross-plugin value imports and directs
 * cross-plugin collaboration through cordis services
 * (`packages/client/tsdown.client.ts`).
 */
export declare class SettingsScopeBinder extends Service {
    …
    /**
     * Bind one namespace scope on the CALLER's plugin lifecycle — the service
     * proxy binds `this.ctx` to the caller at call time, so the scope's disposer
     * belongs to the calling fiber. The scope derives from the shared mirror
     * (whose invalidation subscriptions live with the providing plugin), so
     * binding adds no wire read of its own and activation never blocks on the
     * settings transport.
     * @param spec - domain-owned namespace contract.
     * @returns the bound scope consumed by the domain's services and rows.
     */
    bind<T>(spec: SettingsScopeSpec<T>): SettingsScope<T>;
}
```

```ts
// SPLICY:33-43
/** Domain-owned description of one settings namespace consumed by a browser plugin. */
export interface SettingsScopeSpec<T> {
    /** Settings namespace registered by the owning Host plugin. */
    namespace: string;
    /**
     * Narrow one wire section; undefined keeps the last accepted value. The
     * default validates the section against the namespace's own serialized wire
     * schema, so domains add a decoder only to narrow beyond that schema.
     */
    decode?: (section: unknown) => T | undefined;
}
```

```ts
// SPLICY:5-32
export interface SettingsScopeSnapshot<T> {
    /**
     * `loading` until the first accepted section, `ready` while one stands, and
     * `unavailable` when the namespace is not exposed to this client or the
     * connection keeps preferences process-local (memory mode).
     */
    status: 'loading' | 'ready' | 'unavailable';
    /** Last accepted schema-resolved section; undefined before the first acceptance. */
    value: T | undefined;
    base: unknown;
    user: unknown;
    /** Namespace revision fencing the next write; undefined before the first Host view. */
    revision: number | undefined;
    /** Whether the Host document accepts writes; memory mode never does. */
    writable: boolean;
    /** `host` syncs with the Host document; `memory` keeps a remote browser process-local. */
    mode: 'host' | 'memory';
}
```

```ts
// SPLICY:50-85
export interface SettingsScope<T> {
    getSnapshot(): SettingsScopeSnapshot<T>;
    subscribe(listener: () => void): () => void;
    mutate(ops: readonly SettingsPathOpView[], expectedRevision?: number): Promise<void>;
    set(field: string, value: unknown): Promise<void>;
    unset(field: string): Promise<void>;
}
```

Usage (ui-theme):

```js
// THM:1471
const theme = new ThemeRuntime(ctx, ctx.settingsScope.bind({ namespace: THEME_SETTINGS_NAMESPACE }));
```

### 10.2 When it fails, and why — `settings-not-exposed` / `unavailable`

**Two distinct failure modes**, both evidenced:

**(a) Non-loopback page ⇒ `memory` mode, writes are dropped entirely.**

```js
// SET:1343-1346
function apply(ctx) {
    const schema = new SettingsSchemaService(ctx);
    const persistence = ctx.remote.$host.isLoopback ? "host" : "memory";
    const mirror = new SettingsDescribeMirror(ctx, persistence);
```

```js
// SET:1074-1082
enqueue(operation) {
    if (this.persistence === "memory" || this.disposed) return Promise.resolve();   // ← writes silently no-op
    const task = this.tail.then(async () => { if (this.disposed) return; await operation(); });
    this.tail = task.catch(() => {});
    return task;
}
```

And the snapshot starts `unavailable` in that mode:

```js
// SET:1210-1214
constructor(ctx, persistence = "host") {
    this.persistence = persistence;
    this.store = … { status: persistence === "host" ? "idle" : "unavailable", … }
```
```js
// SET:974-989
constructor(ctx, spec, mirror, persistence, schema) {
    …
    status: persistence === "host" ? "loading" : "unavailable",
    …
    mode: persistence
```

**(b) The namespace is not registered by a live Host plugin ⇒ `status: "unavailable"`.**

```js
// SET:1083-1095
derive() {
    if (this.disposed) return;
    const mirrored = this.mirror.getSnapshot();
    if (mirrored.view === void 0) return;
    const { writable } = mirrored.view;
    const view = mirrored.view.namespaces.find((candidate) => candidate.ns === this.spec.namespace);
    if (view === void 0) {
        this.store.update((draft) => {
            draft.status = "unavailable";
            draft.writable = writable;
        });
        return;
    }
    …
}
```

### 10.3 Which namespaces are allowlisted?

**In this installed version: none.** The describe read returns **every** namespace a live
Host plugin registered:

```js
// dsh-api-settings-controller/lib/index.js:419-430
        /**
         * Describe every registered namespace for a configuration page: redacted
         * …
         */
        …
                namespaces: settings.describe({ redactSecrets: true }).map(namespaceView)
```

```md
<!-- dsh-api-settings-controller/README.md:30 -->
`settings.describe()` returns deployment facts and every namespace under `redactSecrets: true`.
```

The counterpart claim in dream-skin refers to a **different/older** component:

```js
// DS:11-16
// Persistence note: the skin choice and wallpaper settings are stored in
// localStorage. DSH's Host settings wire only exposes an allowlisted set of
// namespaces to browser clients (dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES),
// so a third-party namespace would answer `settings-not-exposed`; the product
// itself keeps remote browser preferences process-local, and localStorage
// matches that boundary for visual preferences while surviving reloads on the
// same origin.
```

```js
// DS:3427-3432
		 * Constraint note: DSH's Host settings wire only exposes an allowlisted
		 * set of namespaces to browser clients (WEB_SETTINGS_NAMESPACES in
		 * dsh-host-apiproxy), so a third-party namespace answers
		 * `settings-not-exposed` even when registered. localStorage/IndexedDB are
		 * therefore the reliable persistence for third-party state; a host
		 * settings write is attempted best-effort and never depended on.
```

Verified facts on this machine: `dsh-host-apiproxy` **is not installed** (no such package
under `@deepseek-ai/dsh/node_modules/@deepseek-ai/`), and no file under
`@deepseek-ai/dsh/node_modules/@deepseek-ai/` contains either the string
`settings-not-exposed` or `WEB_SETTINGS_NAMESPACES` (grep returned no matches). Both strings
exist only in dream-skin's own docs/source.

### 10.4 Is a custom third-party namespace usable?

**Structurally yes, but with three hard conditions:**

1. The namespace must be registered by a **Host half** through
   `ctx.settings.register(ns, schema, { base })`, and the namespace key must satisfy the
   grammar (lowercase letters, digits, hyphen). Quoting `dsh-settings/README.md`
   ("Registering a namespace"):

   ```text
   const scope = ctx.settings.register('ui-theme', ThemeSchema, {
     base: config,   // composition entry config; the user layer resolves above it
   })
   const theme = scope.get()              // deep-frozen resolved snapshot
   scope.update({ density: 'compact' })   // merges into the user section and persists
   ```

   > "Literal namespace arguments are checked by TypeScript against the lowercase letter,
   > digit, and hyphen grammar; dynamically supplied strings receive the same validation at
   > runtime."

   — `@deepseek-ai/dsh-settings/README.md`, section "Registering a namespace".
2. A settings **provider** must be mounted to persist (`@deepseek-ai/dsh-settings-file`, which writes `$DSH_HOME/settings.yaml` by default — dsh-settings README "Mounting a provider"; ui-theme README:12 states the same for the `ui-theme` namespace).
3. The page must be **loopback**, or the scope is `memory` mode and every write no-ops (**SET:1345**, **SET:1075**).

**However.** Both shipped third-party plugins in this profile (dream-skin, better-sidebar)
deliberately **do not** use `ctx.settingsScope` for plugin state; they use a fenced custom
HTTP route + a `$DSH_HOME/*.json` file. Dream-skin's client bundle has **zero** references
to `settingsScope` or `ctx.get(` (grep: no matches), while its host half owns
`$DSH_HOME/dream-skin.json` through `/dream-skin/api` (**DSHOST:37-42, 52-83, 268-287**).

**Recommendation for this plugin** (custom CSS can be hundreds of KB, has no schema, and is
not a scalar preference): keep the already-built `$DSH_HOME/custom-style.json` route
(`D:\work\dsh-plugin\dsh-custom-style\lib\index.js:51-114, 300-339`) and treat
`ctx.settingsScope` as unavailable. Reasons grounded in the evidence above:

- `SettingsScope.set(field, value)` is **field-scalar** and the default decoder validates
  against the namespace's serialized wire schema (**SPLICY:34-43**, **SET:1015-1021**) — a
  large free-form CSS blob plus presets is a poor schema fit.
- The 13-token theme surface already has a supported channel (`ctx.theme.overrideTokens`,
  §9), so token state need not go to settings either.
- A `memory`-mode page would silently lose everything (**SET:1075**), whereas the custom
  route works for any trusted origin the fence admits (**DSHOST:144-158**).
- The `settings-not-exposed` allowlist concern is unverifiable in this version and absent
  from the installed code — but the *route* approach has no such dependency at all.

If you *do* want settings integration later, the minimal host-half registration is
`ctx.settings.register("<your-namespace>", Schema, { base: config })` inside the plugin's
own host `apply`, plus `ctx.settingsScope.bind({ namespace: "<your-namespace>" })` on the
browser side with `export const inject = [..., "settingsScope"]`.

---

## 11. Removing injected global CSS on dispose / HMR

### 11.1 The two tag attributes the loader owns

```js
// MOD:165-176
/**
 * Claim and inventory the <style> tags a factory injected during
 * materialization: preset-emitted tags arrive pre-tagged with data-plugin;
 * any untagged tag is claimed for the materializing plugin (HMR bookkeeping).
 */
const claimStyles = (id) => {
    if (typeof document === "undefined") return [];
    for (const el of document.querySelectorAll("style:not([data-plugin])")) el.setAttribute("data-plugin", id);
    const owned = [];
    for (const el of document.querySelectorAll(`style[data-plugin=${JSON.stringify(id)}]`)) owned.push(el.getAttribute("data-plugin-css") ?? id);
    return owned;
};
```

```ts
// MODT:192-202
export interface ClientModuleRecord {
    /** Module id (entry name / package name). */
    id: string;
    /** Materialized exports (`module.exports` from a factory or bootstrap registration). */
    exports: unknown;
    /** Owned `<style data-plugin>` tag ids (`data-plugin-css` values) injected during materialization. */
    styles: string[];
    /** Observed `require()` edges (module-graph boundary; only table words can appear). */
    edges: Set<string>;
}
```

**Requirements this imposes on any `<style>` you create inside the factory:**

1. It **must** be created inside the factory closure (materialization), so it lands after the
   previous generation's tags were swept. A top-level IIFE style tag is never owned and never
   removed (**DS:5869-5880**).
2. Set `tag.dataset.plugin = "<exact package name>"` yourself. If you don't, `claimStyles`
   claims **every untagged `<style>` in the document** for your plugin on materialization —
   including tags some other plugin injected untagged.
3. Set `tag.dataset.pluginCss = "<stable unique id>"` so re-materialization can be
   deduplicated and so HMR bookkeeping has a stable key.

### 11.2 The exact removal pattern

**Third-party / hand-written** (a stable guard + a fiber-scoped disposer):

```js
// THM:27-34 — module CSS at factory scope, guarded against double injection
const tagId$1 = "@deepseek-ai/dsh-client-ui-theme/AppearanceRow.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
    const tag = document.createElement("style");
    tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-theme";
    tag.dataset.pluginCss = tagId$1;
    tag.textContent = css$1;
    document.head.appendChild(tag);
}
```

**Global sheets owned by the plugin, with `ctx.effect` teardown** — this is the pattern to
copy for a global custom-CSS editor:

```js
// THM:1064-1090
const PLUGIN_ID = "@deepseek-ai/dsh-client-ui-theme";
const STYLES = [
    ["base.css", base_css_default],
    ["corner-shape.css", corner_shape_css_default],
    ["design-platform.css", design_platform_css_default],
    ["scrollbar.css", scrollbar_css_default],
    ["gradient-shadow-text.css", gradient_shadow_text_css_default],
    ["shiki.css", shiki_css_default]
];
/**
 * Mount the global theme sheets for exactly the owning plugin lifetime.
 * @param ctx - Owning plugin context.
 */
function installThemeStyles(ctx) {
    if (typeof document === "undefined") return;
    for (const [name, css] of STYLES) ctx.effect(() => {
        const tag = document.createElement("style");
        tag.dataset.plugin = PLUGIN_ID;
        tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`;
        tag.textContent = css;
        document.head.appendChild(tag);
        return () => {
            tag.remove();
        };
    }, `ui-theme: ${name} stylesheet`);
}
```

Called first thing in `apply` (**THM:1470**).

For a **user-editable** stylesheet you need one *mutating* tag rather than one tag per sheet;
the same ownership rules apply:

```js
// pattern: one owned, stable-id tag whose textContent you rewrite in place
const CSS_TAG_ID = "dsh-custom-style/user.css";
function installUserStyle(ctx) {
    if (typeof document === "undefined") return;
    ctx.effect(() => {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-custom-style";       // ← must equal the bundle id
        tag.dataset.pluginCss = CSS_TAG_ID;            // ← stable, unique
        document.head.appendChild(tag);
        userTag = tag;                                  // rewrite tag.textContent on edits
        return () => { tag.remove(); userTag = null; }; // ← ctx.effect teardown
    }, "dsh-custom-style: user stylesheet");
}
```

### 11.3 What HMR does, and why the *ordering* matters

```js
// HMR:53-56
/** Remove every `<style data-plugin>` tag owned by `id` (attribute compared verbatim — no CSS-selector escaping pitfalls). */
function removeOwnedStyles(id) {
    for (const el of document.querySelectorAll("style[data-plugin]")) if (el.getAttribute("data-plugin") === id) el.remove();
}
```

```js
// HMR:71-82
modLoader.invalidate(id, rev);
await modLoader.prefetch(id);
const oldFiber = entry.fiber;
if (oldFiber !== void 0) {
    const runtime = oldFiber.runtime;
    if (runtime !== null) entry.ctx.registry.delete(runtime.callback);
    while (oldFiber.inertia !== void 0) await oldFiber.inertia;
    delete entry.fiber;
}
removeOwnedStyles(id);
await entry.refresh();
await entry.fiber?.await();
```

```ts
// HMRT:16-28
 * Reload order (lazy CJS table): invalidate (drop the stale factory and
 * materialized record) → prefetch (load and register the fresh
 * factory) → registry-first teardown → drain old fiber unload → remove
 * owned `<style data-plugin>` tags → `entry.refresh()` materializes the new
 * factory. …
 * … That also keeps the CSS ordering guarantee: owned styles are
 * removed after the old fiber's disposers drained (SlotCore one-owner
 * unregister) and before materialization re-injects tags under the same
 * stable tag ids.
```

**Consequences:**

- `data-plugin` must be the **exact bundle id** (`dsh-custom-style`), compared verbatim.
  Get it wrong and HMR leaks the old tags on every reload — double-applied CSS that grows
  without bound.
- HMR removes the tags *for you*, so the `ctx.effect` disposer is what covers the
  **plugin-disable / fiber-dispose** path (and is what removes tags when the plugin is
  unloaded by a settings toggle). Ship both.
- Because owned tags are removed before the new factory materializes, do **not** rely on
  cascade order between your own tags surviving a reload — re-append them in the order you
  need every time.

### 11.4 Style-ordering requirements

The only explicit ordering requirement found in the shipped packages:

```md
<!-- @deepseek-ai/dsh-client-ui-theme/README.md:54 -->
`src/styles/` holds six sheets imported in order by ui-theme's dynamic client entry:
`base.css`, `corner-shape.css`, `design-platform.css`, `scrollbar.css`,
`gradient-shadow-text.css`, and `shiki.css`. The client bundle compiles and injects them as
plugin-owned global styles, so unload and HMR remove them with ui-theme. `scrollbar.css` is
the sole consumer of the `--dsw-alias-scrollbar-*` tokens and must follow
`design-platform.css`, which declares them.
```

i.e. within your own plugin, append sheets in dependency order; the `STYLES` array order
(**THM:1066-1073**) is the source of truth. Cross-plugin ordering is by `document.head`
insertion order, so a plugin loaded after ui-theme (everything in the `dsh.client` roster is
appended after `immediately` rows prefetch — **SHELL:114**, `prefetchImmediateTier`) will win
ties at equal specificity.

---

## 12. Gotchas — everything explicitly commented as a trap

### 12.1 Shell-breaking factory throws

The highest-severity one; documented at length in **DS:24-35** and enforced by
**SHELL:114** (`assertEntriesActive`, §1.4):

> *"The host does NOT isolate loader-entry factories: one throwing factory aggregates into
> `entries did not activate` and takes the whole web shell down ("Failed to load plugins" —
> the exact issue #43 blast radius). So every platform seed is resolved inside a try. Seeds
> are probed in candidate order and success is detected by the require RETURNING — never by
> matching host-internal error wording (the old `includes("missed the module table")`
> substring was an implementation detail, not a contract — R4). On total failure the factory
> returns a DUMB MODULE (no-op apply, empty surfaces): the plugin goes invisible with one
> console warning instead of breaking DSH for every user. A future seed rename can therefore
> never white-screen the host."*

Related: **a fiber left `PENDING` also fails the boot** (`SHELL:114`, §1.4). Never declare
`inject` for a service whose provider is optional.

### 12.2 Seed-name drift between DSH generations

```js
// DS:47-58
// Settings-store factory host module (`defineStore`). One build must load
// on both host generations: DSH master (post-0.1.2-alpha.1) split the old
// `dsh-client-runtime` into `dsh-client-modules` / `dsh-client-store` /
// `dsh-client-locale` and froze the platform module table to the new seed
// names, while stable releases (≤ 0.1.1-rc.x) only provide
// `@deepseek-ai/dsh-client-runtime/client` (issue #41 fixed master but
// broke stable — issue #43). Master seed first, stable seed second.
let _runtime_client = null;
for (const seed of ["@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-runtime/client"]) {
    _runtime_client = requireSeed(seed);
    if (_runtime_client !== null) break;
}
```

On **this** install the seed table has `@deepseek-ai/dsh-client-store` and **no**
`dsh-client-runtime` (**SHELL:114**), so a single-seed probe is enough — but the probe
pattern is what keeps the plugin alive across a seed rename.

### 12.3 Require cycles are fatal

```js
// MOD:195-196
/** Materialization re-entrancy guard: factory-form CJS cannot deliver partial exports, so a cycle is fatal. */
materializing = /* @__PURE__ */ new Set();
```
```js
// MOD:278
if (this.materializing.has(id)) throw new Error(`client-modules: require cycle through "${id}" (factory-form CJS cannot deliver partial exports)`);
```

The host also rejects a graph cycle before it can happen (**MODH:358**) and a row that
declares its own package in `external` (**MODH:362**). Never `require()` a module back from
a module that requires you.

### 12.4 Requiring something that isn't a seed and isn't a graph row

```js
// MOD:308
throw new Error(`client-modules: require("${spec}") missed the module table — not a platform seed word, not a materialized module, and no registered package factory (a build-time externals drift, or a dynamic dependency that did not arrive)`);
```

**Only the 9 seed words and registered plugin bundles may be required** (**DS:7-8**:
*"Only platform seed words and registered client bundles may be required."*). Any npm
dependency you use must be **bundled into your `lib/client.js`** — which is exactly what
every shipped package does (clsx is inlined at **THM:10-24**, `@deepseek-ai/schemastery`
inlined, etc.). The bundle purity gate is stated in **SET index.d.ts:93-99**:

> *"the client bundle purity gate forbids cross-plugin value imports and directs
> cross-plugin collaboration through cordis services (`packages/client/tsdown.client.ts`)"*

### 12.5 Duplicate bundle execution / duplicate registration

```js
// MOD:231
throw new Error(`client-modules: duplicate factory registration for "${registration.id}" (bundle executed twice without invalidate?)`);
```
```js
// SHELL:56, SlotCore.register
if (m) throw new Error(`single slot "${t.name}" already has a registration ${c(m)}`);
… `list slot "${t.name}" already has an entry with id "${t.id}" ${c(m)}`
```

Also: `slots.inject` may call your callback **more than once** across a declaration's
lifetime (collapse → re-declare, **RND:1001-1008**). Registrations must therefore be
idempotent-by-construction: `register` returns a disposer, and re-running the callback after
a dispose must succeed. Do not `ctx.effect` the same tag twice under the same id without the
`querySelector` guard from **THM:28**.

### 12.6 `slots.register` throw semantics depend on timing

If the slot is already declared, `inject`'s callback throws **synchronously to you**; if it
is declared later, the throw is re-thrown in a microtask (**RND:1047-1061**) and becomes an
unhandled error rather than an apply failure. Guard anything that can throw (a theme id
collision, a stale service) inside the callback.

### 12.7 Style-tag ownership traps

- Untagged `<style>` elements get claimed by whichever factory materializes next
  (**MOD:170-176**). Always tag.
- `data-plugin` is compared **verbatim** by HMR (**HMR:55**) — use the exact bundle id.
- Tags created outside the factory are never removed (**DS:5863-5897** is a live example:
  a `style.id = "dsh-dream-skin-nav-icon"` injected by a trailing IIFE, deliberately left in
  place, and explicitly fenced in `try {} catch {}` because a throw there would also white-screen:
  *"this IIFE sits OUTSIDE the loader's downgrade path — a throw here would surface as
  'entries did not activate' and take down the web shell."*)

### 12.8 `ctx.effect` semantics you must respect

```ts
// COR fiber.d.ts:35-51
/**
 * Function returned by an effect to release resources during disposal.
 * Disposers run in reverse registration order when the owning fiber unloads;
 * they may be async, in which case unloading awaits them.
 */
export type Disposable<T = any> = () => T;
/**
 * Effect body result accepted by `ctx.effect()` and plugin startup.
 * Either a single disposer, a promise of one, or a (possibly async) iterable
 * yielding several — generator effects register each yielded disposer as it
 * is produced.
 */
export type Effect<T = any> = SyncEffect<T> | AsyncEffect<T>;
```
```ts
// COR fiber.d.ts:145-159
    /**
     * Register a cleanup-aware effect on this fiber.
     * …
     * @param execute — the effect body; see {@link Effect} for accepted shapes.
     * @param label — effect label shown in `getEffects()` diagnostics.
     * @returns a disposer that tears the effect down and settles once done.
     */
    effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>;
    effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>;
```

`ctx.effect(() => { … ; return () => tag.remove(); }, "label")` is the required shape for
**every** long-lived resource: routes (**DSHOST:269**), style tags (**THM:1080-1089**),
locale dictionaries (**THM:1473**), theme registrations (**DS:5100-5102**), timers
(**DS:5306-5308**). Creating an effect on an inactive context throws with code
`INACTIVE_EFFECT` (**COR fiber.d.ts:88**) — that code is explicitly caught and handled by
`slots.inject`'s internal reconcile (**RND:1051-1054**).

### 12.9 `!important` and specificity (real case + rationale)

```js
// DS:2206-2250 (condensed; read the full comment before copying)
// --- DSH Desktop: the shell shadows the sidebar fill token (issue #55) ---
// In the Electron shell the upstream sidebar is rendered inside the
// shell's own <aside class="dshDesktopSidebarSurface">, and that
// element re-declares `--dsw-specific-sidebar-fill` on itself. A
// custom property declared on an element shadows every :root / body
// theme override for the WHOLE subtree, …
// `!important` is what makes it win: the shell's declaration is not important, and an
// important declaration outranks a normal one regardless of
// selector specificity. (The reporter's 2.0.10 variant uses a MORE
// specific selector, which changes nothing while it stays
// non-important.) If the shell ever marks its own declaration
// important, the clean fix is on the shell side — it should use its
// own private token instead of the shared skin token — not a
// specificity war in here.
```

Two lessons: (1) a custom property declared on an *element* shadows `:root`/`body` overrides
for the whole subtree — a `--dsw-*` variable panel must know this; (2) `!important` is the
escape hatch for a *non-important* host declaration, and the code explicitly refuses to enter
a specificity war beyond that.

Also note the **shadow-vs-outline** rule, which matters for a "highlight the picked element"
feature:

```js
// DS:2200-2205
// F5 (round-7 review): outline instead of box-shadow — a shadow rule
// here would REPLACE whatever elevation shadow the host puts on this
// card; outline overlays without touching it. Round-8: lighter.
"  outline: 1px solid rgba(255,255,255,0.12);",
"  outline-offset: -1px;",
```

And the **build-hash selector drift** warning — directly relevant to a visual element picker
that generates selectors:

```js
// DS:2261-2273
/**
 * Host class names in MATERIAL_CSS are BUILD HASHES that DSH re-rolls on
 * release, so a subset of them inevitably stops matching (blue-team R15:
 * three of eight were already dead on the host this was reviewed against,
 * while every test stayed green — the old test only checked that the CSS
 * *string* contains the names). Rule sets are harmless when their selector
 * no longer matches, so this cannot break anyone; but a silent no-op hides
 * a real visual regression. Verify each selector against the live DOM once
 * per mount and warn — turning "silently broken" into "visibly degraded".
 */
```

**Practical rule for the picker:** generate selectors from stable anchors only —
`data-*` attributes, `role`, `aria-*`, and the plugin's own classes. Never emit a hashed
CSS-module class (e.g. `._8HJdBW_themeCube`, `bVCLcG_row`) into a saved preset; they change
between DSH releases.

### 12.10 jsdom / SSR / documentless guards

Every DOM touch in shipped code is guarded. Copy the guard, not just the intent:

```js
// THM:1079
if (typeof document === "undefined") return;
```
```js
// MOD:171
if (typeof document === "undefined") return [];
```
```js
// THM:1256 — matchMedia is absent outside a browser
this.media = typeof matchMedia === "undefined" ? void 0 : matchMedia("(prefers-color-scheme: dark)");
```
```js
// THM:1418-1423
function bootstrapFontSize() {
    /* v8 ignore next -- needs a documentless run (node e2e booting the client tree), not constructible under jsdom */
    if (typeof document === "undefined") return 14;
    const raw = document.body.style.getPropertyValue("--dsh-content-font-size");
    …
}
```
```js
// DS:5866-5870 — an IIFE outside the factory must swallow everything
/* Blue-team B4: this IIFE sits OUTSIDE the loader's downgrade path — a throw
 * here would surface as "entries did not activate" and take down the web
 * shell. It is cosmetic, so ANY failure is swallowed: head/body may not exist
 * yet (script injected before <body> parses), MutationObserver may be
 * unavailable in stripped webviews. */
;(function () {
  try {
```

`document.body` may not exist when a factory-created style is appended — dream-skin falls
back to `document.head || document.body` (**DS:2255**, **DS:5880**) while ui-theme assumes
`document.head` (**THM:1085**).

### 12.11 Windows path / filesystem issues (host half)

```js
// DSHOST:73-82
	// The state file holds the user's wallpaper data URLs (personal images),
	// so keep it owner-only on POSIX (mode is ignored on Windows).
	writeFileSync(tmp, body, { encoding: "utf8", mode: 0o600 });
	try {
		renameSync(tmp, file);
	} catch {
		// rename can fail on Windows if the target is transiently locked; a
		// direct write is a safe fallback for this single-process case.
		writeFileSync(file, body, { encoding: "utf8", mode: 0o600 });
	}
```

Same pattern already present in this workspace at `lib/index.js:94-114`. Keep it.

Second Windows-specific path fact: `$DSH_HOME` is read from `process.env.DSH_HOME` with a
`homedir()/.dsh` fallback rather than any DSH-provided helper (**DSHOST:52-55**), and the
file is resolved with `join(dirname(file), …)` — always build paths with `node:path`, never
string concatenation with `/`.

### 12.12 Trust-fence canonicalization

A `trustedHosts` entry that WHATWG parsing would silently rewrite (whitespace, dangling
colon, zero-padded port, path fragment, bogus spelling) must be **refused**, not accepted:

```js
// DSHOST:111-124
/**
 * Assert one configured `trustedHosts` entry is a bare authority (`host` or
 * `host:port`) in canonical form … Anything WHATWG parsing would silently rewrite … is refused,
 * so a misconfigured entry cannot quietly broaden the authority grant.
 */
function assertTrustedAuthority(entry) {
	const entryUrl = parseAuthority(entry);
	if (entryUrl !== undefined && canonicalAuthority(entry, entryUrl) === entry.toLowerCase()) return;
	throw new Error(`dsh-dream-skin: trustedHosts entry ${JSON.stringify(entry)} is not a bare host[:port] authority`);
}
```

…and the `Origin` comparison should use `.hostname`, not `.host` (§4.3; **BSSRC
src/trust-fence.ts:70-80** explains the Edge-151 non-default-port case).

### 12.13 Cross-plugin value imports are forbidden

```ts
// SET lib/types/client/index.d.ts:93-99
/**
 * The settings domain's base service. Features that own a preference reach the
 * settings transport through this service rather than a shared function: the
 * client bundle purity gate forbids cross-plugin value imports and directs
 * cross-plugin collaboration through cordis services
 * (`packages/client/tsdown.client.ts`).
 */
```

Collaborate through `ctx.<service>` + `export const inject = [...]`, never by requiring
another plugin's bundle for its values (that path is only for `external`-declared module
specifiers, §2).

### 12.14 Slot injection is cached per entry — do not expect per-render values

`inject(...)` runs **once** per registration (per binding for scoped slots) and its result is
memoized in a WeakMap (**RND:329-430**). Anything that must be fresh per render belongs in
the component, not in `inject`. Correspondingly, `renderSlot` bindings are identity-stable
per entry and **throw after disposal**:

```js
// RND:274-285
* Per-entry renderSlot bindings. The binding is identity-stable per entry
* (memoized components must not resubscribe on unrelated re-renders) and dies
* with the entry: a retained closure calling after the entry's disposal hits
* the in-ledger check and throws.
…
if (!host.isLive(entry)) throw new _deepseek_ai_dsh_client_ui_slots.StaleAuthorizationError(`renderSlot('${key}') from a disposed registration`);
```

### 12.15 `settings.general.item` cannot project a label

```js
// CCR:3596
doc: "… The\nsection column only stacks rows, so a row draws its own internals,\nincluding its label: nothing projects a `label` here and the owner passes\nno props at all …"
```

Passing `label` to a `settings.general.item` registration is silently ignored. If you want a
labelled row, render the label in your component (as ui-theme does: `THM:78-80`,
`THM:961-967`).

### 12.16 Cordis-service-name traps in the browser

- `ctx.slots` is provided by **ui-renderer**, so `slots` must be in your runtime `inject`
  (**THM:1457-1462** adds it explicitly).
- `ctx.theme` is provided by **ui-theme**; `ctx.locale` by **ui-locale**.
- `ctx.settingsScope` is provided by **ui-settings** (declared at **SPBIND:88-92**).
- Putting any of these in `inject` when the provider is absent leaves you `PENDING` → shell
  white-screen (§1.4). Prefer the dream-skin probe-and-degrade shape (**DS:36-73**) for
  anything non-essential, or wrap the risky calls in `try`.

---

## Appendix A — minimal skeleton for `dsh-custom-style`

Putting §1–§11 together (all patterns verified above; adapt names):

**`package.json` (excerpt, `dsh` block)**

```jsonc
"exports": {
  ".":        { "default": "./lib/index.js" },
  "./client": { "default": "./lib/client.js" },
  "./package.json": "./package.json"
},
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": {
    "inject": [
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-renderer",
      "@deepseek-ai/dsh-client-ui-settings",
      "@deepseek-ai/dsh-client-ui-settings-general",
      "@deepseek-ai/dsh-client-ui-theme"
    ],
    "platform": "web",
    "immediately": false
  }
}
```

> `immediately: true` is what the shipped `ui-*` packages use, but it is only a **stage-one
> prefetch** optimization for rows needed at first paint (`MODT:55-56`). A settings-only
> plugin can leave it `false`; the row still activates (`SHELL:114`, `runPluginBoot` iterates
> `manifest.plugins`, not just the immediate tier).

**On the `inject` array.** It must name **installed client packages that are graph rows** —
listing a seed word here does not resolve anything and a nonexistent package is a warning at
composition time. Every name above is a real shipped package in this install
(`…/@deepseek-ai/`): `dsh-client-locale`, `dsh-client-ui-renderer`,
`dsh-client-ui-settings`, `dsh-client-ui-settings-general`, `dsh-client-ui-theme`. By
contrast `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`,
`@deepseek-ai/dsh-client-ui-primitives` and `@deepseek-ai/dsh-client-ui-dockkit` are
**seed words only** — they must NOT appear in `dsh.client.inject` (§1.3, §2.1).

**`cordis.patch.yml`**

```yaml
- insert:
    - id: custom-style
      name: 'dsh-custom-style'
```

**`lib/client.js` (skeleton)**

```js
window.__ModuleLoader__.load({
	id: "dsh-custom-style",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// 1. Resolve seeds defensively — a throwing factory white-screens the shell.
		const probe = { lastError: null };
		const seed = (name) => { try { return require(name); } catch (e) { probe.lastError = e; return null; } };
		const jsx = seed("react/jsx-runtime");
		const react = seed("react");
		const store = seed("@deepseek-ai/dsh-client-store");
		if (jsx === null || react === null || store === null) {
			try { console.warn("[dsh-custom-style] host modules unavailable; plugin disabled:", probe.lastError && probe.lastError.message); } catch {}
			exports.apply = () => {};
			exports.inject = [];                       // ← MUST be [] or the fiber stays pending
			return module.exports;
		}
		const { jsx: h, jsxs: hs } = jsx;
		const { defineStore } = store;

		// 2. Owned global stylesheet (rewritable in place), removed on unload.
		const PLUGIN_ID = "dsh-custom-style";
		const USER_CSS_TAG = "dsh-custom-style/user.css";
		let userTag = null;
		function installUserSheet(ctx) {
			if (typeof document === "undefined") return;
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = PLUGIN_ID;         // ← must equal the bundle id (HMR compares verbatim)
				tag.dataset.pluginCss = USER_CSS_TAG;
				(document.head || document.body).appendChild(tag);
				userTag = tag;
				return () => { tag.remove(); userTag = null; };
			}, "dsh-custom-style: user stylesheet");
		}

		// 3. Plugin state store.
		function createStyleStore() {
			return defineStore({
				init: () => ({ css: "", density: 14, revision: -1 }),
				actions: {
					sync: (d, css, density, revision) => {
						if (revision <= d.revision) return;     // never move backwards
						d.css = css; d.density = density; d.revision = revision;
					}
				}
			});
		}

		// 4. Section component (function component, plain createElement, no JSX build step needed).
		function CustomStyleSection(props) {
			const { renderSlot } = props;                   // available because we declare children
			return h("section", { style: { padding: "0 16px" } }, renderSlot("custom-style.tab", {}));
		}
		function CssEditorRow(props) {
			const { t, useStore, renderSlot } = props;
			const css = useStore((s) => s.css);
			return hs("div", {
				style: {
					borderBottom: ".5px solid var(--dsw-alias-border-l2)",
					padding: "16px 0",
					display: "flex", flexDirection: "column", gap: "8px"
				},
				children: [
					h("div", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 14, lineHeight: "22px" }, children: t("css.title") }),
					h("textarea", { value: css, spellCheck: false, style: { minHeight: 240, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", border: ".5px solid var(--dsw-alias-border-l4)", borderRadius: 8, padding: 8, fontFamily: "var(--ds-font-family-code)" } })
				]
			});
		}

		const SETTINGS_NS = "settings.customStyle";
		const zh = { "css.title": "自定义 CSS" };
		const en = { "css.title": "Custom CSS" };

		const inject = ["slots", "locale", "theme"];        // every one is guaranteed present on the shipped web composition

		function apply(ctx) {
			installUserSheet(ctx);
			ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), "dsh-custom-style: dictionaries");
			const styleStore = createStyleStore();
			let bound; let revision = 0;
			const injected = (actions) => { bound = actions; return {}; };
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "custom-style",
				order: 60,
				label: "Custom Style",
				locale: SETTINGS_NS,
				children: { "custom-style.tab": { kind: "list", scope: "root" } }
			}, CustomStyleSection));
			ctx.slots.inject("custom-style.tab", () => ctx.slots.register({
				name: "custom-style.tab",
				id: "css",
				order: 0,
				store: styleStore,
				locale: SETTINGS_NS,
				inject: injected
			}, CssEditorRow));
			// Host persistence: plain fetch against the plugin's own fenced route.
			fetch("/custom-style/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "get" }) })
				.then((r) => r.json())
				.then((r) => { if (r && r.ok && userTag) userTag.textContent = r.value.css || ""; })
				.catch(() => {});
		}

		exports.SETTINGS_NS = SETTINGS_NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
```

**Verify after every change** (the two ways to white-screen the GUI):
1. `node --check lib/client.js`, and
2. confirm every specifier passed to `require()` is in the 9-word seed list or an
   `external`-declared graph row, and every name in `exports.inject` is provided by a
   package you listed in `dsh.client.inject`.

---

## Appendix B — two findings about the current workspace state

These are observations about files in this repository, checked against the API above. They
are not part of the API contract, but they are actionable.

### B.1 `package.json` → `dsh.client.inject` currently lists a seed word

```jsonc
// D:\work\dsh-plugin\dsh-custom-style\package.json (as of this writing)
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": {
    "inject": [
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-store",          // ← seed word, not a graph row
      "@deepseek-ai/dsh-client-ui-renderer",
      "@deepseek-ai/dsh-client-ui-settings"
    ],
    "platform": "web",
    "immediately": false
  }
}
```

`@deepseek-ai/dsh-client-store` is one of the 9 platform seed words (**SHELL:114**
@553121): it is resolved by `makeRequire`'s first branch (**MOD:303**) and is **not** a boot
graph row, so the entry is silently skipped by `arriveGraphRow`:

```js
// MOD:265-268
for (const packageName of row.inject) {
    const dependency = this.graphRows.get(packageName);
    if (dependency !== void 0) await this.arriveGraphRow(dependency, [], visited);
}
```

Harmless, but misleading: it neither adds a graph edge nor affects activation order. The two
things it *cannot* do are (a) make `require("@deepseek-ai/dsh-client-store")` succeed — that
is the seed table's job — and (b) make the cordis service available. If the intent was for
`store` to be usable, the correct place is the runtime `exports.inject` list (§3.3), and even
there it is unnecessary because `@deepseek-ai/dsh-client-store` is a *module*, not a cordis
*service*.

Also missing from `dsh.client.inject`, if a `settings.section` is planned:
`@deepseek-ai/dsh-client-ui-settings-general` (the package that **declares**
`settings.section` — **SETG:601-631**). `slots.inject` will wait for the declaration, so the
section will simply never appear if that occupant never mounts; adding it as a graph edge
makes the section appear deterministically.

### B.2 The host half's `Origin` fence compares `host`, not `hostname`

```js
// D:\work\dsh-plugin\dsh-custom-style\lib\index.js:185-190
const origin = req.headers.origin;
if (origin === undefined) return true;
try {
    return new URL(origin).host === hostUrl.host;
} catch {
    return false;
}
```

This mirrors dream-skin (**DSHOST:151-157**) but diverges from better-sidebar, whose comment
explains why `.hostname` is the safer comparison:

```ts
// dsh-better-sidebar/src/trust-fence.ts:70-80
  // Origin fence: when a browser attaches an Origin it must name this
  // hostname (the Host fence above already bound the authority, so the port
  // must not re-decide trust). Comparing hostname, not host: some Chromium
  // builds (Edge 151) serialize the Origin of a non-default-port loopback page
  // without the port, and refusing those bricks every /sidebar route. …
  return new URL(origin).hostname === hostUrl.hostname
```

A DSH Desktop launch binds an OS-assigned port (**DS lib/index.js:8-11** documents exactly
this), so a port-sensitive comparison is a live risk: a browser that omits the port in
`Origin` would get a 403 on every write. This is worth switching to `.hostname`.

---

## Appendix C — quick lookup: file:line index of the primary evidence

| Claim | Evidence |
|---|---|
| Bundle wrapper shape | `dsh-client-modules/lib/client.js:1-6`; `dsh-dream-skin/lib/client.js:18-23`; `dsh-client-ui-theme/lib/client.js:1-9` |
| `load({id, factory})` types | `dsh-client-modules/lib/types/client/manifest.d.ts:147-157` |
| Seed table (9 words) | `dsh-web-frontend/dist/assets/index-BKQ_L1z6.js:114` @553121 |
| `require` resolution + miss error | `dsh-client-modules/lib/client.js:300-310` |
| require cycle fatal | `dsh-client-modules/lib/client.js:278`, `:195-196` |
| graph cycle rejected by host | `dsh-client-modules/lib/index.js:358-362` |
| style claiming | `dsh-client-modules/lib/client.js:165-176` |
| factory-throw blast radius | `dsh-dream-skin/lib/client.js:24-35`, `:5863-5869`; `dsh-web-frontend/…/index-BKQ_L1z6.js:114` @555208 |
| `dsh.client` validation | `dsh-client-modules/lib/index.js:139-154`, `:47-51` |
| `dsh.client` consumption | `dsh-client-modules/lib/index.js:637-667`, `:155-166` |
| WebBootEntry semantics | `dsh-client-modules/lib/types/client/manifest.d.ts:38-59`, `:86-109` |
| `external` real usage | `dsh-api-session-controller/package.json`, `dsh-api-workspace-controller/package.json` |
| patch algorithm | `dsh-app-boot/lib/index.js:59-107`; `cordis-plugin-include/lib/index.js:28,69-84` |
| patch file parsing | `dsh-app-boot/lib/index.js:1130-1204` |
| `dsh.bundle.patch` resolution | `dsh-app-boot/lib/index.js:843-871` |
| EntryOptions | `cordis-plugin-loader/src/config/entry.ts:8-22` |
| plugin shapes | `cordis/lib/types/registry.d.ts:47-81` |
| host-half example | `dsh-dream-skin/lib/index.js:45-47`, `:268-287` |
| `webServer.register` | `dsh-host-webserver/lib/types/index.d.ts:30-39`, `:84-97` |
| `webRuntime.trustedHosts` | `dsh-better-sidebar/src/context-types.ts:99-107`; `dsh-web-app/cordis.patch.yml:154-161,181-188` |
| trust fence (canonical) | `dsh-better-sidebar/src/trust-fence.ts:31-84` |
| trust fence (hardened, Origin `.host`) | `dsh-dream-skin/lib/index.js:111-158` |
| slots service `inject` | `dsh-client-ui-renderer/lib/client.js:1000-1074` |
| slots service `register` | `dsh-client-ui-renderer/lib/client.js:1388-1391`, `:1250-1271` |
| SlotCore validation | `dsh-web-frontend/…/index-BKQ_L1z6.js:56` @199798 |
| standard kit / store / locale / renderSlot | `dsh-client-ui-renderer/lib/client.js:599-627` |
| props spread order | `dsh-client-ui-renderer/lib/client.js:644-658` |
| inject run/cache | `dsh-client-ui-renderer/lib/client.js:333-340`, `:397-430` |
| renderSlot binding + `only` filter | `dsh-client-ui-renderer/lib/client.js:279-297`, `:866-869` |
| entry error boundary | `dsh-client-ui-renderer/lib/client.js:509-533` |
| `settings.section` contract | `dsh-client-ui-settings/lib/types/client/contract/slots.d.ts:56-71`, `:141-151` |
| `settings.general.item` contract | `dsh-client-ui-settings/lib/types/client/contract/slots.d.ts:100-125` |
| machine-readable slot catalog | `dsh-cordis-client-runner/lib/client.js:3592-3641`, `:3871-3920` |
| `settings.section` declaration site | `dsh-client-ui-settings-general/lib/client.js:601-661` |
| section render + nav rows | `dsh-client-ui-settings-general/lib/client.js:165-168`, `:559-583` |
| real `settings.section` regs | `dsh-dream-skin/lib/client.js:5370-5380`; `dsh-better-sidebar/src/client/index.tsx:448-454` |
| real `settings.general.item` regs | `dsh-client-ui-theme/lib/client.js:1493-1515` |
| store: `defineStore` | `dsh-web-frontend/…/index-BKQ_L1z6.js:56` @198966 |
| store: snapshot store / immer | `dsh-web-frontend/…/index-BKQ_L1z6.js:56` @198211, @198000 |
| store usage | `dsh-client-ui-theme/lib/client.js:1011-1044`, `:1477-1499` |
| locale `register` overloads | `dsh-client-locale/lib/types/client/index.d.ts:176-215` |
| `t` seat binding | `dsh-client-ui-renderer/lib/client.js:602-606`, `:431-456` |
| `theme.overrideTokens` contract | `dsh-client-ui-theme/lib/types/client/index.d.ts:162-178` |
| `{light,dark}` validator | `dsh-client-ui-theme/lib/client.js:1425-1442` |
| override catalog (13 tokens) | `dsh-client-ui-theme/lib/client.js:1131-1230` |
| `ThemeSnapshot` | `dsh-client-ui-theme/lib/types/client/index.d.ts:54-70`; compose `…/lib/client.js:1396-1404` |
| `theme/change` | `dsh-client-ui-theme/lib/types/client/index.d.ts:88-96`; `…/lib/client.js:1405-1409` |
| dynamic-plugin source pinning | `dsh-cordis-client-runner/lib/client.js:302-308` |
| `settingsScope.bind` | `dsh-client-ui-settings/lib/types/client/settings-scope.d.ts:88-140` |
| settings scope contract | `dsh-client-ui-settings/lib/types/client/settings-contract.d.ts:5-85` |
| loopback ⇒ host/memory | `dsh-client-ui-settings/lib/client.js:1345`, `:1074-1082` |
| namespace missing ⇒ unavailable | `dsh-client-ui-settings/lib/client.js:1083-1095` |
| describe returns all namespaces | `dsh-api-settings-controller/lib/index.js:419-430`; `README.md:30` |
| settings register + grammar | `dsh-settings/README.md`, "Registering a namespace" |
| style install + effect teardown | `dsh-client-ui-theme/lib/client.js:1064-1090`; `:27-34` |
| HMR style removal + ordering | `dsh-client-hmr/lib/client.js:53-56`, `:71-82`; `lib/types/client/index.d.ts:16-28` |
| style-ordering requirement | `dsh-client-ui-theme/README.md:54` |
| `!important` / shadow-vs-outline / selector drift | `dsh-dream-skin/lib/client.js:2200-2273` |
| jsdom / documentless guards | `dsh-client-ui-theme/lib/client.js:1079`, `:1256`, `:1418-1423`; `dsh-client-modules/lib/client.js:171` |
| Windows rename fallback | `dsh-dream-skin/lib/index.js:76-82`; `D:\work\dsh-plugin\dsh-custom-style\lib\index.js:94-114` |
| purity gate | `dsh-client-ui-settings/lib/types/client/index.d.ts:93-99` |
