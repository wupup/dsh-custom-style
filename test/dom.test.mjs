/**
 * Integration coverage for the parts a pure-logic suite cannot reach: the DOM
 * paths behind the injected stylesheet and the element picker.
 *
 * The sandbox that `loadBundle` builds has no DOM on purpose — ?the module system
 * materializes bundles before the shell mounts, and that path is covered in
 * `client.test.mjs`. Here a small DOM stub is installed so the picker and the
 * stylesheet lifecycle can be driven the way a real session drives them.
 *
 * The stub is deliberately minimal: it records what the plugin does rather than
 * trying to be a browser. Anything it cannot model (layout, computed cascade) is
 * stubbed with an obviously empty answer, so a test can never pass by accident
 * of a too-clever fake.
 */

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadBundle, createContext } from "./harness.mjs";

let loaded = null;
let bundleExports = null;
let api = null;

/** Every style tag and outline box the plugin mounted, newest last. */
let styleTags = [];
/** Every listener the plugin attached, for asserting teardown. */
let listeners = [];
/** The stub document root. */
let documentStub = null;

// ── DOM stub ────────────────────────────────────────────────────────────────

/** One element, with just the surface the plugin touches. */
class StubElement {
	constructor(tagName, ownerDocument) {
		this.tagName = String(tagName).toUpperCase();
		// The plugin's DOM guards check `nodeType === 1` before treating a value
		// as an element, so the stub must be honest about being one.
		this.nodeType = 1;
		this.ownerDocument = ownerDocument;
		this.children = [];
		this.parentElement = null;
		this.isConnected = true;
		this.textContent = "";
		this.attributes = new Map();
		this.dataset = {};
		this.classList = [];
		this.style = createStyleStub();
		/** Overridable per element by a test that needs a real class list. */
		this.className = "";
	}

	get lastElementChild() {
		return this.children.length === 0 ? null : this.children[this.children.length - 1];
	}

	appendChild(child) {
		child.parentElement = this;
		child.ownerDocument = this.ownerDocument;
		this.children.push(child);
		return child;
	}

	remove() {
		if (this.parentElement === null) return;
		const index = this.parentElement.children.indexOf(this);
		if (index >= 0) this.parentElement.children.splice(index, 1);
		this.parentElement = null;
		this.isConnected = false;
	}

	setAttribute(name, value) {
		this.attributes.set(name, String(value));
	}

	getAttribute(name) {
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}

	removeAttribute(name) {
		this.attributes.delete(name);
	}

	set cssText(value) {
		this._cssText = value;
	}

	get cssText() {
		return this._cssText ?? "";
	}

	getBoundingClientRect() {
		return { left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 };
	}

	querySelectorAll() {
		return [];
	}
}

/** A `style` object with the two access patterns the plugin uses. */
function createStyleStub() {
	const properties = new Map();
	return {
		setProperty(name, value) {
			properties.set(name, value);
		},
		getPropertyValue(name) {
			return properties.get(name) ?? "";
		},
		removeProperty(name) {
			properties.delete(name);
		},
		/** Named properties (`style.display = "none"`) land on the object. */
		cssText: ""
	};
}

