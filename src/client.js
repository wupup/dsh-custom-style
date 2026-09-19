/**
 * dsh-custom-style — browser half (client plugin bundle source).
 *
 * `tools/build-client.mjs` wraps this file into a single self-contained
 * `lib/client.js` in the plain-CJS factory format the vendored cordis Loader
 * materializes (`window.__ModuleLoader__.load({ id, factory })`), injecting the
 * generated `--dsw-*` token catalog into `TOKENS`. That generated file is what
 * the host serves; this file is the maintainable source.
 *
 * Contract notes that shape everything below:
 *
 *  - One `require` seed only: `react`. The shell's frozen module table exposes
 *    React (with `createElement`, so no `react/jsx-runtime` needed), and fewer
 *    seeds means fewer ways for the host generation to break us. A missing seed
 *    degrades to an invisible no-op plugin rather than a shell-wide failure.
 *  - A factory that throws takes the WHOLE web shell down ("Failed to load
 *    plugins"), so every seed probe and every registration is defensive.
 *  - `apply` runs inside the plugin's cordis fiber: `ctx.effect` gives teardown
 *    for style tags and listeners, so HMR and disable remove exactly what we
 *    mounted.
 *  - Shipped sheets declare their tokens on `body`, not `:root`. Our layers are
 *    therefore authored at `body` specificity and mounted last in `<head>`, so
 *    source order decides in our favour without an `!important` arms race.
 */

/** The state-file keys the host half stores, and nothing else. */
const WIRE_KEYS = Object.freeze({
	css: "css",
	enabled: "enabled",
	rules: "rules",
	vars: "vars",
	knobs: "knobs",
	preset: "preset"
});

/** The locale namespace owning this plugin's settings copy. */
const SETTINGS_NS = "settings.customStyle";

/** localStorage mirror key — the first-paint seed that survives a reload. */
const CACHE_KEY = "dsh-custom-style:state";

/** Fenced persistence route served by this plugin's host half. */
const API_PATH = "/custom-style/api";

/** Ownership tag on every style tag this plugin mounts. */
const PLUGIN_ID = "dsh-custom-style";

/** debounce for pushing state to the host, in ms. */
const PUSH_DEBOUNCE_MS = 500;

/** debounce for rebuilding the injected stylesheets, in ms. */
const APPLY_DEBOUNCE_MS = 60;

// ── platform seeds ──────────────────────────────────────────────────────────
//
// The host does NOT isolate loader-entry factories: one throwing factory
// aggregates into "entries did not activate" and takes the whole web shell down
// with "Failed to load plugins". Every seed is therefore resolved inside a try,
// success is detected by `require` RETURNING (never by matching host-internal
// error wording), and a total failure returns a DUMB MODULE — a no-op plugin
// that is merely invisible instead of one that white-screens DSH.

/** Last seed failure, reported in the degraded-mode warning. */
let seedError = null;

/** Require one platform seed, or null when this host does not provide it. */
function requireSeed(name) {
	try {
		return require(name);
	} catch (error) {
		seedError = error;
		return null;
	}
}

let _react = requireSeed("react");

/**
 * `react-dom`, used for exactly one thing: portalling the floating picker bar
 * out of the settings modal (which picking hides). Optional by design — without
 * it there is simply no bar, and the panel's own Stop button and Esc still work,
 * so a shell that does not expose the seed loses a convenience and nothing else.
 */
let _reactDom = requireSeed("react-dom");

/** React's `createElement`, aliased to the classic hyperscript name. */
let h = _react === null ? null : _react.createElement;

/**
 * `useSyncExternalStore` landed in React 18 and every DSH build ships React
 * 18+, but the fallback costs four lines and removes a hard dependency on the
 * shell's exact React version.
 */
let useStoreValue = null;

if (_react !== null) {
	useStoreValue = typeof _react.useSyncExternalStore === "function"
		? (subscribe, getSnapshot) => _react.useSyncExternalStore(subscribe, getSnapshot)
		: (subscribe, getSnapshot) => {
			const [value, setValue] = _react.useState(getSnapshot);
			_react.useEffect(() => subscribe(() => setValue(getSnapshot())), [subscribe, getSnapshot]);
			return value;
		};
}

if (h === null || useStoreValue === null) {
	// Degrade to "invisible but harmless": export a no-op surface so the shell
	// boots clean, and keep the original error in one console warning.
	try {
		console.warn(`[${PLUGIN_ID}] required host modules unavailable — plugin disabled for this session:`, seedError?.message);
	} catch {
		// console itself may be missing in an exotic host
	}
	// Injected services stay empty: naming a service whose provider never appears
	// leaves this fiber PENDING, and the boot fails on that exactly as it does on
	// a throwing factory.
	exports.SETTINGS_NS = SETTINGS_NS;
	exports.PRESETS = [];
	exports.apply = () => {};
	exports.inject = [];
	return module.exports;
}

/** The generated `--dsw-*` token catalog, injected by tools/build-client.mjs. */
const TOKENS = /* @__TOKEN_CATALOG__ */ { aliases: [] };

/** Token name → catalog entry, for default lookups. */
const CATALOG_BY_NAME = new Map((TOKENS.aliases ?? []).map((entry) => [entry.name, entry]));

/**
 * The injected stylesheet must live at `body` specificity to outrank the
 * shipped sheets, which declare their palettes on `body`. Anything we author is
 * therefore emitted against `body` (or a descendant selector), never `:root`.
 */

// ── defaults ────────────────────────────────────────────────────────────────

/** Knob bounds — the single source of truth for the sliders and the CSS. */
const KNOB_SPECS = Object.freeze([
	{
		key: "fontScale",
		label: "knob.fontScale",
		hint: "knob.fontScale.hint",
		min: 0.85,
		max: 1.25,
		step: 0.01,
		format: "scale",
		fallback: 1
	},
	{
		key: "density",
		label: "knob.density",
		hint: "knob.density.hint",
		min: 0,
		max: 1,
		step: 0.05,
		format: "scale",
		fallback: 0.5
	},
	{
		key: "radius",
		label: "knob.radius",
		hint: "knob.radius.hint",
		min: 0,
		max: 24,
		step: 1,
		format: "px",
		fallback: 10
	},
	{
		key: "contentWidth",
		label: "knob.contentWidth",
		hint: "knob.contentWidth.hint",
		min: 620,
		max: 1400,
		step: 20,
		format: "px",
		fallback: 820
	},
	{
		key: "bubbleRadius",
		label: "knob.bubbleRadius",
		hint: "knob.bubbleRadius.hint",
		min: 0,
		max: 24,
		step: 1,
		format: "px",
		fallback: 12
	}
]);

/** Knob key → its spec. */
const KNOB_BY_KEY = new Map(KNOB_SPECS.map((spec) => [spec.key, spec]));

/**
 * Factory defaults. `density` sits at 0.5 and every other knob at its neutral
 * value, so an untouched install injects a layer that is visually a no-op.
 */
const DEFAULT_KNOBS = Object.freeze(
	Object.fromEntries(KNOB_SPECS.map((spec) => [spec.key, spec.fallback]))
);

/** A brand-new, unconfigured state. */
function defaultState() {
	return {
		/** Master switch: off removes every injected rule, keeping the data. */
		enabled: true,
		/** The user's hand-written global stylesheet. */
		css: "",
		/** Rules authored with the visual picker. */
		rules: [],
		/** `--dsw-*` (and any other custom property) overrides. */
		vars: [],
		/** Density / typography knob values. */
		knobs: { ...DEFAULT_KNOBS },
		/** The preset last applied, for display only. */
		preset: ""
	};
}

// ── CSS value helpers ───────────────────────────────────────────────────────

/** The CSS properties the visual picker can author, grouped for the UI. */
const PROPERTY_SPECS = Object.freeze([
	{ name: "font-size", label: "prop.fontSize", kind: "length", group: "type" },
	{ name: "font-weight", label: "prop.fontWeight", kind: "weight", group: "type" },
	{ name: "line-height", label: "prop.lineHeight", kind: "length", group: "type" },
	{ name: "letter-spacing", label: "prop.letterSpacing", kind: "length", group: "type" },
	{ name: "text-align", label: "prop.textAlign", kind: "enum", values: ["left", "center", "right", "justify"], group: "type" },
	{ name: "color", label: "prop.color", kind: "color", group: "type" },
	{ name: "background-color", label: "prop.background", kind: "color", group: "box" },
	{ name: "background", label: "prop.backgroundFull", kind: "text", group: "box" },
	{ name: "padding", label: "prop.padding", kind: "length", group: "box" },
	{ name: "margin", label: "prop.margin", kind: "length", group: "box" },
	{ name: "width", label: "prop.width", kind: "length", group: "box" },
	{ name: "max-width", label: "prop.maxWidth", kind: "length", group: "box" },
	{ name: "min-height", label: "prop.minHeight", kind: "length", group: "box" },
	{ name: "border", label: "prop.border", kind: "text", group: "border" },
	{ name: "border-radius", label: "prop.borderRadius", kind: "length", group: "border" },
	{ name: "box-shadow", label: "prop.boxShadow", kind: "text", group: "border" },
	{ name: "opacity", label: "prop.opacity", kind: "scale", group: "effect" },
	{ name: "display", label: "prop.display", kind: "enum", values: ["block", "flex", "inline-flex", "inline", "none"], group: "effect" }
]);

