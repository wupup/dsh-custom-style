/**
 * Behavior suite for `dsh-custom-style`.
 *
 * Every assertion runs against the BUILT bundle (`lib/client.js`) loaded through
 * the same `window.__ModuleLoader__.load({ id, factory })` contract the DSH web
 * shell uses, so a passing suite means the artifact users install actually
 * behaves this way — not that the sources would if they were assembled
 * differently.
 *
 * Run: npm test
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { loadBundle, createContext, BUNDLE_PATH } from "./harness.mjs";

/** The plugin's exports plus its pure surface, loaded once for the whole run. */
let api = null;
let bundleExports = null;
let loaded = null;

before(async () => {
	loaded = await loadBundle();
	bundleExports = loaded.exports;
	api = loaded.exports.testHandle;
	assert.ok(api !== undefined, "the built bundle must publish the test handle");
});

/**
 * Deep-compare a value produced inside the VM sandbox against a host literal.
 *
 * `assert.deepEqual` checks prototype identity, and an array literal evaluated
 * inside the sandbox carries that realm's `Array.prototype` — so a structurally
 * identical value is reported as "same structure but not reference-equal". That
 * is a fact about the test harness, not about the plugin. Round-tripping through
 * JSON compares exactly what crosses the wire and nothing else.
 */
function sameValue(actual, expected, message) {
	assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message);
}

/**
 * Render a component tree into a flat element list.
 *
 * Function components are invoked (with the harness's hook stub reset around
 * each call) and their output inlined, so an assertion can walk from the
 * section down to the switches and tabs it actually renders. `depth` bounds the
 * walk: the panel's tree is a handful of levels deep, and a cycle would be a bug
 * worth failing loudly on rather than hanging.
 */
function renderTree(node, depth = 0) {
	assert.ok(depth < 30, "the component tree should not be this deep");
	if (node === null || node === undefined || typeof node === "boolean") return [];
	if (Array.isArray(node)) return node.flatMap((child) => renderTree(child, depth + 1));
	if (typeof node === "string" || typeof node === "number") return [];
	if (typeof node.type === "function") {
		const rendered = loaded.react.render(() => node.type(node.props ?? {}));
		return renderTree(rendered, depth + 1);
	}
	const own = { type: node.type, props: node.props };
	const children = node.children !== undefined ? node.children : node.props?.children;
	return [own, ...renderTree(children, depth + 1)];
}

// ── module contract ─────────────────────────────────────────────────────────

describe("bundle contract", () => {
	test("registers exactly one factory under the plugin id", async () => {
		const { entry, exports } = await loadBundle();
		assert.equal(entry.id, "dsh-custom-style");
		assert.equal(typeof entry.factory, "function");
		assert.equal(typeof exports.apply, "function");
	});

	test("declares only the services it actually uses", () => {
		sameValue(bundleExports.inject, ["slots", "locale"]);
	});

	test("publishes a runnable, non-trivial bundle", async () => {
		const { readFileSync, statSync } = await import("node:fs");
		const source = readFileSync(BUNDLE_PATH, "utf8");
		assert.ok(statSync(BUNDLE_PATH).size > 20_000, "the bundle should not be a stub");
		assert.ok(source.startsWith("//"), "the generated file should carry its provenance header");
		assert.match(source, /window\.__ModuleLoader__\.load\(/);
		// The generated catalog must have been substituted, not left as a stub.
		assert.doesNotMatch(source, /@__TOKEN_CATALOG__/);
		assert.doesNotMatch(source, /@__TEST_HANDLE__/);
	});

	test("contains no ES module syntax the Loader cannot evaluate", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(BUNDLE_PATH, "utf8");
		assert.doesNotMatch(source, /^\s*import\s/m, "no import statements in the factory body");
		assert.doesNotMatch(source, /^\s*export\s/m, "no export statements in the factory body");
	});
});

// ── apply(): registration and lifecycle ─────────────────────────────────────