/** Install a fresh DOM stub as the sandbox's `document`. */
function installDom(sandbox) {
	styleTags = [];
	listeners = [];

	const html = new StubElement("html", null);
	const head = new StubElement("head", null);
	const body = new StubElement("body", null);
	html.appendChild(head);
	html.appendChild(body);

	const document = {
		documentElement: html,
		head,
		body,
		activeElement: null,
		getElementById: () => null,
		createElement: (tagName) => {
			const element = new StubElement(tagName, document);
			if (String(tagName).toLowerCase() === "style") {
				// Track appendChild-driven mounting of style tags.
				const originalAppend = element.appendChild.bind(element);
				element.appendChild = (child) => originalAppend(child);
				styleTags.push(element);
			}
			return element;
		},
		querySelector: () => null,
		/**
		 * How many elements a selector matches, and which element the first of
		 * them is. The stub runs no selector engine: `buildSelector`'s uniqueness
		 * probe asks "does this match exactly my element?", and the honest answer
		 * has to include the element itself, so the test seeds it here.
		 *
		 * Defaults to ZERO matches, because the stub document contains no dialogs
		 * — ?a `[role="dialog"]` query must truthfully find none. Tests that
		 * exercise selector uniqueness set these explicitly.
		 */
		matchCount: 0,
		matchElement: null,
		querySelectorAll(selector) {
			const count = document.matchCount;
			if (count === 0) return [];
			const first = count === 1 && document.matchElement !== null
				? document.matchElement
				: new StubElement("div", document);
			return [first, ...Array.from({ length: count - 1 }, () => new StubElement("div", document))];
		},
		addEventListener: (type, handler, options) => {
			listeners.push({ target: "document", type, handler, capture: options === true || options?.capture === true });
		},
		removeEventListener: (type, handler) => {
			listeners = listeners.filter((entry) => !(entry.target === "document" && entry.type === type && entry.handler === handler));
		},
		execCommand: () => true
	};

	sandbox.document = document;
	sandbox.getComputedStyle = () => ({
		getPropertyValue: () => "",
		color: "rgb(1, 2, 3)"
	});
	sandbox.addEventListener = (type, handler, options) => {
		listeners.push({ target: "window", type, handler, capture: options === true || options?.capture === true });
	};
	sandbox.removeEventListener = (type, handler) => {
		listeners = listeners.filter((entry) => !(entry.target === "window" && entry.type === type && entry.handler === handler));
	};
	sandbox.localStorage = {
		store: new Map(),
		getItem(key) {
			return this.store.has(key) ? this.store.get(key) : null;
		},
		setItem(key, value) {
			this.store.set(key, String(value));
		},
		removeItem(key) {
			this.store.delete(key);
		}
	};
	sandbox.navigator = { clipboard: { writeText: async () => {} } };

	documentStub = document;
	return document;
}

/** The single style tag the plugin owns, or null. */
function pluginStyleTag() {
	return styleTags.find((tag) => tag.dataset?.plugin === "dsh-custom-style" && tag.isConnected) ?? null;
}

/** The picker's highlight box, or null when picking is not active. */
function outlineBox() {
	return documentStub.body.children.find((child) => child.dataset?.dcsOutline === "1") ?? null;
}

/** The plugin-owned host node the floating picker bar is portalled into. */
function pickerBarHost() {
	return documentStub.body.children.find((child) => child.dataset?.plugin === "dsh-custom-style" && child.dataset?.dcsOutline !== "1") ?? null;
}

/**
 * Wait for the stylesheet rebuild to land.
 *
 * Rebuilding is debounced (a slider drag must not recompose the sheet on every
 * frame), so an assertion on the tag's content has to let the pending timer run.
 * The wait is slightly longer than the plugin's own debounce.
 */
function settle() {
	return new Promise((resolve) => setTimeout(resolve, 90));
}

/** Find a captured listener by target and type. */
function listener(type, target = "document") {
	return listeners.find((entry) => entry.target === target && entry.type === type);
}

before(async () => {
	loaded = await loadBundle();
	bundleExports = loaded.exports;
	api = loaded.exports.testHandle;
});

beforeEach(() => {
	installDom(loaded.sandbox);
	documentStub.matchCount = 0;
	documentStub.matchElement = null;
});

/** Apply the plugin with the DOM stub in place and return the context. */
function applyWithDom() {
	const context = createContext();
	bundleExports.apply(context.ctx);
	return context;
}

/** Tear down every effect the plugin registered. */
function teardown(context) {
	for (const effect of context.effects) {
		if (typeof effect.disposer === "function") effect.disposer();
	}
}

// ── stylesheet lifecycle ────────────────────────────────────────────────────