/** Property name → its spec. */
const PROPERTY_BY_NAME = new Map(PROPERTY_SPECS.map((spec) => [spec.name, spec]));

/**
 * Whether a value looks like a bare CSS length/number that must carry a unit
 * to be meaningful. `0` is legal bare, and anything already carrying a unit,
 * a percentage, or a function is passed through untouched.
 */
function needsUnit(value) {
	const trimmed = value.trim();
	if (trimmed === "" || trimmed === "0") return false;
	return /^-?\d*\.?\d+$/.test(trimmed);
}

/**
 * Qualify one authored declaration so it reliably beats the shipped sheets.
 *
 * The rule bodies we generate are already more specific than the originals in
 * the common case, but DSH styles components with CSS modules whose class
 * selectors can out-specify a bare element or attribute selector. The picker
 * exists to make a change the user asked for actually land, so every authored
 * declaration is marked important — that is the honest semantic here, and it
 * is exactly why the visual rules are kept in their own layer that the master
 * switch can remove.
 */
function qualify(property, value) {
	const spec = PROPERTY_BY_NAME.get(property);
	let next = String(value).trim();
	if (spec !== undefined && spec.kind === "length" && needsUnit(next)) next += "px";
	return { property, value: next, important: true };
}

/** Render one authored rule to CSS, or "" when it has no declarations. */
function ruleToCss(rule) {
	const declarations = (rule.declarations ?? [])
		.filter((declaration) => typeof declaration.value === "string" && declaration.value.trim() !== "")
		.map((declaration) => {
			const suffix = declaration.important === false ? "" : " !important";
			return `\t${declaration.property}: ${declaration.value}${suffix};`;
		});
	if (declarations.length === 0) return "";
	return `${rule.selector} {\n${declarations.join("\n")}\n}`;
}

// ── selector generation ─────────────────────────────────────────────────────

/** Attributes that describe a stable identity rather than transient state. */
const IDENTITY_ATTRIBUTES = ["data-testid", "data-test-id", "data-slot", "data-name", "data-kind", "data-role"];

/** Attribute prefixes whose values identify a component type, not an instance. */
const STABLE_ATTRIBUTE_PREFIXES = ["data-testid", "data-test-id", "data-slot", "data-name", "data-kind", "data-role", "aria-label", "role", "type", "name"];

/** Escape one CSS identifier per the CSSOM serialization rules. */
function escapeIdent(value) {
	return String(value).replace(/[^\w-]|^(?=\d)|^-(?=\d)/g, (character) => `\\${character}`);
}