describe("apply", () => {
	test("registers one settings section and both locale dictionaries", () => {
		const context = createContext();
		bundleExports.apply(context.ctx);

		const registrations = context.slots.filter((entry) => entry.kind === "register");
		assert.equal(registrations.length, 1, "exactly one section registration");
		assert.equal(registrations[0].name, "settings.section");
		assert.equal(registrations[0].options.id, "dsh-custom-style");
		assert.equal(registrations[0].options.locale, "settings.customStyle");
		assert.equal(typeof registrations[0].Component, "function");

		assert.equal(context.locales.length, 1);
		assert.equal(context.locales[0].namespace, "settings.customStyle");
	});

	test("ships complete zh and en dictionaries with matching key sets", () => {
		const context = createContext();
		bundleExports.apply(context.ctx);
		const { zh, en } = context.locales[0].dictionaries;

		const zhKeys = Object.keys(zh).sort();
		const enKeys = Object.keys(en).sort();
		assert.equal(zhKeys.length, enKeys.length);
		assert.deepEqual(zhKeys, enKeys, "the two dictionaries must stay key-for-key aligned");
		assert.ok(zhKeys.length > 100, "a full panel needs real copy, not placeholders");
		// A key present in the section header and tab strip must resolve, or the
		// panel renders raw keys to the user.
		for (const key of ["section.title", "tab.css", "tab.picker", "tab.vars", "tab.layout", "tab.presets"]) {
			assert.ok(zh[key] !== undefined, `zh is missing ${key}`);
			assert.ok(en[key] !== undefined, `en is missing ${key}`);
		}
	});

	test("every preset and knob a component names has copy in both locales", () => {
		const context = createContext();
		bundleExports.apply(context.ctx);
		const { zh, en } = context.locales[0].dictionaries;

		for (const spec of api.KNOB_SPECS) {
			for (const key of [spec.label, spec.hint]) {
				assert.ok(zh[key] !== undefined, `zh is missing knob copy ${key}`);
				assert.ok(en[key] !== undefined, `en is missing knob copy ${key}`);
			}
		}
		for (const preset of api.PRESETS) {
			for (const key of [preset.name, preset.description]) {
				assert.ok(zh[key] !== undefined, `zh is missing preset copy ${key}`);
				assert.ok(en[key] !== undefined, `en is missing preset copy ${key}`);
			}
		}
		for (const spec of api.PROPERTY_SPECS) {
			assert.ok(zh[spec.label] !== undefined, `zh is missing property copy ${spec.label}`);
			assert.ok(en[spec.label] !== undefined, `en is missing property copy ${spec.label}`);
		}
	});

	test("installs a live store and commits through every tab path", () => {
		const context = createContext();
		bundleExports.apply(context.ctx);
		const { panel } = api;
		assert.ok(panel.store !== null, "the section needs a store before it renders");

		const before = panel.store.get();
		panel.commit((draft) => {
			draft.css = "body { color: red; }";
		});
		assert.equal(panel.store.get().css, "body { color: red; }");
		assert.notEqual(panel.store.get(), before, "the snapshot identity must change");
	});

	test("survives a host with no DOM and no network", () => {
		// `loadBundle` deliberately provides neither `document` nor `fetch`; the
		// module system materializes bundles before the shell mounts, and a throw
		// here would take the whole web shell down.
		assert.doesNotThrow(() => {
			const context = createContext();
			bundleExports.apply(context.ctx);
		});
	});

	test("teardown clears the panel bindings so a remount cannot use a dead store", () => {
		const context = createContext();
		bundleExports.apply(context.ctx);
		assert.ok(api.panel.store !== null);
		for (const effect of context.effects) {
			if (typeof effect.disposer === "function") effect.disposer();
		}
		assert.equal(api.panel.store, null);
		assert.equal(api.panel.picker, null);
	});
});

// ── the settings section renders ────────────────────────────────────────────

