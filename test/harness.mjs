/**
 * Load the SHIPPED browser bundle in a sandbox and hand back its exports.
 *
 * The bundle is not a module: it registers a factory with
 * `window.__ModuleLoader__.load({ id, factory })`, exactly as the DSH web shell
 * expects. Calling the factory with a stubbed `require` therefore exercises the
 * same code path the browser takes, which is the point — the behavior suite
 * asserts against the artifact users install, not against the sources.
 *
 * The stub `require` answers only `react`, because that is the single platform
 * seed this plugin resolves.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The path of the built browser bundle. */
export const BUNDLE_PATH = join(root, "lib", "client.js");

/**
 * A minimal React stand-in covering the hooks the panel uses.
 *
 * `createElement` returns a plain descriptor so a test can inspect the rendered
 * tree without a DOM. The hook implementations are intentionally trivial:
 * `useState` keeps a mutable cell, `useEffect` runs immediately, `useMemo`
 * recomputes on every call. That is enough to assert on component OUTPUT and on
 * the plugin's side effects; it is not a renderer and does not pretend to be.
 */
function createReactStub() {
	let hookIndex = 0;
	/** Hook state for the current "render", reset by `__reset`. */
	let cells = [];

	const React = {
		createElement(type, props, ...children) {
			const flat = children.length === 0 ? undefined : children.length === 1 ? children[0] : children;
			return { type, props: props ?? {}, children: flat };
		},
		useState(initial) {
			const index = hookIndex;
			hookIndex += 1;
			if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
			return [cells[index], (next) => {
				cells[index] = typeof next === "function" ? next(cells[index]) : next;
			}];
		},
		useEffect(effect) {
			const cleanup = effect();
			if (typeof cleanup === "function") pendingCleanups.push(cleanup);
		},
		useMemo(factory) {
			return factory();
		},
		useRef(initial) {
			const index = hookIndex;
			hookIndex += 1;
			if (!(index in cells)) cells[index] = { current: initial };
			return cells[index];
		},
		/** Sentinel so the plugin takes the `useSyncExternalStore` branch. */
		useSyncExternalStore(subscribe, getSnapshot) {
			// A real implementation subscribes; the stub reads once, which is all
			// an assertion on the rendered output needs.
			return getSnapshot();
		}
	};

	/** Cleanups registered by `useEffect` during the last render. */
	const pendingCleanups = [];

	/**
	 * A `react-dom` stand-in exposing only `createPortal`.
	 *
	 * A portal is reported as a descriptor carrying its container, so a test can
	 * assert WHERE the floating bar is mounted (outside the settings modal)
	 * without a renderer. The node type is a plain string, so the suite's generic
	 * tree walk treats it as a leaf instead of trying to invoke it.
	 */
	const ReactDOM = {
		createPortal(children, container) {
			return { type: "portal", props: { container }, children };
		}
	};

	return {
		React,
		ReactDOM,
		/** Run a render function with fresh hook bookkeeping. */
		render: (fn) => {
			hookIndex = 0;
			cells = [];
			pendingCleanups.length = 0;
			return fn();
		},
		cleanups: pendingCleanups
	};
}

/**
 * Execute the bundle and return its exports.
 * @returns {Promise<{ exports: object, react: object, moduleLoader: object }>}
 */
export async function loadBundle() {
	const source = readFileSync(BUNDLE_PATH, "utf8");
	const stub = createReactStub();

	/** Captured registrations, so a test can assert what the shell was handed. */
	const registrations = [];

	// Host-realm intrinsics are shared into the sandbox ON PURPOSE. Without
	// this, objects and arrays created inside the VM carry that realm's
	// prototypes and `assert.deepEqual` rejects them as "same structure but not
	// reference-equal" — a false failure about realms, not about behavior.
	const sandbox = {
		console,
		setTimeout,
		clearTimeout,
		URL,
		Blob: class Blob {},
		Math,
		Date,
		JSON,
		Object,
		Array,
		Symbol,
		Number,
		String,
		Boolean,
		RegExp,
		Error,
		Map,
		Set,
		Promise
	};
	// The bundle is written for a browser, where `window` IS the global object.
	// Mirroring that here keeps every `window.x` / `globalThis.x` reference on
	// one object, exactly as in the real shell.
	sandbox.globalThis = sandbox;
	sandbox.window = sandbox;
	sandbox.__ModuleLoader__ = {
		load: (entry) => {
			registrations.push(entry);
		}
	};
	// `document` and `fetch` are absent on purpose: the module system
	// materializes bundles before the shell mounts, and `hydrateFromHost` must
	// fail soft without a network.

	vm.runInNewContext(source, sandbox, { filename: BUNDLE_PATH });

	if (registrations.length !== 1) {
		throw new Error(`expected exactly one module registration, got ${registrations.length}`);
	}
	const entry = registrations[0];

	/**
	 * The platform seeds this plugin resolves: `react` (required) and `react-dom`
	 * (optional — it only supplies `createPortal` for the floating picker bar).
	 */
	const requireStub = (name) => {
		if (name === "react") return stub.React;
		if (name === "react-dom") return stub.ReactDOM;
		throw new Error(`the bundle required an unknown platform module: ${name}`);
	};

	const exports = entry.factory(requireStub);
	return { exports, entry, react: stub, sandbox };
}

/**
 * Build a fake cordis client context recording everything the plugin registers.
 *
 * Only the services this plugin declares in `inject` are modelled, so a test
 * cannot accidentally pass because of a service the plugin never asked for.
 * @param options.activeLanguage - which dictionary `locale.bind` resolves through.
 */
export function createContext(options = {}) {
	const slots = [];
	const locales = [];
	const effects = [];
	const activeLanguage = options.activeLanguage ?? "en";

	const ctx = {
		slots: {
			inject(name, callback) {
				slots.push({ kind: "inject", name });
				callback();
			},
			register(options, Component) {
				slots.push({ kind: "register", name: options.name, options, Component });
				return () => {};
			}
		},
		locale: {
			register(namespace, dictionaries) {
				locales.push({ namespace, dictionaries });
				return () => {};
			},
			/**
			 * The bound-translator face the shell exposes. Modelled faithfully
			 * because the plugin uses it for NON-React copy (the settings-section
			 * nav label thunk, import/export toasts), where a real `bind` is the
			 * only thing standing between the user and a raw locale key.
			 */
			bind(namespace) {
				const dictionaries = locales.find((entry) => entry.namespace === namespace)?.dictionaries ?? {};
				return (key, params) => {
					const table = dictionaries[activeLanguage] ?? dictionaries.en ?? {};
					const text = table[key] ?? key;
					if (params === null || params === undefined) return text;
					return text.replace(/\{(\w+)\}/g, (match, name) => (
						Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
					));
				};
			}
		},
		effect(callback, label) {
			const disposer = callback();
			effects.push({ label, disposer });
			return () => {
				if (typeof disposer === "function") disposer();
			};
		}
	};

	return {
		ctx,
		slots,
		locales,
		effects,
		/** The `settings.section` registration, if the plugin made one. */
		section: () => slots.find((entry) => entry.kind === "register" && entry.name === "settings.section")
	};
}