/** Escape one attribute value for a double-quoted CSS string. */
function escapeAttributeValue(value) {
	return String(value).replace(/["\\]/g, "\\$&");
}

/** Whether a class name looks generated (hash, css-module suffix) rather than authored. */
function isHashedClass(name) {
	// css-module style: a readable stem plus a hash, e.g. `_composer_1a2b3`.
	if (/^_[^_]+_[0-9a-f]{4,}$/i.test(name)) return true;
	// bare hash-ish tokens
	if (/^[0-9a-f]{6,}$/i.test(name)) return true;
	// `css-1a2b3c` emotion/styled-components style
	if (/^(css|sc|jsx)-[0-9a-z]{5,}$/i.test(name)) return true;
	return false;
}

/**
 * Build a readable, reasonably stable CSS selector for one element.
 *
 * Strategy, best first:
 *   1. `#id` when the id is authored-looking (not a generated uuid and unique).
 *   2. `tag[stable-attribute="value"]` for identity attributes, made unique by
 *      an `:nth-of-type()` on the step that needs it.
 *   3. The shortest ancestor path (max 4 steps) built from `tag.class` pairs,
 *      skipping generated-looking classes, anchored at the nearest ancestor
 *      with an id when one exists.
 *
 * The result is always validated against `document.querySelectorAll` before it
 * is returned, so a selector that would match nothing (or everything) is
 * discarded in favour of a longer, safer path.
 */
function buildSelector(element) {
	if (element === null || element === undefined || element.nodeType !== 1) return "";
	const document_ = element.ownerDocument;
	if (document_ === null || document_ === undefined) return "";

	/** Whether a selector matches exactly this element and nothing else. */
	const isUnique = (selector) => {
		try {
			const matches = document_.querySelectorAll(selector);
			return matches.length === 1 && matches[0] === element;
		} catch {
			return false;
		}
	};

	/** The identity selector for this element alone, or "". */
	const selfSelector = () => {
		const tag = element.tagName.toLowerCase();
		// An authored id is the best identity there is, but a randomly generated
		// one (React `useId`, uuid fragments) is worse than useless: it survives
		// no re-render. Only accept an id that looks like a name.
		const id = element.getAttribute("id");
		if (typeof id === "string" && /^[A-Za-z][\w-]*$/.test(id) && !/^[0-9a-f]{8,}$/i.test(id)) {
			const selector = `#${escapeIdent(id)}`;
			if (isUnique(selector)) return selector;
		}
		for (const attribute of IDENTITY_ATTRIBUTES) {
			const value = element.getAttribute(attribute);
			if (typeof value !== "string" || value === "") continue;
			const selector = `${tag}[${attribute}="${escapeAttributeValue(value)}"]`;
			if (isUnique(selector)) return selector;
		}
		// Authored-looking classes, in document order.
		const classes = Array.from(element.classList ?? []).filter((name) => !isHashedClass(name));
		for (const className of classes) {
			const selector = `${tag}.${escapeIdent(className)}`;
			if (isUnique(selector)) return selector;
		}
		if (classes.length > 0) return `${tag}.${escapeIdent(classes[0])}`;
		return tag;
	};

	const simple = selfSelector();
	if (isUnique(simple)) return simple;

	// Not unique on its own: walk up and prefix ancestors until the combined
	// selector resolves to exactly this element.
	const steps = [simple];
	let current = element.parentElement;
	let depth = 0;
	while (current !== null && current !== undefined && depth < 4) {
		const tag = current.tagName.toLowerCase();
		if (tag === "html" || tag === "body") {
			steps.unshift(tag);
			const selector = steps.join(" > ");
			if (isUnique(selector)) return selector;
			break;
		}
		const id = current.getAttribute("id");
		let step;
		if (typeof id === "string" && /^[A-Za-z][\w-]*$/.test(id)) {
			step = `#${escapeIdent(id)}`;
		} else {
			const classes = Array.from(current.classList ?? []).filter((name) => !isHashedClass(name));
			step = classes.length > 0 ? `${tag}.${escapeIdent(classes[0])}` : tag;
		}
		steps.unshift(step);
		const selector = steps.join(" > ");
		if (isUnique(selector)) return selector;
		current = current.parentElement;
		depth += 1;
	}

	// Nothing unique yet — make the last step positional within its parent.
	if (element.parentElement !== null && element.parentElement !== undefined) {
		const tag = element.tagName.toLowerCase();
		const index = Array.prototype.indexOf.call(element.parentElement.children, element) + 1;
		const positional = `${steps.join(" > ")}:nth-child(${index})`;
		if (isUnique(positional)) return positional;
	}
	return steps.join(" > ");
}

/**
 * Read the computed values the picker cares about for one element, so the
 * editor opens pre-filled with what the user can actually see.
 */
function readComputed(element, propertyNames) {
	const view = element.ownerDocument?.defaultView;
	if (view === null || view === undefined) return {};
	const computed = view.getComputedStyle(element);
	const values = {};
	for (const name of propertyNames) {
		const value = computed.getPropertyValue(name);
		if (typeof value === "string" && value !== "") values[name] = value.trim();
	}
	return values;
}

// ── built-in preset packs ───────────────────────────────────────────────────

/**
 * The shipped preset packs. Each one is a partial state applied on top of the
 * current configuration, so applying a pack never silently drops the parts of
 * the user's setup it does not speak about (their hand-written CSS, say).
 *
 * Presets only use mechanisms verified to work without knowing DSH's private
 * component class names: density/typography knobs, `--dsw-*` token overrides,
 * and `--dsw-corner-shape`. Structural CSS packs would be guesswork against a
 * minified stylesheet, so the visual picker is the supported route for those —
 * and every pack is fully editable afterwards.
 */
const PRESETS = Object.freeze([
	{
		id: "compact",
		name: "preset.compact.name",
		description: "preset.compact.description",
		patch: { knobs: { density: 0.15, fontScale: 0.97, radius: 8 }, preset: "compact" }
	},
	{
		id: "relaxed",
		name: "preset.relaxed.name",
		description: "preset.relaxed.description",
		patch: { knobs: { density: 0.85, fontScale: 1.04, radius: 14 }, preset: "relaxed" }
	},
	{
		id: "square",
		name: "preset.square.name",
		description: "preset.square.description",
		patch: { knobs: { radius: 0 }, preset: "square" }
	},
	{
		id: "round",
		name: "preset.round.name",
		description: "preset.round.description",
		patch: { knobs: { radius: 20, bubbleRadius: 18 }, preset: "round" }
	},
	{
		id: "warm-paper",
		name: "preset.warmPaper.name",
		description: "preset.warmPaper.description",
		patch: {
			preset: "warm-paper",
			vars: [
				{ name: "--dsw-alias-bg-base", light: "#faf6ef", dark: "#17140f" },
				{ name: "--dsw-alias-bg-layer-1", light: "#f3ede1", dark: "#1f1b14" },
				{ name: "--dsw-alias-label-primary", light: "#2b2419", dark: "#ece3d4" },
				{ name: "--dsw-alias-border-l2", light: "#0000001f", dark: "#ffffff1f" }
			]
		}
	},
	{
		id: "deep-ocean",
		name: "preset.deepOcean.name",
		description: "preset.deepOcean.description",
		patch: {
			preset: "deep-ocean",
			vars: [
				{ name: "--dsw-alias-bg-base", light: "#f2f7fb", dark: "#0b1420" },
				{ name: "--dsw-alias-bg-layer-1", light: "#e6eff7", dark: "#101d2c" },
				{ name: "--dsw-alias-brand-primary", light: "#0b6fa4", dark: "#4fb3e8" },
				{ name: "--dsw-alias-label-primary", light: "#0d2436", dark: "#dce9f4" }
			]
		}
	},
	{
		id: "mono",
		name: "preset.mono.name",
		description: "preset.mono.description",
		knobs: {},
		patch: {
			preset: "mono",
			knobs: { fontScale: 1, density: 0.5, radius: 6 },
			vars: [
				{ name: "--dsw-alias-bg-base", light: "#ffffff", dark: "#0e0e0e" },
				{ name: "--dsw-alias-bg-layer-1", light: "#f4f4f4", dark: "#181818" },
				{ name: "--dsw-alias-brand-primary", light: "#1a1a1a", dark: "#ededed" },
				{ name: "--dsw-alias-label-primary", light: "#111111", dark: "#f2f2f2" },
				{ name: "--dsw-alias-label-secondary", light: "#555555", dark: "#b0b0b0" }
			]
		}
	}
]);

/** Preset id → its definition. */
const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

/** Apply one preset's patch on top of a state, returning a new state. */
function applyPreset(state, presetId) {
	const preset = PRESET_BY_ID.get(presetId);
	if (preset === undefined) return state;
	const patch = preset.patch;
	// A preset that speaks about variables REPLACES the variable list (its
	// palette is a coherent whole); one that does not leaves the user's own
	// overrides exactly where they were.
	return {
		...state,
		...patch,
		knobs: { ...state.knobs, ...(patch.knobs ?? {}) },
		vars: patch.vars !== undefined ? patch.vars.map((entry) => ({ ...entry })) : state.vars,
		rules: state.rules,
		css: state.css
	};
}

// ── stylesheet composition ──────────────────────────────────────────────────

/** Clamp one knob to its declared bounds, falling back when unusable. */
function clampKnob(key, raw) {
	const spec = KNOB_BY_KEY.get(key);
	if (spec === undefined) return undefined;
	const parsed = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
	if (!Number.isFinite(parsed)) return spec.fallback;
	return Math.min(spec.max, Math.max(spec.min, parsed));
}

/**
 * The density/typography layer.
 *
 * Every derived value is a CSS `calc()` over the user's raw knob, so the layer
 * is one small stylesheet that the browser recomputes — no per-frame string
 * building while a slider is being dragged. `density` is measured from the
 * neutral 0.5, so a fresh install yields `1 *` factors and a no-op layer.
 */
function densityLayer(knobs) {
	const density = clampKnob("density", knobs.density);
	const radius = clampKnob("radius", knobs.radius);
	const bubbleRadius = clampKnob("bubbleRadius", knobs.bubbleRadius);
	const contentWidth = clampKnob("contentWidth", knobs.contentWidth);
	const fontScale = clampKnob("fontScale", knobs.fontScale);
	// -1 at the tight end, +1 at the loose end.
	const spread = ((density - 0.5) / 0.5).toFixed(3);
	const gap = `calc(var(--dcs-gap-base) * (1 + ${spread} * 0.6))`;
	const pad = `calc(var(--dcs-pad-base) * (1 + ${spread} * 0.5))`;
	return `/* density & typography */
body {
	--dcs-spread: ${spread};
	--dcs-gap: ${gap};
	--dcs-pad: ${pad};
	--dcs-radius: ${radius}px;
	--dcs-bubble-radius: ${bubbleRadius}px;
	--dcs-content-width: ${contentWidth}px;
	--dsh-content-font-size: ${Math.round(14 * fontScale * 100) / 100}px;
	font-size: calc(1em * ${fontScale});
}
body .dcs-scope,
body [class*="markdown"], body [class*="prose"] {
	line-height: calc(1.6 * (1 + ${spread} * 0.12));
}
/* The user bubble and the composer are the two surfaces every DSH build has. */
body [class*="user-bubble"], body [class*="userBubble"], body [class*="bubble"] {
	border-radius: var(--dcs-bubble-radius);
}
body [class*="markdown"], body [class*="prose"] {
	max-width: var(--dcs-content-width);
}`;
}

/** The theme-variable override layer, split by color scheme. */
function variableLayer(vars) {
	const light = [];
	const dark = [];
	for (const entry of vars ?? []) {
		if (entry === null || typeof entry !== "object") continue;
		const name = entry.name;
		if (typeof name !== "string" || !/^--[\w-]+$/.test(name)) continue;
		const lightValue = typeof entry.light === "string" ? entry.light.trim() : "";
		const darkValue = typeof entry.dark === "string" ? entry.dark.trim() : "";
		if (lightValue === "" && darkValue === "") continue;
		// A token stated for one scheme only would go illegible when the user
		// switches palette, so the stated value is mirrored onto the other one
		// rather than left at the shipped default.
		const value = lightValue !== "" ? lightValue : darkValue;
		const other = darkValue !== "" ? darkValue : lightValue;
		light.push(`\t${name}: ${value} !important;`);
		dark.push(`\t${name}: ${other} !important;`);
	}
	const blocks = [];
	if (light.length > 0) blocks.push(`/* variables (light) */\nbody {\n${light.join("\n")}\n}`);
	if (dark.length > 0) blocks.push(`/* variables (dark) */\nbody[data-ds-dark-theme] {\n${dark.join("\n")}\n}`);
	return blocks.join("\n");
}

/** The visual-picker rule layer. */
function ruleLayer(rules) {
	const blocks = (rules ?? []).map(ruleToCss).filter((css) => css !== "");
	if (blocks.length === 0) return "";
	return `/* visual rules */\n${blocks.join("\n")}`;
}

/**
 * Compose the complete injected stylesheet.
 * @returns the CSS text, or "" when the plugin is disabled or has nothing to say.
 */
function composeCss(state) {
	if (state.enabled !== true) return "";
	const parts = [densityLayer(state.knobs ?? DEFAULT_KNOBS), variableLayer(state.vars), ruleLayer(state.rules), state.css ?? ""];
	return parts.filter((part) => typeof part === "string" && part.trim() !== "").join("\n\n");
}

// ── state encoding ──────────────────────────────────────────────────────────

/**
 * Validate and normalize an untrusted config object (localStorage, an imported
 * pack, or the host file) into a complete state.
 *
 * Every field is treated as hostile: this runs on data that a user pasted, a
 * previous plugin version wrote, or a hand-edited JSON file contains. Anything
 * unusable falls back to its default rather than throwing, so one corrupt key
 * can never leave the settings panel unusable.
 */
function normalizeState(raw) {
	const base = defaultState();
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return base;

	const state = base;
	state.enabled = raw.enabled !== false;

	if (typeof raw.css === "string") state.css = raw.css;

	if (Array.isArray(raw.rules)) {
		state.rules = [];
		for (const candidate of raw.rules) {
			if (candidate === null || typeof candidate !== "object") continue;
			if (typeof candidate.selector !== "string" || candidate.selector.trim() === "") continue;
			const declarations = [];
			for (const declaration of Array.isArray(candidate.declarations) ? candidate.declarations : []) {
				if (declaration === null || typeof declaration !== "object") continue;
				if (typeof declaration.property !== "string" || typeof declaration.value !== "string") continue;
				declarations.push({
					property: declaration.property,
					value: declaration.value,
					important: declaration.important !== false
				});
			}
			state.rules.push({
				id: typeof candidate.id === "string" && candidate.id !== "" ? candidate.id : makeId(),
				selector: candidate.selector.trim(),
				label: typeof candidate.label === "string" ? candidate.label : candidate.selector.trim(),
				declarations
			});
		}
	}

	if (Array.isArray(raw.vars)) {
		state.vars = [];
		for (const candidate of raw.vars) {
			if (candidate === null || typeof candidate !== "object") continue;
			if (typeof candidate.name !== "string" || !/^--[\w-]+$/.test(candidate.name)) continue;
			const light = typeof candidate.light === "string" ? candidate.light : "";
			const dark = typeof candidate.dark === "string" ? candidate.dark : "";
			if (light.trim() === "" && dark.trim() === "") continue;
			state.vars.push({ name: candidate.name, light, dark });
		}
	}

	if (raw.knobs !== null && typeof raw.knobs === "object" && !Array.isArray(raw.knobs)) {
		for (const spec of KNOB_SPECS) {
			if (Object.prototype.hasOwnProperty.call(raw.knobs, spec.key)) {
				state.knobs[spec.key] = clampKnob(spec.key, raw.knobs[spec.key]);
			}
		}
	}

	if (typeof raw.preset === "string" && PRESET_BY_ID.has(raw.preset)) state.preset = raw.preset;

	return state;
}

/** Serialize a state into the flat `{key: string}` shape the host stores. */
function encodeState(state) {
	return {
		[WIRE_KEYS.enabled]: state.enabled ? "1" : "0",
		[WIRE_KEYS.css]: state.css,
		[WIRE_KEYS.rules]: JSON.stringify(state.rules),
		[WIRE_KEYS.vars]: JSON.stringify(state.vars),
		[WIRE_KEYS.knobs]: JSON.stringify(state.knobs),
		[WIRE_KEYS.preset]: state.preset
	};
}

/** Parse one JSON-valued wire key defensively. */
function parseJsonKey(value, fallback) {
	if (typeof value !== "string" || value === "") return fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

/** Decode the host's flat `{key: string}` record back into a state. */
function decodeWire(record) {
	if (record === null || typeof record !== "object" || Array.isArray(record)) return null;
	// An empty record means "nothing has ever been saved here". Reporting that
	// as `null` — rather than as a default state — lets the caller adopt the
	// durable copy only when it genuinely carries something, so a fresh install
	// (or a different origin's first visit) cannot wipe the local cache.
	if (Object.keys(record).length === 0) return null;
	return normalizeState({
		enabled: record[WIRE_KEYS.enabled] !== "0",
		css: typeof record[WIRE_KEYS.css] === "string" ? record[WIRE_KEYS.css] : "",
		rules: parseJsonKey(record[WIRE_KEYS.rules], []),
		vars: parseJsonKey(record[WIRE_KEYS.vars], []),
		knobs: parseJsonKey(record[WIRE_KEYS.knobs], DEFAULT_KNOBS),
		preset: typeof record[WIRE_KEYS.preset] === "string" ? record[WIRE_KEYS.preset] : ""
	});
}

/** A short unique id for an authored rule. */
function makeId() {
	return `r${Math.random().toString(36).slice(2, 9)}`;
}

// ── config store ────────────────────────────────────────────────────────────

/**
 * The one place the configuration lives, with a subscription surface for React.
 *
 * A hand-rolled store is used instead of `defineStore` + `props.useStore`
 * because the settings section component (which owns this plugin's tabs) does
 * not receive a store binding — only `settings.general.item` rows do. A plain
 * store plus `useSyncExternalStore` works identically from a section, a row, or
 * plain non-React code, and keeps this bundle to a single platform seed.
 */
function createConfigStore() {
	let state = defaultState();
	/** The exact object handed to `useSyncExternalStore`; replaced on every change. */
	let snapshot = Object.freeze({ ...state });
	const listeners = new Set();

	const notify = () => {
		snapshot = Object.freeze({ ...state });
		for (const listener of [...listeners]) {
			try {
				listener();
			} catch (error) {
				console.error(`[${PLUGIN_ID}] listener failed:`, error);
			}
		}
	};

	return {
		/** The current immutable snapshot (stable reference between changes). */
		get: () => snapshot,
		/** Subscribe for React's `useSyncExternalStore`. */
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		/** Replace the state from an untrusted source, after normalization. */
		replace: (raw) => {
			state = normalizeState(raw);
			notify();
			return snapshot;
		},
		/** Merge a partial patch into the state. */
		update: (patch) => {
			state = normalizeState({ ...state, ...patch });
			notify();
			return snapshot;
		},
		/** Mutate the working copy through a callback, then publish. */
		mutate: (mutator) => {
			const draft = {
				...state,
				rules: state.rules.map((rule) => ({ ...rule, declarations: rule.declarations.map((entry) => ({ ...entry })) })),
				vars: state.vars.map((entry) => ({ ...entry })),
				knobs: { ...state.knobs }
			};
			mutator(draft);
			state = normalizeState(draft);
			notify();
			return snapshot;
		}
	};
}

// ── panel bindings ──────────────────────────────────────────────────────────
//
// The React components and the plugin body share one factory scope, but `apply`
// runs after the component DEFINITIONS are evaluated. Every component therefore
// reaches the live instances through this one object: `apply` fills it in
// before registering the settings section, and a teardown clears the instance
// slots so a half-wired panel can never outlive its plugin.

/** Late-bound services shared by the plugin body and the panel components. */
const panelApi = {
	/** The live config store. Null before `apply` ran. */
	store: null,
	/** Commit a state mutation: publish, re-render the CSS, persist. */
	commit: () => {},
	/** Host transport surface (`push` / `get` / `reset`) for the presets tab. */
	host: null,
	/** The picker engine object, for the picker tab's live state. */
	picker: null,
	/** Enter picking mode; the argument is the section root, used to find the modal. */
	startPicking: () => {},
	/** Leave picking mode. */
	stopPicking: () => {},
	/**
	 * The element the floating picker bar is portalled into. It has to live
	 * outside the settings modal, because picking hides that modal.
	 */
	barHost: null
};

// ── settings-modal concealment ──────────────────────────────────────────────
//
// Picking must act on the PAGE, but the settings panel is a full-viewport modal
// sitting on top of it: every element the user actually wants to style is behind
// its mask, and a capture-phase listener cannot help because the modal's own
// layer wins the hit test before any listener runs. So the modal is hidden for
// the duration of picking and restored the moment it ends.
//
// This lives at module scope rather than inside `apply` because it owns DOM
// state that must survive re-renders.

/** The settings modal layer we hid, or null. */
let hiddenOverlay = null;
/** The `display` value that layer had before we hid it, restored verbatim. */
let hiddenOverlayDisplay = "";

/**
 * Find the layer to hide for the settings modal: the dialog itself, or an
 * element wrapping it that exists ONLY for it.
 *
 * The shipped `SettingsRoot` renders the modal INLINE (it never calls
 * `createPortal`), so this section is a DOM descendant of the panel and a walk
 * upward finds it. The walk is the primary strategy because it cannot pick the
 * wrong dialog — it can only find the one we are actually inside.
 *
 * Where the walk STOPS is the part that matters. Hiding too little leaves the
 * mask covering the page; hiding too much blanks the app.
 *
 * The rule is "the modal's own chain": starting at the ARIA dialog
 * (`role="dialog"`, stable while the shipped CSS-module classes are per-build
 * hashes), climb while every OTHER element child of the candidate is either
 * `aria-hidden` (the mask) or already part of the chain. That is exactly the
 * shipped shape — `overlay` holds `mask` (`aria-hidden`) plus `panel` — so the
 * overlay is taken and the dialog inside it is hidden with it.
 *
 * Crucially, a second layer can never JOIN the chain: once a sibling would have
 * to join, the walk stops. Without that, a wrapper holding the overlay *and* more
 * of the page would be accepted, and the walk would keep climbing until it hid
 * the app root — which is the failure this rule exists to prevent. The climb also
 * never reaches `body`/`html`, whatever the markup.
 */
function findModalOverlay(element) {
	let dialog = element;
	while (dialog !== null && dialog !== undefined) {
		if (dialog.getAttribute?.("role") === "dialog") break;
		dialog = dialog.parentElement;
	}
	if (dialog === null || dialog === undefined) return null;

	/** Everything hidden so far: the dialog, plus any wrapper taken for it. */
	const chain = new Set([dialog]);
	const isWrapperFor = (candidate) => {
		for (const child of candidate.children) {
			if (chain.has(child)) continue;
			if (child.getAttribute?.("aria-hidden") === "true") continue;
			return false;
		}
		return true;
	};

	let layer = dialog;
	let parent = dialog.parentElement;
	while (parent !== null && parent !== undefined && parent !== document.body && parent !== document.documentElement) {
		if (!isWrapperFor(parent)) break;
		layer = parent;
		chain.add(parent);
		parent = parent.parentElement;
	}
	return layer;
}

/**
 * Last-resort lookup, used only when the walk from our own position found
 * nothing (an unusual composition). It applies the same ARIA anchoring and the
 * same outermost-layer rule, so it can only produce a layer the walk accepts.
 */
function findModalOverlayFromDocument() {
	if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return null;
	for (const dialog of document.querySelectorAll('[role="dialog"][aria-modal="true"]')) {
		const found = findModalOverlay(dialog);
		if (found !== null) return found;
	}
	return null;
}

/**
 * Hide the settings modal and mark it, so the picker can recognize (and refuse)
 * its interior.
 *
 * Idempotent: only the first call does anything, so a second start cannot
 * overwrite the remembered `display` value with our own `"none"` and leave the
 * modal permanently hidden.
 */
function hideModal(origin) {
	if (hiddenOverlay !== null) return;
	// Prefer the walk from our own position; fall back to the document lookup so
	// a section mounted outside the dialog still gets the modal out of the way.
	const overlay = (origin === null || origin === undefined ? null : findModalOverlay(origin))
		?? findModalOverlayFromDocument();
	if (overlay === null) return;
	hiddenOverlay = overlay;
	hiddenOverlayDisplay = overlay.style.display;
	overlay.dataset.dcsHidden = "1";
	overlay.style.display = "none";
}

/** Restore the settings modal exactly as it was. */
function showModal() {
	if (hiddenOverlay === null) return;
	const overlay = hiddenOverlay;
	hiddenOverlay = null;
	delete overlay.dataset.dcsHidden;
	overlay.style.display = hiddenOverlayDisplay;
	hiddenOverlayDisplay = "";
}

// ── locales ─────────────────────────────────────────────────────────────────

/** Simplified Chinese copy (the key-set source of truth). */
const zh = {
	"nav.label": "自定义样式",
	"section.title": "自定义样式",
	"section.subtitle": "调整 DSH 网页端的外观：全局 CSS、点选元素、主题变量与界面密度。所有改动实时生效并自动保存。",
	"tab.css": "全局 CSS",
	"tab.picker": "点选元素",
	"tab.vars": "主题变量",
	"tab.layout": "界面密度",
	"tab.presets": "预设与分享",
	"common.reset": "恢复默认",
	"common.remove": "删除",
	"common.add": "添加",
	"common.apply": "应用",
	"common.cancel": "取消",
	"common.undo": "撤销",
	"common.copy": "复制",
	"common.copied": "已复制",
	"common.on": "已开启",
	"common.off": "已关闭",
	"common.empty": "暂无内容",
	"common.copyFailed": "复制失败，请手动选择文本",
	"common.importFailed": "导入失败",
	"master.title": "启用自定义样式",
	"master.hint": "关闭后所有自定义规则立即失效，但已保存的内容不会丢失。",
	"css.title": "全局自定义 CSS",
	"css.hint": "写入的 CSS 会注入到页面最后，优先级高于内置样式表；需要强制覆盖时可自行加 !important。",
	"css.placeholder": "/* 例如：\nbody { letter-spacing: .01em; }\n.dsw-scrollbar, ::-webkit-scrollbar { width: 10px; }\n*/",
	"css.undo": "撤销上次修改",
	"css.undoNone": "没有可撤销的修改",
	"css.insertToken": "插入变量",
	"css.injectError": "CSS 解析失败，已跳过本次注入",
	"picker.title": "点选元素",
	"picker.hint": "开启后把鼠标移到界面上任意元素即可看到它的边界，点击后在该元素上取样式规则。",
	"picker.start": "开始点选",
	"picker.stop": "停止点选",
	"picker.active": "点选中：点击页面元素即可选中",
	"picker.esc": "按 Esc 或点击此处可退出点选",
	"picker.bar.hint": "点选中 —— 点击页面上的元素，设置面板已暂时隐藏，按 Esc 结束",
	"picker.refused": "这是设置面板自身，点选时不作为目标；按 Esc 可退出点选",
	"picker.empty": "还没有规则。点击「开始点选」，然后在页面上选择要调整的元素。",
	"picker.selected": "已选中元素",
	"picker.selector": "选择器",
	"picker.selectorHint": "可以手动修改，修改后会校验是否匹配到元素。",
	"picker.matches": "匹配 {n} 个元素",
	"picker.noMatch": "该选择器没有匹配到任何元素",
	"picker.addDeclaration": "添加属性",
	"picker.property": "属性",
	"picker.value": "值",
	"picker.preview": "预览",
	"picker.computed": "当前计算值",
	"picker.rules": "已保存的规则",
	"picker.oneShot": "只选一次",
	"picker.oneShotHint": "开启时，选中一个元素后自动结束点选。",
	"picker.outline": "高亮颜色",
	"prop.fontSize": "字号",
	"prop.fontWeight": "字重",
	"prop.lineHeight": "行高",
	"prop.letterSpacing": "字间距",
	"prop.textAlign": "对齐",
	"prop.color": "文字颜色",
	"prop.background": "背景色",
	"prop.backgroundFull": "背景（完整写法）",
	"prop.padding": "内边距",
	"prop.margin": "外边距",
	"prop.width": "宽度",
	"prop.maxWidth": "最大宽度",
	"prop.minHeight": "最小高度",
	"prop.border": "边框",
	"prop.borderRadius": "圆角",
	"prop.boxShadow": "阴影",
	"prop.opacity": "不透明度",
	"prop.display": "显示方式",
	"propGroup.type": "文字",
	"propGroup.box": "盒模型",
	"propGroup.border": "边框与阴影",
	"propGroup.effect": "效果",
	"vars.title": "主题变量",
	"vars.hint": "覆盖 DSH 设计令牌。每一项都按浅色/深色分别生效，切换主题后依然可读。",
	"vars.search": "搜索变量名…",
	"vars.customAdd": "自定义变量",
	"vars.customName": "变量名（以 -- 开头）",
	"vars.light": "浅色",
	"vars.dark": "深色",
	"vars.overridden": "已覆盖",
	"vars.count": "{n} 个变量",
	"vars.defaultLight": "默认（浅色）",
	"vars.defaultDark": "默认（深色）",
	"vars.group.brand": "品牌色",
	"vars.group.button": "按钮",
	"vars.group.interactive": "交互态",
	"vars.group.label": "文字",
	"vars.group.border": "边框",
	"vars.group.background": "背景",
	"vars.group.markdown": "Markdown",
	"vars.group.scrollbar": "滚动条",
	"vars.group.state": "状态色",
	"vars.group.overlay": "浮层",
	"vars.group.link": "链接",
	"vars.group.alias": "其他语义变量",
	"vars.group.specific": "组件专用",
	"vars.group.static": "原始色板",
	"vars.group.shadow": "阴影",
	"vars.group.typography": "字体",
	"vars.group.other": "其他",
	"layout.hint": "这些滑块只改变间距、圆角与字号，不涉及颜色，因此与你正在使用的换肤插件互不冲突。",
	"layout.preview": "拖动滑块即可实时预览。",
	"knob.fontScale": "字体缩放",
	"knob.fontScale.hint": "整体放大或缩小会话文字，仅影响显示。",
	"knob.density": "界面密度",
	"knob.density.hint": "向左更紧凑、向右更宽松，影响行高与内边距。",
	"knob.radius": "全局圆角",
	"knob.radius.hint": "0 为直角，越大越圆润。",
	"knob.contentWidth": "内容宽度上限",
	"knob.contentWidth.hint": "限制消息正文的最大宽度，便于长文阅读。",
	"knob.bubbleRadius": "气泡圆角",
	"knob.bubbleRadius.hint": "仅影响用户消息气泡。",
	"layout.resetAll": "全部恢复默认",
	"presets.title": "预设样式包",
	"presets.hint": "一键套用一套现成配置。套用后仍可继续手动调整，不会覆盖你写的全局 CSS。",
	"presets.apply": "套用",
	"presets.applied": "当前使用",
	"presets.export": "导出当前配置",
	"presets.exportHint": "把当前全部设置导出为 JSON 文件，便于备份或分享。",
	"presets.import": "导入配置",
	"presets.importHint": "支持本插件导出的 JSON，或包含 css / vars / knobs 字段的对象。",
	"presets.importFile": "选择文件",
	"presets.importPaste": "或粘贴 JSON",
	"presets.importApply": "导入并覆盖",
	"presets.importConfirm": "导入会覆盖当前的全部自定义样式，确定继续？",
	"presets.imported": "导入成功",
	"presets.danger": "危险操作",
	"presets.resetAll": "清空全部自定义样式",
	"presets.resetAllConfirm": "将删除全局 CSS、全部点选规则、变量覆盖与滑块设置，且不可恢复。确定继续？",
	"presets.resetDone": "已清空",
	"preset.compact.name": "紧凑",
	"preset.compact.description": "更小的行高与内边距，一屏容纳更多内容。",
	"preset.relaxed.name": "宽松",
	"preset.relaxed.description": "更大的留白与字号，长时间阅读更轻松。",
	"preset.square.name": "直角",
	"preset.square.description": "去掉所有圆角，界面更硬朗。",
	"preset.round.name": "圆润",
	"preset.round.description": "更大的圆角与气泡弧度，视觉更柔和。",
	"preset.warmPaper.name": "暖纸",
	"preset.warmPaper.description": "米白底色配深棕文字，适合夜间以外的长时间阅读。",
	"preset.deepOcean.name": "深海",
	"preset.deepOcean.description": "蓝调底色与青色点缀，冷冽清爽。",
	"preset.mono.name": "黑白",
	"preset.mono.description": "完全去色的单色方案，专注且克制。"
};

/** English copy, checked key-for-key against the zh source of truth. */
const en = {
	"nav.label": "Custom Style",
	"section.title": "Custom Style",
	"section.subtitle": "Reshape the DSH web GUI: global CSS, click-to-style elements, design tokens, and density. Every change applies live and saves itself.",
	"tab.css": "Global CSS",
	"tab.picker": "Element picker",
	"tab.vars": "Tokens",
	"tab.layout": "Density",
	"tab.presets": "Presets",
	"common.reset": "Reset",
	"common.remove": "Remove",
	"common.add": "Add",
	"common.apply": "Apply",
	"common.cancel": "Cancel",
	"common.undo": "Undo",
	"common.copy": "Copy",
	"common.copied": "Copied",
	"common.on": "On",
	"common.off": "Off",
	"common.empty": "Nothing here yet",
	"common.copyFailed": "Copy failed — select the text manually",
	"common.importFailed": "Import failed",
	"master.title": "Enable custom styles",
	"master.hint": "Turning this off removes every custom rule immediately. Your saved work is kept.",
	"css.title": "Global custom CSS",
	"css.hint": "Injected last in the page, so it outranks the built-in sheets. Add !important yourself when you need to force an override.",
	"css.placeholder": "/* for example:\nbody { letter-spacing: .01em; }\n::-webkit-scrollbar { width: 10px; }\n*/",
	"css.undo": "Undo last edit",
	"css.undoNone": "Nothing to undo",
	"css.insertToken": "Insert token",
	"css.injectError": "The CSS did not parse — this revision was skipped",
	"picker.title": "Element picker",
	"picker.hint": "While active, hover any element to see its bounds; click it to author style rules scoped to that element.",
	"picker.start": "Start picking",
	"picker.stop": "Stop picking",
	"picker.active": "Picking: click any element on the page",
	"picker.esc": "Press Esc, or click here, to stop",
	"picker.bar.hint": "Picking — click an element on the page. The settings panel is hidden; press Esc to stop.",
	"picker.refused": "That is the settings panel itself; it is not a picking target. Press Esc to stop.",
	"picker.empty": "No rules yet. Start picking, then choose an element on the page to adjust.",
	"picker.selected": "Selected element",
	"picker.selector": "Selector",
	"picker.selectorHint": "Edit it freely — the match count updates as you type.",
	"picker.matches": "Matches {n} element(s)",
	"picker.noMatch": "This selector matches nothing",
	"picker.addDeclaration": "Add property",
	"picker.property": "Property",
	"picker.value": "Value",
	"picker.preview": "Preview",
	"picker.computed": "Computed now",
	"picker.rules": "Saved rules",
	"picker.oneShot": "Pick once",
	"picker.oneShotHint": "When on, picking stops automatically after one selection.",
	"picker.outline": "Highlight color",
	"prop.fontSize": "Font size",
	"prop.fontWeight": "Font weight",
	"prop.lineHeight": "Line height",
	"prop.letterSpacing": "Letter spacing",
	"prop.textAlign": "Text align",
	"prop.color": "Text color",
	"prop.background": "Background color",
	"prop.backgroundFull": "Background (full)",
	"prop.padding": "Padding",
	"prop.margin": "Margin",
	"prop.width": "Width",
	"prop.maxWidth": "Max width",
	"prop.minHeight": "Min height",
	"prop.border": "Border",
	"prop.borderRadius": "Border radius",
	"prop.boxShadow": "Box shadow",
	"prop.opacity": "Opacity",
	"prop.display": "Display",
	"propGroup.type": "Text",
	"propGroup.box": "Box",
	"propGroup.border": "Border & shadow",
	"propGroup.effect": "Effects",
	"vars.title": "Design tokens",
	"vars.hint": "Override DSH's design tokens. Each one carries a separate light and dark value so it stays legible when the palette flips.",
	"vars.search": "Search token names…",
	"vars.customAdd": "Custom variable",
	"vars.customName": "Variable name (starts with --)",
	"vars.light": "Light",
	"vars.dark": "Dark",
	"vars.overridden": "Overridden",
	"vars.count": "{n} tokens",
	"vars.defaultLight": "Shipped (light)",
	"vars.defaultDark": "Shipped (dark)",
	"vars.group.brand": "Brand",
	"vars.group.button": "Buttons",
	"vars.group.interactive": "Interactive",
	"vars.group.label": "Text",
	"vars.group.border": "Borders",
	"vars.group.background": "Backgrounds",
	"vars.group.markdown": "Markdown",
	"vars.group.scrollbar": "Scrollbar",
	"vars.group.state": "State",
	"vars.group.overlay": "Overlays",
	"vars.group.link": "Links",
	"vars.group.alias": "Other semantic tokens",
	"vars.group.specific": "Component-scoped",
	"vars.group.static": "Raw palette",
	"vars.group.shadow": "Shadows",
	"vars.group.typography": "Typography",
	"vars.group.other": "Other",
	"layout.hint": "These sliders only move spacing, radius, and type scale — no colors — so they never fight a theming plugin.",
	"layout.preview": "Drag a slider to preview live.",
	"knob.fontScale": "Type scale",
	"knob.fontScale.hint": "Scales conversation text up or down. Display only.",
	"knob.density": "Density",
	"knob.density.hint": "Left is tighter, right is roomier — drives line height and padding.",
	"knob.radius": "Corner radius",
	"knob.radius.hint": "0 is square; larger is rounder.",
	"knob.contentWidth": "Content width cap",
	"knob.contentWidth.hint": "Caps the message body width for comfortable long-form reading.",
	"knob.bubbleRadius": "Bubble radius",
	"knob.bubbleRadius.hint": "Affects the user message bubble only.",
	"layout.resetAll": "Reset all to defaults",
	"presets.title": "Preset packs",
	"presets.hint": "Apply a ready-made configuration in one click. You can keep editing afterwards; your hand-written CSS is never touched.",
	"presets.apply": "Apply",
	"presets.applied": "In use",
	"presets.export": "Export current configuration",
	"presets.exportHint": "Download every current setting as a JSON file to back up or share.",
	"presets.import": "Import configuration",
	"presets.importHint": "Accepts this plugin's exported JSON, or any object with css / vars / knobs fields.",
	"presets.importFile": "Choose file",
	"presets.importPaste": "or paste JSON",
	"presets.importApply": "Import and replace",
	"presets.importConfirm": "Importing replaces all current custom styles. Continue?",
	"presets.imported": "Imported",
	"presets.danger": "Danger zone",
	"presets.resetAll": "Clear every custom style",
	"presets.resetAllConfirm": "This deletes the global CSS, every picked rule, all variable overrides, and the slider settings. It cannot be undone. Continue?",
	"presets.resetDone": "Cleared",
	"preset.compact.name": "Compact",
	"preset.compact.description": "Tighter line height and padding — more content per screen.",
	"preset.relaxed.name": "Relaxed",
	"preset.relaxed.description": "More whitespace and larger type for long reading sessions.",
	"preset.square.name": "Square",
	"preset.square.description": "Removes every rounded corner for a harder edge.",
	"preset.round.name": "Rounded",
	"preset.round.description": "Larger radii and softer bubbles.",
	"preset.warmPaper.name": "Warm paper",
	"preset.warmPaper.description": "Cream ground with deep brown text — kind to long daytime reading.",
	"preset.deepOcean.name": "Deep ocean",
	"preset.deepOcean.description": "Cool blue ground with a cyan accent.",
	"preset.mono.name": "Monochrome",
	"preset.mono.description": "Fully desaturated, focused and restrained."
};

// ── plugin body ─────────────────────────────────────────────────────────────
// Everything below runs inside the factory and has access to the seeds resolved
// by the preamble (`requireSeed`, `h`, `TOKENS`, `useStoreValue`, …).

/**
 * Required client services. The plugin owns a settings page (`slots`), its copy
 * (`locale`), and a stylesheet of its own — nothing else. In particular it does
 * NOT depend on `theme`: token overrides are written into the plugin's own CSS
 * layer, so they compose with whatever theme (built-in or third-party) is
 * active instead of competing for the theme registry.
 */
const inject = ["slots", "locale"];

/**
 * Mount the plugin's layers and register the settings UI.
 * @param ctx - client cordis context (`slots`, `locale`).
 */
function apply(ctx) {
	const store = createConfigStore();
	/**
	 * The single injected stylesheet. It is mounted at the END of `<head>`, so
	 * our `body`-specificity declarations win against the shipped sheets of
	 * equal specificity by source order alone.
	 */
	let styleTag = null;
	/**
	 * The host node for the floating picker bar. Picking hides the settings modal,
	 * so the bar's affordance cannot live inside it.
	 */
	let pickerBarHost = null;
	let applyTimer = null;
	let pushTimer = null;
	/** Debounced history of custom-CSS text, for the editor's Undo button. */
	let pushGeneration = 0;

	/** Ensure our stylesheet element exists and is last in `<head>`. */
	const ensureStyleTag = () => {
		if (typeof document === "undefined") return null;
		if (styleTag !== null && styleTag.isConnected) {
			// Another plugin (or a late-loading sheet) may have appended after us;
			// keep ours last so source order stays in our favour.
			if (styleTag !== document.head.lastElementChild) document.head.appendChild(styleTag);
			return styleTag;
		}
		styleTag = document.createElement("style");
		styleTag.dataset.plugin = PLUGIN_ID;
		styleTag.dataset.pluginCss = `${PLUGIN_ID}/overrides.css`;
		document.head.appendChild(styleTag);
		return styleTag;
	};

	/** Rebuild and install the stylesheet from the current state. */
	const applyStyles = () => {
		const tag = ensureStyleTag();
		if (tag === null) return;
		tag.textContent = composeCss(store.get());
	};

	/** Coalesce rapid state changes (a dragging slider) into one rebuild. */
	const scheduleApply = () => {
		if (applyTimer !== null) return;
		applyTimer = setTimeout(() => {
			applyTimer = null;
			applyStyles();
		}, APPLY_DEBOUNCE_MS);
	};

	/**
	 * Mirror the state locally (instant, survives a reload on the same origin)
	 * and queue a debounced push to the durable host file.
	 */
	const persist = () => {
		const snapshot = store.get();
		try {
			globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(encodeState(snapshot)));
		} catch {
			// Private-mode or quota-exceeded: the host file is the real store.
		}
		if (pushTimer !== null) clearTimeout(pushTimer);
		const generation = ++pushGeneration;
		pushTimer = setTimeout(() => {
			pushTimer = null;
			if (generation !== pushGeneration) return;
			void pushToHost(encodeState(snapshot));
		}, PUSH_DEBOUNCE_MS);
	};

	/** Commit a state change: publish, re-render CSS, persist. */
	const commit = (mutator) => {
		if (typeof mutator === "function") store.mutate(mutator);
		scheduleApply();
		persist();
	};

	/** Restore the localStorage seed so the very first paint is already styled. */
	const seedFromCache = () => {
		try {
			const raw = globalThis.localStorage?.getItem(CACHE_KEY);
			if (typeof raw !== "string" || raw === "") return;
			const parsed = JSON.parse(raw);
			store.replace(decodeWire(parsed));
		} catch {
			// A corrupt cache is not worth a warning; the host read will fix it.
		}
	};

	// ── host transport ──────────────────────────────────────────────────────

	/** POST one method to the plugin's fenced persistence route. */
	async function callHost(body) {
		const response = await fetch(API_PATH, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body)
		});
		if (!response.ok) throw new Error(`host responded ${response.status}`);
		const payload = await response.json();
		if (payload === null || typeof payload !== "object" || payload.ok !== true) {
			throw new Error("host refused the request");
		}
		return payload;
	}

	/** Push the flat wire record. Failures are non-fatal: the cache still holds it. */
	async function pushToHost(wire) {
		try {
			await callHost({ method: "set", patch: wire });
		} catch (error) {
			console.warn(`[${PLUGIN_ID}] could not save to the host state file:`, error?.message ?? error);
		}
	}

	/**
	 * Adopt the durable state for the first time. The host file wins over the
	 * localStorage seed, but only when it actually carries something: a fresh
	 * install (empty file) must not wipe a cache written seconds ago by a
	 * previous origin.
	 */
	async function hydrateFromHost() {
		let payload;
		try {
			payload = await callHost({ method: "get" });
		} catch (error) {
			console.warn(`[${PLUGIN_ID}] durable state unavailable, using the local cache:`, error?.message ?? error);
			return;
		}
		const record = payload.value;
		if (record === null || typeof record !== "object" || Object.keys(record).length === 0) return;
		store.replace(decodeWire(record));
		scheduleApply();
		// Re-mirror the adopted state so the next cold boot paints correctly even
		// if the host is slow to answer.
		try {
			globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(encodeState(store.get())));
		} catch {
			// ignored — see persist()
		}
	}

	// ── element picker engine ───────────────────────────────────────────────

	/**
	 * The picker is a document-level, capture-phase interaction mode. It is
	 * deliberately implemented outside React: the highlight must follow the
	 * pointer across the whole page (including portals and dialogs), and a
	 * React-rendered overlay would have to fight the app for stacking context.
	 */
	const picker = {
		active: false,
		/** The element currently under the pointer, highlighted. */
		hovered: null,
		/** Set while the capture overlay is installed. */
		teardown: null,
		/** Called with the picked element; the React panel supplies it. */
		onPick: null,
		/** Called with the hovered element so the panel can show a live preview. */
		onHover: null,
		/** Called when the user clicks inside the settings modal (which picking refuses). */
		onRefused: null,
		/** Called once picking has ended, whatever ended it. */
		onStop: null,
		oneShot: true,
		/** Overlay colour; exposed in the panel. */
		color: "#4d93f8"
	};

	/** The overlay element drawn over the hovered target. */
	let outline = null;

	/** Position the highlight box over one element. */
	const drawOutline = (element) => {
		if (outline === null) return;
		if (element === null) {
			outline.style.display = "none";
			return;
		}
		const rect = element.getBoundingClientRect();
		outline.style.display = "block";
		outline.style.left = `${rect.left}px`;
		outline.style.top = `${rect.top}px`;
		outline.style.width = `${rect.width}px`;
		outline.style.height = `${rect.height}px`;
		outline.style.borderColor = picker.color;
	};

	/** Whether an element belongs to this plugin's own surfaces. */
	const isOwnUi = (element) => {
		let current = element;
		while (current !== null && current !== undefined) {
			if (current.dataset?.plugin === PLUGIN_ID) return true;
			if (current.getAttribute?.("data-dcs-ui") === "1") return true;
			current = current.parentElement;
		}
		return false;
	};

	/**
	 * Whether an element lives inside the settings modal we hid.
	 *
	 * Picking hides the modal, so nothing in it should be reachable — but the
	 * user can also close the modal mid-pick (or a close path can restore it), and
	 * silently authoring a rule against the settings panel's own chrome would be
	 * a confusing result. Refusing it with an explanation is honest.
	 */
	const isInsideHiddenModal = (element) => {
		let current = element;
		while (current !== null && current !== undefined) {
			if (current.dataset?.dcsHidden === "1") return true;
			current = current.parentElement;
		}
		return false;
	};

	/** Install the document-level capture listeners and the highlight box. */
	const startPicking = (origin) => {
		if (typeof document === "undefined" || picker.active) return;
		// Hide the settings modal first: it covers the whole viewport, so every
		// element behind its mask is otherwise unreachable.
		hideModal(origin ?? null);
		picker.active = true;

		outline = document.createElement("div");
		outline.dataset.plugin = PLUGIN_ID;
		outline.dataset.dcsUi = "1";
		// A dedicated marker so the highlight box is distinguishable from the
		// plugin's other body-level surfaces (the floating picker bar's host).
		outline.dataset.dcsOutline = "1";
		outline.setAttribute("aria-hidden", "true");
		outline.style.cssText = [
			"position:fixed",
			"z-index:2147483646",
			"pointer-events:none",
			"display:none",
			"border:2px solid #4d93f8",
			"border-radius:3px",
			"background:rgba(77,147,248,.14)",
			"box-shadow:0 0 0 1px rgba(0,0,0,.25)",
			"transition:left .04s linear, top .04s linear, width .04s linear, height .04s linear"
		].join(";");
		document.body.appendChild(outline);

		const onMove = (event) => {
			const target = event.target;
			if (target === null || target === undefined || target.nodeType !== 1) return;
			if (isOwnUi(target) || isInsideHiddenModal(target) || target === outline) {
				picker.hovered = null;
				drawOutline(null);
				return;
			}
			picker.hovered = target;
			drawOutline(target);
			picker.onHover?.(target);
		};

		const onClick = (event) => {
			const target = event.target;
			if (target === null || target === undefined || target.nodeType !== 1) return;
			if (isOwnUi(target) || target === outline) return;
			// Refuse the modal's own interior rather than hiding it and then
			// authoring a rule against chrome the user cannot see.
			if (isInsideHiddenModal(target)) {
				picker.onRefused?.();
				return;
			}
			// Capture phase + preventDefault: the app must not also react to the
			// click the user aimed at the picker.
			event.preventDefault();
			event.stopPropagation();
			const picked = target;
			// Hand the element over FIRST: the panel records its draft, and only
			// then does one-shot mode end picking (which brings the modal back
			// with the draft already in place, so there is no empty-panel flash).
			picker.onPick?.(picked);
			if (picker.oneShot) stopPicking();
		};

		const onKeyDown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				stopPicking();
			}
		};

		const onScroll = () => {
			if (picker.hovered !== null && picker.hovered.isConnected) drawOutline(picker.hovered);
		};

		const options = { capture: true, passive: false };
		document.addEventListener("mousemove", onMove, { capture: true, passive: true });
		document.addEventListener("click", onClick, options);
		document.addEventListener("mousedown", onClick, options);
		document.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("scroll", onScroll, { capture: true, passive: true });
		window.addEventListener("resize", onScroll, { passive: true });

		picker.teardown = () => {
			document.removeEventListener("mousemove", onMove, true);
			document.removeEventListener("click", onClick, true);
			document.removeEventListener("mousedown", onClick, true);
			document.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onScroll);
			outline?.remove();
			outline = null;
		};
	};

	/**
	 * Leave picking mode: remove the listeners and highlight box, and bring the
	 * settings modal back.
	 *
	 * The modal is restored AFTER the teardown so the page is already free of
	 * picker chrome by the time the panel reappears, and the picker's own
	 * callbacks fire first so the panel can publish a newly picked draft before
	 * it renders again.
	 */
	const stopPicking = () => {
		if (!picker.active) return;
		picker.active = false;
		picker.hovered = null;
		const teardown = picker.teardown;
		picker.teardown = null;
		teardown?.();
		// The panel subscribes through this callback so its "picking" flag resets.
		picker.onHover?.(null);
		picker.onStop?.();
		showModal();
	};

	// ── registering the settings surface ────────────────────────────────────

	try {
		ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), `${PLUGIN_ID}: settings dictionaries`);
	} catch (error) {
		console.warn(`[${PLUGIN_ID}] could not register dictionaries:`, error?.message ?? error);
	}

	// Publish the live instances the panel components read. This happens BEFORE
	// registration so a section that mounts synchronously on register already
	// finds a populated store.
	panelApi.store = store;
	panelApi.commit = (mutator) => {
		if (typeof mutator === "function") store.mutate(mutator);
		scheduleApply();
		persist();
	};
	panelApi.host = {
		push: (wire) => pushToHost(wire),
		get: () => callHost({ method: "get" }),
		reset: () => callHost({ method: "reset" })
	};
	panelApi.picker = picker;
	panelApi.startPicking = startPicking;
	panelApi.stopPicking = stopPicking;
	ctx.effect(() => () => {
		// Teardown must not leave a half-wired panel behind for a later remount.
		panelApi.store = null;
		panelApi.picker = null;
		panelApi.startPicking = () => {};
		panelApi.stopPicking = () => {};
		panelApi.barHost = null;
	}, `${PLUGIN_ID}: panel bindings`);

	// First paint from the local cache, before anything is read from the network.
	// This runs BEFORE the settings section is registered: the section subscribes
	// to this very store, and a section that mounted on register would otherwise
	// render the factory defaults and then flash the saved configuration one
	// frame later.
	seedFromCache();
	applyStyles();

	// The panel is one `settings.section` seat that owns its whole content column
	// and its own internal tab strip — one nav entry, one registration, one
	// shared store. `order: 30` places it after the shipped Appearance/General
	// seats without colliding with them.
	//
	// `label` is a THUNK, which the shell re-reads on every projection: a section
	// registration is not re-evaluated on a locale switch, so a literal string
	// would freeze the nav row in whichever language was active at mount.
	const localeT = typeof ctx.locale?.bind === "function" ? ctx.locale.bind(SETTINGS_NS) : (key) => key;
	try {
		ctx.slots.inject("settings.section", () => ctx.slots.register({
			name: "settings.section",
			id: PLUGIN_ID,
			order: 30,
			label: () => localeT("nav.label"),
			locale: SETTINGS_NS
		}, Section));
	} catch (error) {
		console.warn(`[${PLUGIN_ID}] could not register the settings section:`, error?.message ?? error);
		return;
	}

	// ── lifecycle ───────────────────────────────────────────────────────────

	/**
	 * A host node for the floating picker bar.
	 *
	 * Picking HIDES the settings modal, which is where the plugin's whole panel
	 * lives — so the "you are picking, press Esc to stop" affordance has to be
	 * mounted outside that modal. This node is that home: created here rather than
	 * rendered by React so it exists regardless of where the shell mounts the
	 * settings dialog, and so the plugin can tear it down with everything else.
	 */
	if (typeof document !== "undefined") {
		pickerBarHost = document.createElement("div");
		pickerBarHost.dataset.plugin = PLUGIN_ID;
		pickerBarHost.dataset.dcsUi = "1";
		document.body.appendChild(pickerBarHost);
		panelApi.barHost = pickerBarHost;
	}

	ctx.effect(() => () => {
		if (applyTimer !== null) clearTimeout(applyTimer);
		if (pushTimer !== null) clearTimeout(pushTimer);
		stopPicking();
		// Belt and braces: if the modal was somehow still hidden, put it back —
		// a plugin that unmounts must never leave the settings panel invisible.
		showModal();
		styleTag?.remove();
		styleTag = null;
		pickerBarHost?.remove();
		pickerBarHost = null;
		panelApi.barHost = null;
	}, `${PLUGIN_ID}: stylesheet, overlay, and timers`);

	// Flush a pending write when the page goes away, so a change made in the last
	// debounce window is not lost on close.
	const flush = () => {
		if (pushTimer === null) return;
		clearTimeout(pushTimer);
		pushTimer = null;
		const wire = encodeState(store.get());
		try {
			// sendBeacon is the only transport that reliably survives unload and
			// is not subject to the fenced route's CORS preflight.
			const body = new Blob([JSON.stringify({ method: "set", patch: wire })], { type: "application/json" });
			globalThis.navigator?.sendBeacon?.(API_PATH, body);
		} catch {
			void pushToHost(wire);
		}
	};
	globalThis.addEventListener?.("pagehide", flush);
	ctx.effect(() => () => globalThis.removeEventListener?.("pagehide", flush), `${PLUGIN_ID}: unload flush`);

	void hydrateFromHost();
}

/**
 * Resolve the element the picker selected into an editable draft: its selector,
 * its computed values for the properties the picker authors, and the label
 * shown in the rule list.
 */
function resolveElement(element) {
	const tag = element.tagName.toLowerCase();
	const selector = buildSelector(element);
	const computed = readComputed(element, PROPERTY_SPECS.map((spec) => spec.name));
	// A short human label: the element's own text, trimmed.
	const text = (element.textContent ?? "").trim().replace(/\s+/g, " ");
	const label = text !== "" ? `${tag} · ${text.slice(0, 28)}` : tag;
	return { tag, selector, computed, label };
}