describe("settings section", () => {
	/**
	 * Install the plugin and render the section with the REAL English
	 * dictionary, so an assertion on visible copy also proves the component
	 * resolves its keys instead of leaking raw ones to the user.
	 */
	const render = () => {
		const context = createContext();
		bundleExports.apply(context.ctx);
		const registration = context.slots.find((entry) => entry.kind === "register");
		const english = context.locales[0].dictionaries.en;
		const tree = registration.Component({ t: (key) => english[key] ?? key });
		return { context, registration, tree };
	};

	test("renders a header, the master switch, and all five tabs", () => {
		const { tree } = render();
		assert.ok(tree !== null && tree !== undefined, "the section must render");

		const elements = renderTree(tree);

		const switches = elements.filter((element) => element.props?.role === "switch");
		assert.equal(switches.length, 1, "one master switch");
		assert.equal(switches[0].props["aria-checked"], true, "custom styles start enabled");

		const tabs = elements.filter((element) => element.props?.role === "tab");
		assert.equal(tabs.length, 5, "five tabs");
		assert.deepEqual(
			tabs.map((tab) => tab.props["aria-selected"]),
			[true, false, false, false, false],
			"the CSS tab is active first"
		);
		// Each tab must render real copy, never a raw locale key.
		for (const tab of tabs) {
			const text = JSON.stringify(tab.children ?? tab.props?.children ?? "");
			assert.match(text, /"(Global CSS|Element picker|Tokens|Density|Presets)"/);
		}
	});

	test("renders the active tab's content, not the other four", () => {
		const { tree } = render();
		const elements = renderTree(tree);
		// The CSS tab owns a textarea; the picker tab owns a "start picking"
		// button. Only the active tab may be mounted.
		const textareas = elements.filter((element) => element.type === "textarea");
		assert.equal(textareas.length, 1, "the CSS tab is the only mounted tab");
		assert.equal(textareas[0].props["aria-label"], "Global custom CSS", "resolved, not a raw locale key");
		const rendered = JSON.stringify(elements.map((element) => element.props?.children ?? ""));
		assert.doesNotMatch(rendered, /picker\.start/, "inactive tabs must not render");
	});

	test("renders the marker the element picker uses to ignore its own UI", () => {
		const { tree } = render();
		assert.equal(tree.props["data-dcs-ui"], "1");
	});
});

// ── state schema: normalization is the trust boundary ───────────────────────

describe("normalizeState", () => {
	test("returns factory defaults for garbage input", () => {
		const defaults = JSON.parse(JSON.stringify(api.defaultState()));
		for (const garbage of [null, undefined, 42, "nope", [], true]) {
			sameValue(api.normalizeState(garbage), defaults, `failed for ${JSON.stringify(garbage)}`);
		}
	});

	test("drops rules without a usable selector", () => {
		const state = api.normalizeState({
			rules: [
				null,
				"not an object",
				{ selector: "", declarations: [{ property: "color", value: "red" }] },
				{ declarations: [{ property: "color", value: "red" }] },
				{ selector: "body", declarations: [{ property: "color", value: "red" }] }
			]
		});
		assert.equal(state.rules.length, 1);
		assert.equal(state.rules[0].selector, "body");
		assert.ok(typeof state.rules[0].id === "string" && state.rules[0].id.length > 0, "a rule always gets an id");
	});

	test("drops declarations that are not property/value string pairs", () => {
		const state = api.normalizeState({
			rules: [{
				selector: ".x",
				declarations: [
					null,
					{ property: "color" },
					{ value: "red" },
					{ property: 5, value: "red" },
					{ property: "color", value: 5 },
					{ property: "color", value: "red" }
				]
			}]
		});
		sameValue(state.rules[0].declarations, [{ property: "color", value: "red", important: true }]);
	});

	test("rejects malformed custom-property names and keeps only real overrides", () => {
		const state = api.normalizeState({
			vars: [
				null,
				{ name: "not-a-variable", light: "#fff" },
				{ name: "--ok", light: "#fff" },
				{ name: "--blank", light: "   " },
				{ name: "--only-dark", dark: "#000" }
			]
		});
		sameValue(state.vars.map((entry) => entry.name), ["--ok", "--only-dark"]);
	});

	test("clamps knob values instead of accepting out-of-range input", () => {
		const state = api.normalizeState({
			knobs: { radius: 999, density: -5, fontScale: "not a number", contentWidth: 200 }
		});
		const radius = api.KNOB_SPECS.find((spec) => spec.key === "radius");
		const density = api.KNOB_SPECS.find((spec) => spec.key === "density");
		const width = api.KNOB_SPECS.find((spec) => spec.key === "contentWidth");
		assert.equal(state.knobs.radius, radius.max);
		assert.equal(state.knobs.density, density.min);
		assert.equal(state.knobs.fontScale, api.DEFAULT_KNOBS.fontScale, "unparsable values fall back");
		assert.equal(state.knobs.contentWidth, width.min);
	});

	test("only accepts a preset id that actually exists", () => {
		assert.equal(api.normalizeState({ preset: "compact" }).preset, "compact");
		assert.equal(api.normalizeState({ preset: "no-such-preset" }).preset, "");
	});

	test("treats any value other than an explicit false as enabled", () => {
		assert.equal(api.normalizeState({}).enabled, true);
		assert.equal(api.normalizeState({ enabled: "no" }).enabled, true);
		assert.equal(api.normalizeState({ enabled: false }).enabled, false);
	});
});