describe("stylesheet lifecycle", () => {
	test("mounts exactly one owned style tag and keeps it last in head", () => {
		const context = applyWithDom();
		const tag = pluginStyleTag();
		assert.ok(tag !== null, "an owned style tag must be mounted");
		assert.equal(styleTags.filter((candidate) => candidate.isConnected).length, 1);
		assert.equal(documentStub.head.lastElementChild, tag, "ours must be last so source order favours it");

		teardown(context);
		assert.equal(pluginStyleTag(), null, "teardown must remove the injected sheet");
	});

	test("re-appends itself after something else appends to head", async () => {
		const context = applyWithDom();
		const tag = pluginStyleTag();
		// Simulate another plugin's late sheet landing after ours.
		const interloper = documentStub.createElement("style");
		documentStub.head.appendChild(interloper);
		assert.notEqual(documentStub.head.lastElementChild, tag);

		// Any state change re-asserts our position and refreshes the content.
		api.panel.commit((draft) => {
			draft.css = "body { color: red; }";
		});
		await settle();

		assert.equal(documentStub.head.lastElementChild, tag, "ours must be last again");
		assert.match(tag.textContent, /body \{ color: red; \}/);
		teardown(context);
	});

	test("writes the composed CSS into the tag", async () => {
		const context = applyWithDom();
		api.panel.commit((draft) => {
			draft.vars = [{ name: "--dsw-alias-bg-base", light: "#010203", dark: "#040506" }];
		});
		await settle();
		const tag = pluginStyleTag();
		assert.match(tag.textContent, /--dsw-alias-bg-base: #010203 !important/);
		assert.match(tag.textContent, /--dsw-alias-bg-base: #040506 !important/);
		teardown(context);
	});

	test("the master switch empties the sheet without discarding the data", async () => {
		const context = applyWithDom();
		api.panel.commit((draft) => {
			draft.css = "body { color: red; }";
		});
		await settle();
		assert.match(pluginStyleTag().textContent, /color: red/);

		api.panel.commit((draft) => {
			draft.enabled = false;
		});
		await settle();
		assert.equal(pluginStyleTag().textContent, "", "a disabled plugin injects nothing");
		assert.equal(api.panel.store.get().css, "body { color: red; }", "the work must survive");
		teardown(context);
	});
});

// ── the picker engine ───────────────────────────────────────────────────────

describe("element picker", () => {
	/** Build a detached element tree with a stable id and hashed classes. */
	const buildTarget = () => {
		const wrapper = documentStub.createElement("div");
		wrapper.setAttribute("id", "conversation-list");
		const bubble = documentStub.createElement("div");
		bubble.classList = ["_bubble_1a2b3", "user-bubble"];
		bubble.className = "_bubble_1a2b3 user-bubble";
		bubble.textContent = "  hello   world  ";
		wrapper.appendChild(bubble);
		return { wrapper, bubble };
	};

	test("starts and stops, installing then removing its document listeners", () => {
		const context = applyWithDom();
		assert.equal(listener("mousemove"), undefined);

		api.panel.startPicking();
		assert.ok(listener("mousemove") !== undefined, "hover tracking must be installed");
		assert.ok(listener("mousedown") !== undefined, "the capture click must be installed");
		assert.ok(listener("keydown") !== undefined, "Esc handling must be installed");

		api.panel.stopPicking();
		assert.equal(listener("mousemove"), undefined);
		assert.equal(listener("mousedown"), undefined);
		assert.equal(listener("keydown"), undefined);
		// The highlight box must not outlive picking mode.
		assert.equal(outlineBox(), null);
		teardown(context);
	});

	test("reports the picked element through the callback the panel wires", () => {
		const context = applyWithDom();
		const { bubble } = buildTarget();
		const picked = [];
		api.panel.picker.onPick = (element) => picked.push(element);

		api.panel.startPicking();
		const click = listener("mousedown");
		let prevented = false;
		click.handler({
			target: bubble,
			preventDefault: () => {
				prevented = true;
			},
			stopPropagation: () => {}
		});

		assert.equal(picked.length, 1, "the handler must hand the element to the panel");
		assert.equal(picked[0], bubble);
		assert.equal(prevented, true, "the app must not also react to the picker's click");
		teardown(context);
	});

	test("one-shot mode ends picking after the first selection", () => {
		const context = applyWithDom();
		const { bubble } = buildTarget();
		api.panel.picker.onPick = () => {};
		api.panel.picker.oneShot = true;

		api.panel.startPicking();
		listener("mousedown").handler({ target: bubble, preventDefault: () => {}, stopPropagation: () => {} });
		assert.equal(listener("mousemove"), undefined, "picking must have ended");
		teardown(context);
	});

	test("Esc ends picking", () => {
		const context = applyWithDom();
		api.panel.startPicking();
		const keydown = listener("keydown");
		keydown.handler({ key: "Escape", preventDefault: () => {} });
		assert.equal(listener("mousemove"), undefined);
		teardown(context);
	});

	test("never picks the plugin's own overlay", () => {
		const context = applyWithDom();
		const picked = [];
		api.panel.picker.onPick = (element) => picked.push(element);
		api.panel.startPicking();

		const overlay = outlineBox();
		assert.ok(overlay !== null, "the overlay must exist while picking");
		listener("mousedown").handler({ target: overlay, preventDefault: () => {}, stopPropagation: () => {} });
		assert.equal(picked.length, 0, "clicking our own highlight box must do nothing");
		teardown(context);
	});

	test("a saved rule reaches the injected sheet", async () => {
		const context = applyWithDom();
		api.panel.commit((draft) => {
			draft.rules.push({
				id: "r1",
				selector: "#conversation-list .user-bubble",
				label: "user bubble",
				declarations: [{ property: "border-radius", value: "18px", important: true }]
			});
		});
		await settle();
		const css = pluginStyleTag().textContent;
		assert.match(css, /#conversation-list \.user-bubble \{/);
		assert.match(css, /border-radius: 18px !important;/);
		teardown(context);
	});
});

// ── hiding the settings modal while picking ─────────────────────────────────

describe("modal concealment during picking", () => {
	/**
	 * Build the settings modal exactly as the shipped `SettingsRoot` renders it:
	 * a `sidebar.settings` trigger button, then the panel, as siblings inside one
	 * fragment — ?which React manifests as two element children of a shared parent.
	 *
	 * `SettingsRoot` renders the panel INLINE (it never calls `createPortal`), so
	 * the plugin's section really is a DOM descendant of the dialog. Reproducing
	 * that sibling relationship matters twice over: the mask must be a sibling of
	 * the dialog for the overlay to be recognized as a modal wrapper, and the
	 * trigger must be a sibling of the overlay for the climb to stop there instead
	 * of walking up into the app and blanking the page.
	 */
	const buildModal = () => {
		// The shared parent React renders the fragment into.
		const host = documentStub.createElement("div");
		documentStub.body.appendChild(host);
		// Sibling #1: the sidebar's settings trigger.
		const trigger = documentStub.createElement("button");
		host.appendChild(trigger);
		// Sibling #2: the modal overlay.
		const overlay = documentStub.createElement("div");
		overlay.style.display = "flex";
		host.appendChild(overlay);
		const mask = documentStub.createElement("div");
		// The shipped mask is `aria-hidden="true"` — that attribute is part of how
		// the overlay is recognized as belonging to the modal rather than the page.
		mask.setAttribute("aria-hidden", "true");
		const panel = documentStub.createElement("div");
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-modal", "true");
		overlay.appendChild(mask);
		overlay.appendChild(panel);
		// The content column, then the active section inside it.
		const options = documentStub.createElement("div");
		panel.appendChild(options);
		const section = documentStub.createElement("div");
		section.dataset.dcsUi = "1";
		options.appendChild(section);
		return { host, trigger, overlay, mask, panel, options, section };
	};

	test("picking hides the modal overlay and stopping restores it exactly", () => {
		const context = applyWithDom();
		const { overlay, section } = buildModal();
		// A non-default inline display must come back verbatim, not as "".
		overlay.style.display = "flex";

		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none", "the modal must be out of the way");
		assert.equal(overlay.dataset.dcsHidden, "1", "and marked so its interior is refused");

		api.panel.stopPicking();
		assert.equal(overlay.style.display, "flex", "the original display value must return");
		assert.equal(overlay.dataset.dcsHidden, undefined, "the marker must be cleared");
		teardown(context);
	});

	test("hides only the modal layer, never the app around it", () => {
		const context = applyWithDom();
		const { host, trigger, overlay, section } = buildModal();

		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none");
		// The modal's own parent also holds the sidebar trigger: climbing into it
		// would hide the trigger and could blank the page. It must be untouched.
		assert.notEqual(host.style.display, "none", "the app around the modal must stay visible");
		assert.notEqual(trigger.style.display, "none");
		assert.equal(documentStub.body.style.display, undefined, "body is never touched");
		teardown(context);
	});

	test("the modal is found by its ARIA role, not by a hashed class name", () => {
		const context = applyWithDom();
		const { overlay, section } = buildModal();
		// The shipped classes are CSS-module hashes that change per build; the
		// dialog here deliberately carries NO class at all.
		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none");
		teardown(context);
	});

	test("a dialog with no mask wrapper is hidden on its own", () => {
		const context = applyWithDom();
		// Degenerate shape: nothing wraps the dialog, so there is no overlay to
		// take and the dialog itself must be the hidden layer.
		const dialog = documentStub.createElement("div");
		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-modal", "true");
		dialog.style.display = "block";
		documentStub.body.appendChild(dialog);
		const section = documentStub.createElement("div");
		dialog.appendChild(section);

		api.panel.startPicking(section);
		assert.equal(dialog.style.display, "none");
		api.panel.stopPicking();
		assert.equal(dialog.style.display, "block");
		teardown(context);
	});

	test("an extra wrapper is taken only when it holds nothing but the modal", () => {
		const context = applyWithDom();
		// A positioning wrapper around the shipped overlay: it holds the mask and
		// the overlay, nothing else, so hiding it is correct AND sufficient.
		const outer = documentStub.createElement("div");
		outer.style.display = "grid";
		documentStub.body.appendChild(outer);
		const inner = documentStub.createElement("div");
		inner.style.display = "flex";
		outer.appendChild(inner);
		const mask = documentStub.createElement("div");
		mask.setAttribute("aria-hidden", "true");
		inner.appendChild(mask);
		const dialog = documentStub.createElement("div");
		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-modal", "true");
		inner.appendChild(dialog);
		const section = documentStub.createElement("div");
		dialog.appendChild(section);

		api.panel.startPicking(section);
		assert.equal(outer.style.display, "none", "the whole modal chain must go");
		api.panel.stopPicking();
		assert.equal(outer.style.display, "grid", "and come back with its own value");
		teardown(context);
	});

	test("the climb stops before an ancestor shared with the page", () => {
		const context = applyWithDom();
		// A wrapper holding the modal AND something else belongs to the page, so
		// the climb must refuse it — otherwise it would keep going and blank the app.
		const pageRoot = documentStub.createElement("div");
		pageRoot.style.display = "block";
		documentStub.body.appendChild(pageRoot);
		const overlay = documentStub.createElement("div");
		overlay.style.display = "flex";
		pageRoot.appendChild(overlay);
		const unrelated = documentStub.createElement("div");
		pageRoot.appendChild(unrelated);
		const mask = documentStub.createElement("div");
		mask.setAttribute("aria-hidden", "true");
		overlay.appendChild(mask);
		const dialog = documentStub.createElement("div");
		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-modal", "true");
		overlay.appendChild(dialog);
		const section = documentStub.createElement("div");
		dialog.appendChild(section);

		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none", "the modal overlay is taken");
		assert.notEqual(pageRoot.style.display, "none", "but never the page around it");
		assert.notEqual(documentStub.body.style.display, "none");
		teardown(context);
	});

	test("falls back to a document lookup when the section is outside the dialog", () => {
		const context = applyWithDom();
		const { overlay } = buildModal();
		// A section rendered somewhere else entirely — ?the walk finds nothing, so
		// the document query has to take over. Make the stub's query return the
		// dialog for this one test.
		documentStub.matchCount = 1;
		documentStub.matchElement = overlay.children[1];

		api.panel.startPicking(documentStub.createElement("div"));
		assert.equal(overlay.style.display, "none", "the fallback must still get the modal out of the way");
		teardown(context);
	});

	test("clicking inside the concealed modal is refused instead of authored", () => {
		const context = applyWithDom();
		const { overlay, panel, section } = buildModal();
		const picked = [];
		let refused = 0;
		api.panel.picker.onPick = (element) => picked.push(element);
		api.panel.picker.onRefused = () => {
			refused += 1;
		};

		api.panel.startPicking(section);
		const chrome = documentStub.createElement("button");
		panel.appendChild(chrome);
		listener("mousedown").handler({ target: chrome, preventDefault: () => {}, stopPropagation: () => {} });

		assert.equal(picked.length, 0, "settings chrome is not a picking target");
		assert.equal(refused, 1, "and the refusal must be reported, not silent");
		assert.equal(overlay.style.display, "none", "the refusal must not end picking");
		teardown(context);
	});

	test("Esc during picking brings the modal back", () => {
		const context = applyWithDom();
		const { overlay, section } = buildModal();
		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none");

		listener("keydown").handler({ key: "Escape", preventDefault: () => {} });
		assert.equal(overlay.style.display, "flex");
		teardown(context);
	});

	test("teardown restores the modal, so disabling the plugin never strands it hidden", () => {
		const context = applyWithDom();
		const { overlay, section } = buildModal();
		api.panel.startPicking(section);
		assert.equal(overlay.style.display, "none");

		teardown(context);
		assert.equal(overlay.style.display, "flex", "a plugin that unmounts must leave the panel visible");
	});

	test("a page with no settings modal still picks, without throwing", () => {
		// A composition that renders the section somewhere unusual must degrade to
		// "modal not hidden", never to an error.
		const context = applyWithDom();
		const detached = documentStub.createElement("div");
		assert.doesNotThrow(() => api.panel.startPicking(detached));
		// Picking itself must have started regardless: the modal lookup is a
		// convenience, not a precondition.
		assert.ok(listener("mousedown") !== undefined, "the capture click must be installed");
		assert.equal(api.panel.picker.active, true);
		api.panel.stopPicking();
		teardown(context);
	});

	test("the floating bar's host exists and is torn down with the plugin", () => {
		const context = applyWithDom();
		assert.ok(pickerBarHost() !== null, "the bar needs a home outside the modal");
		teardown(context);
		assert.equal(pickerBarHost(), null);
	});

	test("the bar is portalled while picking, and not otherwise", () => {
		const context = applyWithDom();
		const host = pickerBarHost();
		const t = (key) => key;

		// Not picking: no bar, so the modal is uncluttered.
		assert.equal(api.renderPickerBar(t, false, () => {}, { current: true }), null);

		// Picking: a bar, mounted into the plugin's body-level host — ?outside the
		// modal that picking just hid.
		const bar = api.renderPickerBar(t, true, () => {}, { current: true });
		assert.ok(bar !== null && bar !== undefined, "picking must show an escape hatch");
		assert.equal(bar.props.container, host, "it must be portalled into the outside host");

		// The bar carries a working Stop that routes back to the engine.
		let stopped = 0;
		const stoppedBar = api.PickerBar({ t, oneShotRef: { current: false }, onStop: () => {
			stopped += 1;
		} });
		const stopButton = stoppedBar.children.find((child) => child?.props?.type === "button");
		assert.ok(stopButton !== undefined, "the bar needs a Stop button");
		stopButton.props.onClick();
		assert.equal(stopped, 1, "Stop must leave picking mode");

		teardown(context);
	});

	test("the bar degrades to nothing when the portal target is gone", () => {
		const context = applyWithDom();
		teardown(context);
		// After teardown the host is cleared; a late render must not throw.
		assert.equal(api.renderPickerBar((key) => key, true, () => {}, { current: true }), null);
	});

	test("the bar names the one-shot mode only while it is on", () => {
		const t = (key) => key;
		const on = api.PickerBar({ t, oneShotRef: { current: true }, onStop: () => {} });
		const off = api.PickerBar({ t, oneShotRef: { current: false }, onStop: () => {} });
		/** The one-shot chip is the only child rendered as a bordered pill. */
		const chips = (bar) => bar.children.filter((child) => child?.props?.style?.borderRadius === "999px").length;
		assert.equal(chips(on), 1, "one-shot mode is surfaced");
		assert.equal(chips(off), 0, "and not surfaced when it is off");
	});
});

// ── selector generation against a DOM ──────────────────────────────────────

describe("buildSelector", () => {
	/** Mount a wrapper with a stable id and a hashed-class bubble inside it. */
	const build = () => {
		const wrapper = documentStub.createElement("div");
		wrapper.setAttribute("id", "conversation-list");
		const bubble = documentStub.createElement("div");
		bubble.classList = ["_bubble_1a2b3", "user-bubble"];
		bubble.className = "_bubble_1a2b3 user-bubble";
		bubble.textContent = "  hello   world  ";
		wrapper.appendChild(bubble);
		return { wrapper, bubble };
	};

	test("prefers the element's own id and skips generated class names", () => {
		// A selector that resolves to exactly this element is the unambiguous
		// case, so the first authored candidate must win outright.
		documentStub.matchCount = 1;
		const { bubble } = build();
		documentStub.matchElement = bubble;
		assert.equal(api.buildSelector(bubble), "div.user-bubble");
	});

	test("ignores a generated-looking id in favour of an authored class", () => {
		documentStub.matchCount = 1;
		const node = documentStub.createElement("div");
		node.setAttribute("id", "a1b2c3d4e5f6");
		node.classList = ["panel"];
		documentStub.matchElement = node;
		assert.equal(api.buildSelector(node), "div.panel");
	});

	test("falls back to the bare tag when nothing distinguishes the element", () => {
		documentStub.matchCount = 1;
		const node = documentStub.createElement("span");
		documentStub.matchElement = node;
		assert.equal(api.buildSelector(node), "span");
	});

	test("walks up to an ancestor id when the element alone is ambiguous", () => {
		const { bubble } = build();
		// Nothing resolves uniquely on its own, so the walk must still terminate
		// with the longest usable path it built — ?and must lead with the nearest
		// stable ancestor.
		documentStub.matchCount = 3;
		documentStub.matchElement = null;
		assert.equal(api.buildSelector(bubble), "#conversation-list > div.user-bubble");
	});

	test("refuses anything that is not an element", () => {
		for (const value of [null, undefined, "div", 42, {}]) {
			assert.equal(api.buildSelector(value), "");
		}
	});

	test("resolveElement reports a selector, live values, and a readable label", () => {
		documentStub.matchCount = 1;
		const { bubble } = build();
		documentStub.matchElement = bubble;
		const resolved = api.resolveElement(bubble);
		assert.equal(resolved.tag, "div");
		assert.equal(resolved.selector, "div.user-bubble");
		assert.equal(resolved.label, "div · hello world", "whitespace is collapsed for the rule list");
		assert.equal(typeof resolved.computed, "object");
	});

	test("resolveElement labels an empty element by its tag alone", () => {
		documentStub.matchCount = 1;
		const node = documentStub.createElement("section");
		documentStub.matchElement = node;
		assert.equal(api.resolveElement(node).label, "section");
	});
});

// ── session restore ─────────────────────────────────────────────────────────

describe("session restore", () => {
	test("a reload repaints every saved layer from the local cache", () => {
		// Write the cache the way a previous session's `persist()` would have, then
		// install the plugin cold — ?this is exactly the reload path.
		const saved = api.encodeState(api.normalizeState({
			enabled: true,
			css: "body { letter-spacing: .02em; }",
			rules: [],
			vars: [{ name: "--dsw-alias-brand-primary", light: "#ff0000", dark: "#00ff00" }],
			knobs: { fontScale: 1.1, density: 0.2, radius: 4, contentWidth: 900, bubbleRadius: 6 },
			preset: "compact"
		}));
		loaded.sandbox.localStorage.setItem(api.CACHE_KEY, JSON.stringify(saved));

		const context = applyWithDom();
		const css = pluginStyleTag().textContent;

		assert.match(css, /letter-spacing: \.02em/, "the hand-written sheet");
		assert.match(css, /--dsw-alias-brand-primary: #ff0000 !important/, "the light token override");
		assert.match(css, /--dsw-alias-brand-primary: #00ff00 !important/, "the dark token override");
		assert.match(css, /--dsh-content-font-size: 15\.4px/, "the type scale");
		assert.match(css, /--dcs-radius: 4px/, "the corner radius");
		assert.match(css, /--dcs-spread: -0\.600/, "the density");
		// The in-memory state must agree with what was painted.
		assert.equal(api.panel.store.get().preset, "compact");
		teardown(context);
	});

	test("the section's nav label is a thunk that follows the active locale", () => {
		const zhContext = createContext({ activeLanguage: "zh" });
		bundleExports.apply(zhContext.ctx);
		const registration = zhContext.slots.find((entry) => entry.kind === "register");

		// A literal string would freeze the nav row in the mount-time language;
		// the shell re-reads a thunk on every projection.
		assert.equal(typeof registration.options.label, "function");
		assert.equal(registration.options.label(), "自定义样式");
		teardown(zhContext);
	});

	test("a corrupt cache degrades to factory defaults instead of breaking the panel", () => {
		loaded.sandbox.localStorage.setItem(api.CACHE_KEY, "{ not json at all");
		const context = applyWithDom();
		assert.equal(api.panel.store.get().css, "");
		assert.ok(pluginStyleTag() !== null, "the plugin must still mount");
		teardown(context);
	});
});