// ── wire encoding round-trips through the host file ─────────────────────────

describe("wire encoding", () => {
	test("round-trips a fully populated state", () => {
		const original = {
			enabled: false,
			css: "body { /* ünïcode ✓ */ color: red; }",
			rules: [{ id: "r1", selector: "body .x", label: "x", declarations: [{ property: "color", value: "red", important: true }] }],
			vars: [{ name: "--dsw-alias-bg-base", light: "#fff", dark: "#000" }],
			knobs: { density: 0.8, radius: 3 },
			preset: "compact"
		};
		const wire = api.encodeState(api.normalizeState(original));
		for (const value of Object.values(wire)) {
			assert.equal(typeof value, "string", "every wire value must be a string for the host's narrow merge");
		}
		const restored = api.decodeWire(wire);
		assert.equal(restored.enabled, false);
		assert.equal(restored.css, original.css);
		sameValue(restored.rules.map((rule) => rule.selector), ["body .x"]);
		sameValue(restored.vars, original.vars);
		assert.equal(restored.knobs.density, 0.8);
		assert.equal(restored.knobs.radius, 3);
		assert.equal(restored.preset, "compact");
	});

	test("treats an empty host record as 'nothing stored yet'", () => {
		assert.equal(api.decodeWire({}), null, "a fresh install must not overwrite the local cache");
		assert.equal(api.decodeWire(null), null);
		assert.equal(api.decodeWire("nope"), null);
	});

	test("survives a hand-edited or truncated state file", () => {
		const restored = api.decodeWire({
			[api.WIRE_KEYS.enabled]: "1",
			[api.WIRE_KEYS.css]: "body{}",
			[api.WIRE_KEYS.rules]: "{ this is not json",
			[api.WIRE_KEYS.vars]: "null",
			[api.WIRE_KEYS.knobs]: "\"a string\""
		});
		assert.ok(restored !== null);
		sameValue(restored.rules, []);
		sameValue(restored.vars, []);
		assert.equal(Object.keys(restored.knobs).length, api.KNOB_SPECS.length);
		assert.equal(restored.knobs.density, api.DEFAULT_KNOBS.density);
		assert.equal(restored.css, "body{}");
	});
});

// ── CSS composition ─────────────────────────────────────────────────────────

describe("composeCss", () => {
	test("emits nothing at all when the plugin is disabled", () => {
		const state = { ...api.defaultState(), enabled: false, css: "body{color:red}", vars: [{ name: "--x", light: "#fff", dark: "#000" }] };
		assert.equal(api.composeCss(state), "");
	});

	test("a default configuration is visually neutral", () => {
		const css = api.composeCss(api.defaultState());
		// The density layer is always present so the sliders have targets, but at
		// the neutral knob values every derived factor must be 1.
		assert.match(css, /--dcs-spread: 0\.000/);
		assert.doesNotMatch(css, /!important/, "an untouched install must not need to force anything");
	});

	test("lays out variable overrides per color scheme", () => {
		const css = api.composeCss({
			...api.defaultState(),
			vars: [{ name: "--dsw-alias-bg-base", light: "#111111", dark: "#222222" }]
		});
		assert.match(css, /body \{\s*--dsw-alias-bg-base: #111111 !important;/);
		assert.match(css, /body\[data-ds-dark-theme\] \{\s*--dsw-alias-bg-base: #222222 !important;/);
	});

	test("mirrors a one-sided override onto the other scheme so it stays legible", () => {
		const css = api.composeCss({
			...api.defaultState(),
			vars: [{ name: "--x", light: "#abcabc", dark: "" }]
		});
		const lightBlock = /body \{[^}]*--x: #abcabc !important;/.test(css);
		const darkBlock = /body\[data-ds-dark-theme\] \{[^}]*--x: #abcabc !important;/.test(css);
		assert.ok(lightBlock, "the stated value must apply in light");
		assert.ok(darkBlock, "the stated value must also apply in dark, not fall back to a shipped default");
	});

	test("turns authored rules into scoped, qualified declarations", () => {
		const css = api.composeCss({
			...api.defaultState(),
			rules: [{
				id: "r1",
				selector: "body .bubble",
				label: "bubble",
				declarations: [{ property: "border-radius", value: "18px", important: true }]
			}]
		});
		assert.match(css, /body \.bubble \{/);
		assert.match(css, /border-radius: 18px !important;/);
	});

	test("drops a rule whose declarations are all empty", () => {
		const css = api.composeCss({
			...api.defaultState(),
			rules: [{ id: "r1", selector: ".nothing", label: "n", declarations: [{ property: "color", value: "  " }] }]
		});
		assert.doesNotMatch(css, /\.nothing/);
	});

	test("appends the user's stylesheet verbatim and last", () => {
		const userCss = ".mine { outline: 1px solid lime; }";
		const css = api.composeCss({ ...api.defaultState(), css: userCss });
		assert.ok(css.trimEnd().endsWith(userCss), "the hand-written sheet must come last");
	});

	test("density knobs move the derived spacing in the right direction", () => {
		const tight = api.composeCss({ ...api.defaultState(), knobs: { ...api.DEFAULT_KNOBS, density: 0 } });
		const loose = api.composeCss({ ...api.defaultState(), knobs: { ...api.DEFAULT_KNOBS, density: 1 } });
		assert.match(tight, /--dcs-spread: -1\.000/);
		assert.match(loose, /--dcs-spread: 1\.000/);
		assert.notEqual(tight, loose);
		assert.match(tight, /--dsh-content-font-size: 14px/);
	});

	test("font scale reaches the content font-size token", () => {
		const css = api.composeCss({ ...api.defaultState(), knobs: { ...api.DEFAULT_KNOBS, fontScale: 1.2 } });
		assert.match(css, /--dsh-content-font-size: 16\.8px/);
	});

	test("never emits the user's CSS when disabled, even if it is malformed", () => {
		const state = { ...api.defaultState(), enabled: false, css: "this is { not css" };
		assert.equal(api.composeCss(state), "");
	});
});

// ── CSS value qualification ─────────────────────────────────────────────────

describe("qualify and units", () => {
	test("adds px to a bare length but never to 0 or a unit-carrying value", () => {
		assert.equal(api.qualify("padding", "12").value, "12px");
		assert.equal(api.qualify("padding", "12px").value, "12px");
		assert.equal(api.qualify("padding", "0").value, "0");
		assert.equal(api.qualify("padding", "1.5rem").value, "1.5rem");
		assert.equal(api.qualify("margin", "-4").value, "-4px");
		assert.equal(api.qualify("max-width", "50%").value, "50%");
		assert.equal(api.qualify("width", "calc(100% - 2em)").value, "calc(100% - 2em)");
		assert.equal(api.qualify("width", "auto").value, "auto");
	});

	test("never rewrites a non-length property", () => {
		assert.equal(api.qualify("font-weight", "600").value, "600");
		assert.equal(api.qualify("box-shadow", "0 1px 2px").value, "0 1px 2px");
	});

	test("marks declarations important by default", () => {
		assert.equal(api.qualify("color", "red").important, true);
		assert.equal(api.needsUnit("10"), true);
		assert.equal(api.needsUnit("10px"), false);
	});
});

// ── brace balancing (the editor's parse warning) ────────────────────────────

describe("cssBalance", () => {
	test("accepts balanced sheets, including nested and comment content", () => {
		for (const css of [
			"",
			"body { color: red; }",
			"a { b: c } @media (min-width: 1px) { d { e: f } }",
			"/* { unbalanced in a comment } */ body { color: red }",
			// A brace inside a quoted string is string content, not structure —
			// the common `content` case must not be reported as broken.
			"body::before { content: \"{\"; }",
			"body::before { content: '}'; }"
		]) {
			assert.equal(api.cssBalance(css), true, `should accept: ${css}`);
		}
	});

	test("rejects the mistakes a browser would silently swallow", () => {
		for (const css of [
			"body { color: red",
			"body } color: red",
			"body { a: b } }",
			"/* unterminated",
			// An unterminated string or comment swallows the rest of the sheet,
			// exactly as a stray brace does.
			"body::before { content: \"{ }",
			"body { content: 'unterminated }",
			"/* never closed\nbody { color: red }"
		]) {
			assert.equal(api.cssBalance(css), false, `should reject: ${JSON.stringify(css)}`);
		}
	});
});

// ── selector escaping ───────────────────────────────────────────────────────

describe("selector helpers", () => {
	test("escapes identifiers that would otherwise break the selector", () => {
		assert.equal(api.escapeIdent("plain-name"), "plain-name");
		assert.equal(api.escapeIdent("1st"), "\\1st");
		assert.equal(api.escapeIdent("has space"), "has\\ space");
		assert.equal(api.escapeIdent("a.b"), "a\\.b");
	});

	test("escapes attribute values for a double-quoted string", () => {
		assert.equal(api.escapeAttributeValue('a"b'), 'a\\"b');
		assert.equal(api.escapeAttributeValue("a\\b"), "a\\\\b");
		assert.equal(api.escapeAttributeValue("plain"), "plain");
	});

	test("recognizes generated class names but not authored ones", () => {
		for (const generated of ["_composer_1a2b3", "css-1x2y3z", "a1b2c3d4e5"]) {
			assert.equal(api.isHashedClass(generated), true, `${generated} should look generated`);
		}
		for (const authored of ["composer", "sidebar-nav-item", "markdown-body", "btn"]) {
			assert.equal(api.isHashedClass(authored), false, `${authored} should look authored`);
		}
	});
});

// ── color normalization ─────────────────────────────────────────────────────

describe("normalizeHex", () => {
	test("normalizes the forms a computed style returns", () => {
		assert.equal(api.normalizeHex("#AABBCC"), "#aabbcc");
		assert.equal(api.normalizeHex("#abc"), "#aabbcc");
		assert.equal(api.normalizeHex("rgb(1, 2, 3)"), "#010203");
		assert.equal(api.normalizeHex("rgba(255, 255, 255, 0.5)"), "#ffffff");
		assert.equal(api.normalizeHex("rgb(1 2 3)"), "#010203");
	});

	test("refuses to invent a color it cannot represent", () => {
		assert.equal(api.normalizeHex("rgba(0,0,0,0)"), "", "fully transparent has no hex");
		assert.equal(api.normalizeHex("transparent"), "");
		assert.equal(api.normalizeHex("linear-gradient(red, blue)"), "");
		assert.equal(api.normalizeHex("currentColor"), "");
		assert.equal(api.normalizeHex(""), "");
		assert.equal(api.normalizeHex(null), "");
	});
});

// ── presets ─────────────────────────────────────────────────────────────────

describe("presets", () => {
	test("every preset has a unique id and both labels", () => {
		const ids = api.PRESETS.map((preset) => preset.id);
		assert.equal(new Set(ids).size, ids.length, "preset ids must be unique");
		for (const preset of api.PRESETS) {
			assert.equal(typeof preset.name, "string");
			assert.equal(typeof preset.description, "string");
			assert.ok(preset.patch !== undefined);
		}
	});

	test("applying a preset keeps the user's own CSS and picked rules", () => {
		const state = {
			...api.defaultState(),
			css: ".mine{}",
			rules: [{ id: "r1", selector: ".x", label: "x", declarations: [{ property: "color", value: "red" }] }]
		};
		const next = api.applyPreset(state, "compact");
		assert.equal(next.css, ".mine{}", "a preset must not silently discard hand-written CSS");
		assert.equal(next.rules.length, 1);
		assert.equal(next.preset, "compact");
		assert.equal(next.knobs.density, 0.15);
	});

	test("a density preset leaves the user's token overrides alone", () => {
		const state = { ...api.defaultState(), vars: [{ name: "--mine", light: "#fff", dark: "#000" }] };
		const next = api.applyPreset(state, "square");
		sameValue(next.vars, state.vars);
	});

	test("a palette preset replaces the token list with its own coherent set", () => {
		const state = { ...api.defaultState(), vars: [{ name: "--mine", light: "#fff", dark: "#000" }] };
		const next = api.applyPreset(state, "mono");
		assert.ok(next.vars.length > 0);
		assert.ok(next.vars.every((entry) => entry.name !== "--mine"), "a palette preset is a whole look");
	});

	test("applying each shipped preset yields a valid, enabled state", () => {
		for (const preset of api.PRESETS) {
			const next = api.normalizeState(api.applyPreset(api.defaultState(), preset.id));
			assert.ok(next.enabled);
			assert.notEqual(api.composeCss(next), "", `${preset.id} should produce a stylesheet`);
		}
	});

	test("an unknown preset id is a no-op", () => {
		const state = api.defaultState();
		sameValue(api.applyPreset(state, "does-not-exist"), JSON.parse(JSON.stringify(state)));
	});

	test("preset patches only use keys the state schema knows", () => {
		const known = new Set(Object.keys(api.defaultState()));
		for (const preset of api.PRESETS) {
			for (const key of Object.keys(preset.patch)) {
				assert.ok(known.has(key), `${preset.id} patches unknown key ${key}`);
			}
		}
	});
});

// ── token catalog ───────────────────────────────────────────────────────────

describe("token catalog", () => {
	test("is generated, non-empty, and shaped correctly", async () => {
		const { readFileSync } = await import("node:fs");
		const catalog = JSON.parse(readFileSync(new URL("../lib/tokens.json", import.meta.url), "utf8"));
		assert.ok(Array.isArray(catalog.aliases));
		assert.ok(catalog.aliases.length > 100, "the shipped design system has well over a hundred tokens");
		for (const entry of catalog.aliases) {
			assert.match(entry.name, /^--dsw-/, "every catalog entry is a --dsw-* token");
			assert.equal(typeof entry.group, "string");
			assert.equal(typeof entry.light, "string");
			assert.equal(typeof entry.dark, "string");
		}
	});

	test("carries real shipped values, not placeholders", async () => {
		const { readFileSync } = await import("node:fs");
		const catalog = JSON.parse(readFileSync(new URL("../lib/tokens.json", import.meta.url), "utf8"));
		const withValues = catalog.aliases.filter((entry) => entry.light !== "" || entry.dark !== "");
		assert.ok(withValues.length > 100, "the extractor must recover actual declarations");
		const brand = catalog.aliases.find((entry) => entry.name === "--dsw-alias-brand-primary");
		assert.ok(brand !== undefined, "a core token must be present");
		assert.notEqual(brand.light, "");
		assert.notEqual(brand.dark, "");
	});

	test("the panel's shipped presets only name tokens the catalog knows", async () => {
		const { readFileSync } = await import("node:fs");
		const catalog = JSON.parse(readFileSync(new URL("../lib/tokens.json", import.meta.url), "utf8"));
		const known = new Set(catalog.aliases.map((entry) => entry.name));
		for (const preset of api.PRESETS) {
			for (const entry of preset.patch.vars ?? []) {
				assert.ok(known.has(entry.name), `${preset.id} overrides ${entry.name}, which is not a shipped token`);
			}
		}
	});
});

// ── helper ──────────────────────────────────────────────────────────────────

describe("fill", () => {
	test("interpolates named placeholders and leaves unknown ones intact", () => {
		assert.equal(api.fill("matches {n} elements", { n: 3 }), "matches 3 elements");
		assert.equal(api.fill("a {x} b {y}", { x: 1 }), "a 1 b {y}");
		assert.equal(api.fill("no placeholders", {}), "no placeholders");
	});
});
