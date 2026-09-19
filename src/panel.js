// ── panel: design-token-driven primitives ───────────────────────────────────
//
// Every visual value below reads a `--dsw-*` token so the plugin inherits the
// user's active palette (and any theme another plugin is driving) instead of
// hardcoding a look of its own. That is what makes this plugin compose with a
// skinning plugin rather than fight it.

/** Shared inline styles for the panel chrome. */
const S = {
	root: {
		display: "flex",
		flexDirection: "column",
		width: "100%",
		minWidth: 0
	},
	header: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		paddingBottom: "12px"
	},
	title: {
		color: "var(--dsw-alias-label-primary)",
		fontSize: "15px",
		fontWeight: 500,
		lineHeight: "22px"
	},
	subtitle: {
		color: "var(--dsw-alias-label-tertiary)",
		fontSize: "12px",
		lineHeight: "18px"
	},
	tabs: {
		display: "flex",
		flexWrap: "wrap",
		gap: "4px",
		borderBottom: "1px solid var(--dsw-alias-border-l2)",
		paddingBottom: "8px",
		marginBottom: "4px"
	},
	tab: {
		appearance: "none",
		border: "none",
		background: "transparent",
		color: "var(--dsw-alias-label-secondary)",
		font: "inherit",
		fontSize: "13px",
		lineHeight: "20px",
		padding: "4px 10px",
		borderRadius: "8px",
		cursor: "pointer",
		outline: "none"
	},
	tabActive: {
		background: "var(--dsw-alias-interactive-bg-hover)",
		color: "var(--dsw-alias-label-primary)",
		fontWeight: 500
	},
	group: {
		display: "flex",
		flexDirection: "column",
		gap: "10px",
		padding: "16px 0",
		borderBottom: "1px solid var(--dsw-alias-border-l2)"
	},
	groupLast: {
		borderBottom: "none",
		paddingBottom: 0
	},
	groupTitle: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		color: "var(--dsw-alias-label-primary)",
		fontSize: "14px",
		fontWeight: 400,
		lineHeight: "22px"
	},
	hint: {
		color: "var(--dsw-alias-label-tertiary)",
		fontSize: "12px",
		lineHeight: "18px"
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		flexWrap: "wrap"
	},
	column: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		minWidth: 0
	},
	button: {
		appearance: "none",
		font: "inherit",
		fontSize: "12px",
		lineHeight: "18px",
		padding: "4px 10px",
		borderRadius: "7px",
		border: "1px solid var(--dsw-alias-border-l2)",
		background: "var(--dsw-alias-button-elevated-fill, transparent)",
		color: "var(--dsw-alias-label-primary)",
		cursor: "pointer",
		outline: "none",
		whiteSpace: "nowrap"
	},
	buttonPrimary: {
		border: "1px solid transparent",
		background: "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary))",
		color: "var(--dsw-alias-label-primary-foreground, #ffffff)"
	},
	buttonDanger: {
		border: "1px solid var(--dsw-alias-state-error-primary)",
		background: "transparent",
		color: "var(--dsw-alias-state-error-primary)"
	},
	buttonDisabled: {
		opacity: 0.45,
		cursor: "not-allowed"
	},
	input: {
		appearance: "none",
		font: "inherit",
		fontSize: "12px",
		lineHeight: "18px",
		padding: "4px 8px",
		minWidth: 0,
		borderRadius: "7px",
		border: "1px solid var(--dsw-alias-border-l2)",
		background: "var(--dsw-alias-bg-layer-1, transparent)",
		color: "var(--dsw-alias-label-primary)",
		outline: "none"
	},
	select: {
		appearance: "auto",
		font: "inherit",
		fontSize: "12px",
		lineHeight: "18px",
		padding: "4px 6px",
		borderRadius: "7px",
		border: "1px solid var(--dsw-alias-border-l2)",
		background: "var(--dsw-alias-bg-layer-1, transparent)",
		color: "var(--dsw-alias-label-primary)",
		outline: "none",
		maxWidth: "100%"
	},
	code: {
		fontFamily: "var(--ds-font-family-code)",
		fontSize: "12px",
		lineHeight: "18px",
		color: "var(--dsw-alias-label-secondary)"
	},
	card: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
		padding: "10px",
		borderRadius: "10px",
		border: "1px solid var(--dsw-alias-border-l2)",
		background: "var(--dsw-alias-bg-layer-1, transparent)",
		minWidth: 0
	},
	cardActive: {
		borderColor: "var(--dsw-alias-brand-primary)",
		boxShadow: "0 0 0 1px var(--dsw-alias-brand-primary)"
	},
	chip: {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
		padding: "1px 7px",
		borderRadius: "999px",
		fontSize: "11px",
		lineHeight: "16px",
		border: "1px solid var(--dsw-alias-border-l2)",
		color: "var(--dsw-alias-label-secondary)"
	},
	chipAccent: {
		borderColor: "var(--dsw-alias-brand-primary)",
		color: "var(--dsw-alias-brand-primary)"
	},
	warning: {
		color: "var(--dsw-alias-state-warn-primary, var(--dsw-alias-label-secondary))",
		fontSize: "12px",
		lineHeight: "18px"
	},
	danger: {
		color: "var(--dsw-alias-state-error-primary)",
		fontSize: "12px",
		lineHeight: "18px"
	},
	mono: {
		fontFamily: "var(--ds-font-family-code)",
		fontSize: "12px",
		lineHeight: "18px"
	},
	scrollBox: {
		maxHeight: "420px",
		overflowY: "auto",
		overflowX: "hidden",
		display: "flex",
		flexDirection: "column",
		gap: "2px",
		paddingRight: "4px"
	},
	toast: {
		position: "fixed",
		left: "50%",
		bottom: "32px",
		transform: "translateX(-50%)",
		zIndex: 2147483647,
		padding: "8px 16px",
		borderRadius: "10px",
		background: "var(--dsw-alias-toast-bg, var(--dsw-alias-bg-layer-3, #333))",
		color: "var(--dsw-alias-label-primary)",
		fontSize: "12px",
		lineHeight: "18px",
		boxShadow: "var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,.24))",
		pointerEvents: "none",
		maxWidth: "70vw"
	}
};

// ── panel: small helpers ────────────────────────────────────────────────────

/** No-op subscription, used while no store is installed yet. */
function noopSubscribe() {
	return () => {};
}

/** A frozen stand-in snapshot so hook order stays unconditional. */
const emptyConfig = Object.freeze(defaultState());

/** Interpolate `{name}` placeholders in one translated string. */
function fill(template, values) {
	return String(template).replace(/\{(\w+)\}/g, (match, key) => (
		Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
	));
}

/** The store-bound translator for one panel subtree. */
function translatorFor(t) {
	return (key, values) => {
		const text = typeof t === "function" ? t(key) : key;
		return values === undefined ? text : fill(text, values);
	};
}

/** Copy text to the clipboard, falling back to a temporary textarea. */
async function copyText(text) {
	try {
		await globalThis.navigator?.clipboard?.writeText(text);
		return true;
	} catch {
		// Clipboard API needs a secure context and permission; fall back.
	}
	try {
		const area = document.createElement("textarea");
		area.value = text;
		area.setAttribute("readonly", "readonly");
		area.style.cssText = "position:fixed;top:-1000px;opacity:0";
		document.body.appendChild(area);
		area.select();
		const ok = document.execCommand("copy");
		area.remove();
		return ok;
	} catch {
		return false;
	}
}

/**
 * A transient confirmation message.
 *
 * The settings panel offers no toast of its own, so the plugin owns one. It is
 * mounted on `document.body` rather than inside the panel because the panel can
 * be closed while a message is still showing.
 */
function showToast(message) {
	let host = document.getElementById(`${PLUGIN_ID}-toast`);
	if (host === null) {
		host = document.createElement("div");
		host.id = `${PLUGIN_ID}-toast`;
		host.dataset.plugin = PLUGIN_ID;
		host.dataset.dcsUi = "1";
		host.setAttribute("role", "status");
		host.setAttribute("aria-live", "polite");
		document.body.appendChild(host);
	}
	host.textContent = message;
	Object.assign(host.style, S.toast, { opacity: "1" });
	clearTimeout(showToast.timer);
	showToast.timer = setTimeout(() => {
		host.style.opacity = "0";
		host.style.transition = "opacity .3s";
	}, 1800);
}

/** Download a string as a file, via a temporary blob URL. */
function downloadFile(filename, text, mime) {
	const blob = new Blob([text], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	// Revoke on the next task so the navigation has certainly started.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Normalize a CSS color to `#rrggbb` for an `<input type="color">`.
 * Returns "" when the value is not a solid color (a gradient, `transparent`,
 * a `var()` we cannot resolve), so callers can fall back to a text input.
 */
function normalizeHex(value) {
	const text = String(value ?? "").trim();
	if (text === "") return "";
	if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
	if (/^#[0-9a-f]{3}$/i.test(text)) return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`.toLowerCase();
	const functional = /^rgba?\(([^)]+)\)$/i.exec(text);
	if (functional === null) return "";
	const parts = functional[1].split(/[\s,/]+/).filter((part) => part !== "").map((part) => Number.parseFloat(part));
	if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return "";
	// Fully transparent has no representable hex; the picker must not lie.
	if (parts.length >= 4 && parts[3] === 0) return "";
	const channel = (number) => Math.max(0, Math.min(255, Math.round(number))).toString(16).padStart(2, "0");
	return `#${channel(parts[0])}${channel(parts[1])}${channel(parts[2])}`;
}

/** Whether a token's shipped defaults look like colors (so a swatch is useful). */
function looksLikeColor(entry) {
	if (entry === undefined || entry === null) return false;
	return normalizeHex(entry.light) !== "" || normalizeHex(entry.dark) !== "" || /gradient|color|#[0-9a-f]{3}/i.test(`${entry.light} ${entry.dark}`);
}

/**
 * Resolve a custom property's live value as the page currently renders it.
 *
 * The probe is appended to the same element the token is declared on (`body`),
 * so scheme-specific declarations apply to it exactly as they do to real
 * content. A token whose value is not a color simply resolves to the inherited
 * color; callers only use this for display and for color-swatch seeding.
 */
function liveTokenValue(name, scheme) {
	const probe = document.createElement("div");
	probe.style.cssText = "position:fixed;top:-10000px;left:0;pointer-events:none;color:inherit";
	document.body.appendChild(probe);
	probe.style.setProperty("color", `var(${name})`);
	const value = getComputedStyle(probe).color;
	probe.remove();
	if (scheme === "dark" && document.body.getAttribute("data-ds-dark-theme") === null) {
		// The dark palette is not mounted, so a "dark" reading would be a lie.
		return "";
	}
	return value === "" ? "" : value;
}

// ── panel: shared components ────────────────────────────────────────────────

/** A round "?" badge whose tooltip carries the explanatory copy. */
function HelpDot({ text }) {
	if (typeof text !== "string" || text === "") return null;
	return h("span", {
		title: text,
		"aria-label": text,
		role: "note",
		tabIndex: 0,
		style: {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: "15px",
			height: "15px",
			flex: "none",
			borderRadius: "50%",
			border: "1px solid var(--dsw-alias-border-l2)",
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: "10px",
			lineHeight: "1",
			cursor: "help",
			userSelect: "none",
			verticalAlign: "middle"
		},
		children: "?"
	});
}

/** One bordered settings group with a title, optional help, and a hint line. */
function Group({ title, help, hint, children, last }) {
	return h("div", { style: last === true ? { ...S.group, ...S.groupLast } : S.group }, [
		title === undefined ? null : h("div", { style: S.groupTitle, key: "title" }, [title, h(HelpDot, { text: help, key: "help" })]),
		hint === undefined ? null : h("div", { style: S.hint, key: "hint" }, hint),
		h("div", { style: S.column, key: "body" }, children)
	]);
}

/** A labelled range input with a live numeric readout. */
function Slider({ label, hint, min, max, step, value, display, onChange }) {
	return h("div", { style: { ...S.column, gap: "2px" } }, [
		h("div", { style: { ...S.row, justifyContent: "space-between" }, key: "head" }, [
			h("div", { style: { ...S.row, gap: "4px" }, key: "label" }, [label, h(HelpDot, { text: hint, key: "help" })]),
			h("span", { style: S.code, key: "value" }, display)
		]),
		h("input", {
			key: "input",
			type: "range",
			min,
			max,
			step,
			value,
			"aria-label": label,
			onChange: (event) => onChange(Number.parseFloat(event.target.value)),
			style: { width: "100%", accentColor: "var(--dsw-alias-brand-primary)", margin: 0 }
		})
	]);
}

/** A labelled checkbox row. */
function Toggle({ label, hint, checked, onChange }) {
	return h("label", { style: { ...S.row, cursor: "pointer", gap: "8px" } }, [
		h("input", {
			key: "input",
			type: "checkbox",
			checked,
			onChange: (event) => onChange(event.target.checked),
			style: { accentColor: "var(--dsw-alias-brand-primary)", margin: 0, cursor: "pointer" }
		}),
		h("span", { key: "label", style: { color: "var(--dsw-alias-label-primary)" } }, label),
		h(HelpDot, { text: hint, key: "help" })
	]);
}

/** A push button that renders its disabled affordance honestly. */
function Button({ children, onClick, variant, disabled, title, grow }) {
	const style = { ...S.button };
	if (variant === "primary") Object.assign(style, S.buttonPrimary);
	if (variant === "danger") Object.assign(style, S.buttonDanger);
	if (disabled === true) Object.assign(style, S.buttonDisabled);
	if (grow === true) style.flex = "1";
	return h("button", {
		type: "button",
		onClick: disabled === true ? undefined : onClick,
		disabled: disabled === true,
		title,
		style
	}, children);
}

/** A monospace text input. */
function TextInput({ value, onChange, placeholder, ariaLabel, style }) {
	return h("input", {
		type: "text",
		value,
		placeholder,
		"aria-label": ariaLabel,
		onChange: (event) => onChange(event.target.value),
		style: { ...S.input, ...(style ?? {}) }
	});
}

// ── panel: master switch ────────────────────────────────────────────────────

/** The one control that is always visible, whatever tab is open. */
function MasterRow({ t, config }) {
	const setEnabled = () => panelApi.commit((draft) => {
		draft.enabled = !draft.enabled;
	});
	return h("div", {
		style: {
			...S.row,
			justifyContent: "space-between",
			padding: "10px 12px",
			borderRadius: "10px",
			border: "1px solid var(--dsw-alias-border-l2)",
			background: "var(--dsw-alias-bg-layer-1, transparent)"
		}
	}, [
		h("div", { key: "copy", style: { ...S.column, gap: "2px", flex: "1 1 auto" } }, [
			h("div", { style: { ...S.row, gap: "4px" } }, [t("master.title"), h(HelpDot, { text: t("master.hint") })]),
			h("div", { style: S.hint }, config.enabled ? t("common.on") : t("common.off"))
		]),
		h("button", {
			key: "switch",
			type: "button",
			role: "switch",
			"aria-checked": config.enabled,
			"aria-label": t("master.title"),
			onClick: () => setEnabled(),
			style: {
				appearance: "none",
				position: "relative",
				width: "38px",
				height: "22px",
				flex: "none",
				borderRadius: "999px",
				border: "1px solid var(--dsw-alias-border-l2)",
				cursor: "pointer",
				outline: "none",
				background: config.enabled ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-bg-layer-2, transparent)",
				transition: "background .15s"
			}
		}, [
			h("span", {
				key: "knob",
				style: {
					position: "absolute",
					top: "2px",
					left: config.enabled ? "18px" : "2px",
					width: "16px",
					height: "16px",
					borderRadius: "50%",
					background: "var(--dsw-alias-bg-base, #fff)",
					boxShadow: "var(--dsw-shadow-lv1, 0 1px 2px rgba(0,0,0,.3))",
					transition: "left .15s"
				}
			})
		])
	]);
}

// ── tab: global CSS ─────────────────────────────────────────────────────────

/**
 * The global stylesheet editor.
 *
 * The textarea is uncontrolled-on-purpose: React re-rendering a controlled
 * value on every store change would fight fast typing and lose the caret. The
 * DOM value is synced from the store only when the two genuinely differ (an
 * import, an undo, a change from another tab), which keeps typing authoritative
 * locally while still adopting external writes.
 */
function CssTab({ t: rawT, config, commit }) {
	const t = translatorFor(rawT);
	const areaRef = _react.useRef(null);
	/** Undo history of the custom-CSS text, most recent last. */
	const historyRef = _react.useRef([]);
	const [error, setError] = _react.useState("");

	_react.useEffect(() => {
		const area = areaRef.current;
		if (area === null) return;
		if (area.value !== config.css && document.activeElement !== area) {
			area.value = config.css;
		}
	}, [config.css]);

	const onInput = (event) => {
		const next = event.target.value;
		const previous = config.css;
		if (previous !== next) {
			historyRef.current.push(previous);
			if (historyRef.current.length > 100) historyRef.current.shift();
		}
		commit((draft) => {
			draft.css = next;
		});
		// Surface a parse failure instead of silently injecting a sheet the
		// browser dropped: an unbalanced brace is the common authoring mistake.
		setError(cssBalance(next) ? "" : t("css.injectError"));
	};

	const undo = () => {
		const previous = historyRef.current.pop();
		if (previous === undefined) {
			showToast(t("css.undoNone"));
			return;
		}
		if (areaRef.current !== null) areaRef.current.value = previous;
		commit((draft) => {
			draft.css = previous;
		});
		setError(cssBalance(previous) ? "" : t("css.injectError"));
	};

	/** Wrap the current selection in a `var(--token)` reference. */
	const insertToken = (name) => {
		const area = areaRef.current;
		if (area === null) return;
		const snippet = `var(${name})`;
		const start = area.selectionStart ?? area.value.length;
		const end = area.selectionEnd ?? start;
		const next = `${area.value.slice(0, start)}${snippet}${area.value.slice(end)}`;
		historyRef.current.push(area.value);
		area.value = next;
		commit((draft) => {
			draft.css = next;
		});
		area.focus();
		const caret = start + snippet.length;
		try {
			area.setSelectionRange(caret, caret);
		} catch {
			// selection API unavailable — focus alone is fine
		}
	};

	return h("div", { style: S.column }, [
		h(Group, {
			key: "editor",
			last: true,
			title: t("css.title"),
			help: t("css.hint"),
			children: [
				h("textarea", {
					key: "area",
					ref: areaRef,
					defaultValue: config.css,
					spellCheck: false,
					placeholder: t("css.placeholder"),
					"aria-label": t("css.title"),
					onInput,
					style: {
						width: "100%",
						minHeight: "260px",
						resize: "vertical",
						boxSizing: "border-box",
						padding: "10px",
						borderRadius: "10px",
						border: `1px solid ${error === "" ? "var(--dsw-alias-border-l2)" : "var(--dsw-alias-state-error-primary)"}`,
						background: "var(--dsw-alias-bg-layer-1, transparent)",
						color: "var(--dsw-alias-label-primary)",
						fontFamily: "var(--ds-font-family-code)",
						fontSize: "12.5px",
						lineHeight: "19px",
						tabSize: 2,
						outline: "none"
					}
				}),
				error === "" ? null : h("div", { key: "error", style: S.danger }, error),
				h("div", { key: "actions", style: S.row }, [
					h(Button, { key: "undo", onClick: undo, title: t("css.undo"), children: t("common.undo") }),
					h(TokenInserter, { key: "insert", t, onInsert: insertToken })
				])
			]
		})
	]);
}

/**
 * Whether a stylesheet's braces, strings, and comments are balanced.
 *
 * This is not a CSS parser and does not try to be one. It catches the mistakes
 * a plain `<style>` element swallows in silence — an unbalanced brace, an
 * unterminated comment, an unterminated string — which are exactly the failures
 * a user would otherwise never see the cause of. Quoted content is skipped
 * rather than counted, so a legitimate `content: "{"` is not a false alarm.
 */
function cssBalance(css) {
	let depth = 0;
	let quote = null;
	let index = 0;
	while (index < css.length) {
		const character = css[index];
		if (quote !== null) {
			if (character === "\\") {
				index += 2;
				continue;
			}
			if (character === "\n") return false;
			if (character === quote) quote = null;
		} else if (character === '"' || character === "'") {
			quote = character;
		} else if (character === "/" && css[index + 1] === "*") {
			const end = css.indexOf("*/", index + 2);
			if (end === -1) return false;
			index = end + 2;
			continue;
		} else if (character === "{") {
			depth += 1;
		} else if (character === "}") {
			depth -= 1;
			if (depth < 0) return false;
		}
		index += 1;
	}
	return depth === 0 && quote === null;
}

/** A compact menu that appends a `var(--token)` reference to the editor. */
function TokenInserter({ t, onInsert }) {
	const [open, setOpen] = _react.useState(false);
	const [query, setQuery] = _react.useState("");
	const entries = TOKENS.aliases ?? [];
	const needle = query.trim().toLowerCase();
	const matches = (needle === "" ? entries : entries.filter((entry) => entry.name.toLowerCase().includes(needle))).slice(0, 60);

	return h("div", { style: { position: "relative" } }, [
		h(Button, {
			key: "trigger",
			onClick: () => setOpen(!open),
			title: t("css.insertToken"),
			children: t("css.insertToken")
		}),
		open ? h("div", {
			key: "menu",
			style: {
				position: "absolute",
				top: "calc(100% + 4px)",
				left: 0,
				zIndex: 20,
				width: "340px",
				maxWidth: "80vw",
				padding: "8px",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				borderRadius: "10px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base))",
				boxShadow: "var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,.24))"
			}
		}, [
			h(TextInput, {
				key: "search",
				value: query,
				onChange: setQuery,
				placeholder: t("vars.search"),
				ariaLabel: t("vars.search")
			}),
			h("div", { key: "list", style: { ...S.scrollBox, maxHeight: "240px" } }, matches.map((entry) => h("button", {
				key: entry.name,
				type: "button",
				onClick: () => {
					onInsert(entry.name);
					setOpen(false);
				},
				style: {
					...S.button,
					border: "none",
					background: "transparent",
					textAlign: "left",
					fontFamily: "var(--ds-font-family-code)",
					overflow: "hidden",
					textOverflow: "ellipsis"
				},
				title: entry.name,
				children: entry.name
			})))
		]) : null
	]);
}

// ── tab: element picker ─────────────────────────────────────────────────────

/**
 * The bar shown while picking, mounted OUTSIDE the settings modal.
 *
 * Picking hides that modal, so the bar cannot be rendered inside the panel: it
 * would be hidden along with everything else. It is portalled into a host node
 * the plugin owns on `document.body`, which also keeps it clear of the shell's
 * own stacking contexts — the highlight box sits at the maximum z-index, so the
 * bar claims the slot just under it.
 *
 * The bar exists because otherwise picking would be a trap: the panel holding
 * the Stop button is invisible, and Esc is the only way out.
 */
function PickerBar({ t, oneShotRef, onStop }) {
	return h("div", {
		role: "status",
		"aria-live": "polite",
		style: {
			position: "fixed",
			top: "16px",
			left: "50%",
			transform: "translateX(-50%)",
			zIndex: 2147483645,
			display: "flex",
			alignItems: "center",
			gap: "10px",
			maxWidth: "92vw",
			padding: "8px 10px 8px 14px",
			borderRadius: "999px",
			border: "1px solid var(--dsw-alias-border-l2)",
			background: "var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base, #fff))",
			color: "var(--dsw-alias-label-primary)",
			boxShadow: "var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,.24))",
			fontSize: "12px",
			lineHeight: "18px"
		}
	}, [
		h("span", {
			key: "dot",
			style: {
				width: "8px",
				height: "8px",
				flex: "none",
				borderRadius: "50%",
				background: "var(--dsw-alias-brand-primary)"
			}
		}),
		h("span", { key: "text", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, t("picker.bar.hint")),
		oneShotRef?.current === true
			? h("span", { key: "oneshot", style: { ...S.chip, flex: "none" } }, t("picker.oneShot"))
			: null,
		h("button", {
			key: "stop",
			type: "button",
			onClick: onStop,
			style: { ...S.button, ...S.buttonPrimary, flex: "none" }
		}, t("picker.stop"))
	]);
}

/**
 * Render the picking bar, or nothing when it is not usable.
 *
 * Guarded on three separate things — not picking, no host node, no `createPortal`
 * on the shell's React — because a missing portal must degrade to "no bar" (the
 * panel still works, Esc still works) rather than to a thrown component that the
 * settings shell would surface as a broken section.
 */
function renderPickerBar(t, picking, onStop, oneShotRef) {
	if (picking !== true) return null;
	const host = panelApi.barHost;
	if (host === null || host === undefined) return null;
	const portal = _reactDom?.createPortal;
	if (typeof portal !== "function") return null;
	return portal(h(PickerBar, { t, oneShotRef, onStop }), host);
}

/**
 * The visual picker tab.
 *
 * The document-level interaction lives in the plugin body (`startPicking` /
 * `stopPicking`); this component owns only the draft rule and the panel state,
 * and wires itself in through the callbacks those functions read.
 */
function PickerTab({ t: rawT, config, commit, startPicking, stopPicking, picker }) {
	const t = translatorFor(rawT);
	/** The rule currently being authored, or null when nothing was selected. */
	const [draft, setDraft] = _react.useState(null);
	const [picking, setPicking] = _react.useState(false);
	const [hoverInfo, setHoverInfo] = _react.useState(null);
	const [oneShot, setOneShot] = _react.useState(true);
	const [outlineColor, setOutlineColor] = _react.useState(picker?.color ?? "#4d93f8");
	/**
	 * This section's own root node. Picking hides the settings modal, and the
	 * modal is reached from here through the DOM (`role="dialog"` ancestor) rather
	 * than by a class name the shell hashes per build.
	 */
	const rootRef = _react.useRef(null);
	/** Latest one-shot choice, read by the engine's click handler at pick time. */
	const oneShotRef = _react.useRef(true);
	/**
	 * The live draft, mirrored outside React state.
	 *
	 * Picking hides the modal that hosts this component, and hiding it can make
	 * the shell unmount the section; when the modal comes back, the component
	 * remounts with fresh state. Holding the picked element here means the draft
	 * survives that round trip instead of being lost between the pick and the
	 * panel's return.
	 */
	const draftRef = _react.useRef(null);

	/** Publish a draft to both the ref and React state. */
	const putDraft = (next) => {
		draftRef.current = next;
		setDraft(next);
	};

	// The engine's callbacks live for as long as the plugin does, because the
	// modal can be hidden (and this component unmounted) while picking is active.
	// Everything they need that changes per render is read through a ref.
	_react.useEffect(() => {
		picker.oneShot = oneShot;
		picker.oneShotRef = oneShotRef;
		picker.onPick = (element) => {
			const resolved = resolveElement(element);
			putDraft({
				id: makeId(),
				selector: resolved.selector,
				label: resolved.label,
				tag: resolved.tag,
				computed: resolved.computed,
				declarations: []
			});
			setHoverInfo(null);
		};
		picker.onHover = (element) => {
			setHoverInfo(element === null ? null : resolveElement(element));
		};
		picker.onStop = () => setPicking(false);
		picker.onRefused = () => {
			showToast(t("picker.refused"));
		};
		// Deliberately NOT nulled on unmount: the modal can be unmounted while
		// picking is still running, and losing the callback at that moment would
		// silently drop the user's pick.
	}, [picker, oneShot]);

	// Adopt a draft picked while this component was unmounted.
	_react.useEffect(() => {
		if (draftRef.current !== null && draft === null) setDraft(draftRef.current);
	});

	// Leaving the tab must not leave the page in picking mode.
	_react.useEffect(() => () => stopPicking(), [stopPicking]);

	const togglePicking = () => {
		if (picking) {
			stopPicking();
			setPicking(false);
			return;
		}
		oneShotRef.current = oneShot;
		startPicking(rootRef.current);
		setPicking(true);
	};

	const updateDraftDeclaration = (index, patch) => {
		setDraft((current) => {
			if (current === null) return current;
			const declarations = current.declarations.map((entry, position) => (
				position === index ? { ...entry, ...patch } : entry
			));
			return { ...current, declarations };
		});
	};

	const addDeclaration = () => {
		setDraft((current) => {
			if (current === null) return current;
			const used = new Set(current.declarations.map((entry) => entry.property));
			const next = PROPERTY_SPECS.find((spec) => !used.has(spec.name)) ?? PROPERTY_SPECS[0];
			const computedValue = current.computed?.[next.name] ?? "";
			return {
				...current,
				declarations: [...current.declarations, { property: next.name, value: computedValue }]
			};
		});
	};

	const saveDraft = () => {
		if (draft === null) return;
		const declarations = draft.declarations
			.filter((entry) => String(entry.value ?? "").trim() !== "")
			.map((entry) => qualify(entry.property, entry.value));
		if (declarations.length === 0) return;
		commit((state) => {
			const existing = state.rules.findIndex((rule) => rule.selector === draft.selector);
			const next = {
				id: draft.id,
				selector: draft.selector,
				label: draft.label,
				declarations
			};
			if (existing >= 0) state.rules[existing] = next;
			else state.rules.push(next);
		});
		setDraft(null);
	};

	/** Selector match count, so the user can see whether their edit will land. */
	const matchCount = (() => {
		if (draft === null) return 0;
		try {
			return document.querySelectorAll(draft.selector).length;
		} catch {
			return -1;
		}
	})();

	return h("div", { ref: rootRef, style: S.column }, [
		// While picking, this whole panel is hidden behind the modal we concealed,
		// so the only reachable affordance is the floating bar portalled outside it.
		renderPickerBar(t, picking, stopPicking, oneShotRef),
		h(Group, {
			key: "pick",
			title: t("picker.title"),
			help: t("picker.hint"),
			children: [
				h("div", { key: "actions", style: S.row }, [
					h(Button, {
						key: "toggle",
						variant: picking ? "danger" : "primary",
						onClick: togglePicking,
						children: picking ? t("picker.stop") : t("picker.start")
					}),
					h(Toggle, {
						key: "oneshot",
						label: t("picker.oneShot"),
						hint: t("picker.oneShotHint"),
						checked: oneShot,
						onChange: setOneShot
					}),
					h(ColorControl, {
						key: "color",
						value: outlineColor,
						ariaLabel: t("picker.outline"),
						onChange: (value) => {
							setOutlineColor(value);
							// The engine reads this live on every pointer move.
							if (picker !== null && picker !== undefined) picker.color = value;
						}
					})
				]),
				picking ? h("div", { key: "hint", style: { ...S.hint, color: "var(--dsw-alias-brand-primary)" } }, t("picker.esc")) : null,
				hoverInfo === null ? null : h("div", { key: "hover", style: { ...S.code, ...S.hint } }, `${hoverInfo.tag} — ${hoverInfo.selector}`)
			]
		}),
		draft === null ? null : h(DraftEditor, {
			key: "draft",
			t,
			draft,
			matchCount,
			onChangeSelector: (selector) => setDraft((current) => (current === null ? current : { ...current, selector })),
			onAdd: addDeclaration,
			onUpdate: updateDraftDeclaration,
			onRemove: (index) => setDraft((current) => (current === null ? current : {
				...current,
				declarations: current.declarations.filter((_, position) => position !== index)
			})),
			onCancel: () => setDraft(null),
			onSave: saveDraft
		}),
		h(Group, {
			key: "rules",
			last: true,
			title: t("picker.rules"),
			children: config.rules.length === 0
				? [h("div", { key: "empty", style: S.hint }, t("picker.empty"))]
				: config.rules.map((rule) => h(RuleCard, {
					key: rule.id,
					t,
					rule,
					onRemove: () => commit((state) => {
						state.rules = state.rules.filter((candidate) => candidate.id !== rule.id);
					}),
					onEdit: () => setDraft({
						id: rule.id,
						selector: rule.selector,
						label: rule.label,
						tag: (rule.label ?? "").split(" ")[0] ?? "",
						computed: readComputed(document.querySelector(rule.selector) ?? document.body, PROPERTY_SPECS.map((spec) => spec.name)),
						declarations: rule.declarations.map((entry) => ({ ...entry }))
					})
				}))
		})
	]);
}

/** The editor for one in-progress rule. */
function DraftEditor({ t, draft, matchCount, onChangeSelector, onAdd, onUpdate, onRemove, onCancel, onSave }) {
	return h("div", { style: { ...S.card, gap: "10px" } }, [
		h("div", { key: "head", style: S.row }, [
			h("span", { key: "title", style: { ...S.groupTitle, flex: "1 1 auto" } }, t("picker.selected")),
			h("span", { key: "label", style: S.chip }, draft.label)
		]),
		h("div", { key: "selector", style: S.column }, [
			h("div", { style: { ...S.row, gap: "4px" } }, [t("picker.selector"), h(HelpDot, { text: t("picker.selectorHint") })]),
			h(TextInput, {
				key: "input",
				value: draft.selector,
				onChange: onChangeSelector,
				ariaLabel: t("picker.selector"),
				style: { fontFamily: "var(--ds-font-family-code)" }
			}),
			matchCount < 0
				? h("div", { key: "bad", style: S.danger }, t("picker.noMatch"))
				: h("div", { key: "count", style: matchCount === 0 ? S.warning : S.hint }, t("picker.matches", { n: matchCount }))
		]),
		h("div", { key: "decls", style: S.column }, [
			...draft.declarations.map((declaration, index) => h(DeclarationRow, {
				key: `${declaration.property}-${index}`,
				t,
				declaration,
				computed: draft.computed?.[declaration.property] ?? "",
				onChange: (patch) => onUpdate(index, patch),
				onRemove: () => onRemove(index)
			})),
			h("div", { key: "add", style: S.row }, [
				h(Button, { onClick: onAdd, children: `+ ${t("picker.addDeclaration")}` })
			])
		]),
		h("div", { key: "actions", style: S.row }, [
			h(Button, { key: "save", variant: "primary", onClick: onSave, children: t("common.apply"), disabled: draft.declarations.length === 0 }),
			h(Button, { key: "cancel", onClick: onCancel, children: t("common.cancel") })
		])
	]);
}

/** One authored declaration: property picker, value control, computed hint. */
function DeclarationRow({ t, declaration, computed, onChange, onRemove }) {
	const spec = PROPERTY_BY_NAME.get(declaration.property);
	return h("div", { style: { ...S.row, gap: "6px", alignItems: "flex-start" } }, [
		h("select", {
			key: "property",
			value: declaration.property,
			"aria-label": t("picker.property"),
			onChange: (event) => onChange({ property: event.target.value }),
			style: { ...S.select, flex: "0 0 45%" }
		}, PROPERTY_SPECS.map((candidate) => h("option", {
			key: candidate.name,
			value: candidate.name,
			children: `${t(candidate.label)} · ${candidate.name}`
		}))),
		h(ValueControl, {
			key: "value",
			t,
			spec,
			value: declaration.value,
			computed,
			onChange: (value) => onChange({ value })
		}),
		h(Button, { key: "remove", variant: "danger", onClick: onRemove, children: "×", title: t("common.remove") })
	]);
}

/** The value editor for one declaration, chosen by the property's kind. */
function ValueControl({ t, spec, value, computed, onChange }) {
	if (spec !== undefined && spec.kind === "color") {
		return h(ColorControl, {
			key: "value",
			value,
			computed,
			ariaLabel: t("picker.value"),
			onChange
		});
	}
	if (spec !== undefined && spec.kind === "enum") {
		return h("select", {
			key: "value",
			value,
			"aria-label": t("picker.value"),
			onChange: (event) => onChange(event.target.value),
			style: { ...S.select, flex: "1 1 auto" }
		}, [h("option", { key: "", value: "", children: "—" }), ...spec.values.map((option) => h("option", {
			key: option,
			value: option,
			children: option
		}))]);
	}
	if (spec !== undefined && spec.kind === "weight") {
		return h("select", {
			key: "value",
			value,
			"aria-label": t("picker.value"),
			onChange: (event) => onChange(event.target.value),
			style: { ...S.select, flex: "1 1 auto" }
		}, ["", "300", "400", "500", "600", "700", "800"].map((option) => h("option", {
			key: option,
			value: option,
			children: option === "" ? "—" : option
		})));
	}
	return h("div", { key: "value", style: { flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" } }, [
		h(TextInput, {
			key: "input",
			value,
			onChange,
			placeholder: computed === "" ? t("picker.value") : computed,
			ariaLabel: t("picker.value"),
			style: { width: "100%", fontFamily: "var(--ds-font-family-code)" }
		}),
		computed === "" ? null : h("div", {
			key: "computed",
			style: { ...S.hint, fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
			title: `${t("picker.computed")}: ${computed}`
		}, `${t("picker.computed")}: ${computed}`)
	]);
}

/**
 * A color editor: a native swatch plus a free-text field.
 *
 * Native `<input type="color">` cannot express `transparent`, `currentColor`,
 * or a gradient, so the text field stays the source of truth and the swatch is
 * a convenience that writes a concrete hex when the current value is one.
 */
function ColorControl({ value, computed, onChange, ariaLabel }) {
	const hex = normalizeHex(value) || normalizeHex(computed) || "#888888";
	return h("div", { style: { ...S.row, gap: "4px", flex: "1 1 auto", minWidth: 0 } }, [
		h("input", {
			key: "swatch",
			type: "color",
			value: hex,
			"aria-label": ariaLabel,
			onChange: (event) => onChange(event.target.value),
			style: {
				width: "28px",
				height: "26px",
				padding: 0,
				flex: "none",
				border: "1px solid var(--dsw-alias-border-l2)",
				borderRadius: "6px",
				background: "transparent",
				cursor: "pointer"
			}
		}),
		h(TextInput, {
			key: "text",
			value,
			onChange,
			placeholder: computed ?? "",
			ariaLabel,
			style: { flex: "1 1 auto", fontFamily: "var(--ds-font-family-code)" }
		})
	]);
}

/** One saved rule in the list. */
function RuleCard({ t, rule, onRemove, onEdit }) {
	const summary = rule.declarations.map((entry) => `${entry.property}: ${entry.value}`).join("; ");
	return h("div", { style: S.card }, [
		h("div", { key: "head", style: { ...S.row, justifyContent: "space-between" } }, [
			h("span", { key: "label", style: { ...S.chip, ...S.chipAccent } }, rule.label ?? rule.selector),
			h("div", { key: "actions", style: S.row }, [
				h(Button, { key: "edit", onClick: onEdit, children: t("common.apply") }),
				h(Button, { key: "remove", variant: "danger", onClick: onRemove, children: t("common.remove") })
			])
		]),
		h("code", { key: "selector", style: { ...S.code, wordBreak: "break-all" } }, rule.selector),
		summary === "" ? null : h("div", { key: "summary", style: { ...S.hint, fontFamily: "var(--ds-font-family-code)", wordBreak: "break-all" } }, summary)
	]);
}

// ── tab: design tokens ──────────────────────────────────────────────────────

/** Windows/`type="color"`-friendly fields, grouped by their semantic family. */
const TOKEN_GROUP_ORDER = [
	"brand", "button", "interactive", "label", "border", "background",
	"markdown", "scrollbar", "state", "overlay", "link",
	"alias", "specific", "shadow", "typography", "static", "other"
];

/**
 * The design-token override panel.
 *
 * Backed by the token catalog extracted from the shipped
 * `design-platform.css`, so every row states the token's real shipped value as
 * its placeholder. Writes go into the plugin's own CSS layer (not
 * `ctx.theme.overrideTokens`) so they survive a theme switch, stay visible in
 * the exported JSON, and remain removable by the master switch.
 */
function VarsTab({ t: rawT, config, commit }) {
	const t = translatorFor(rawT);
	const [query, setQuery] = _react.useState("");
	const [openGroups, setOpenGroups] = _react.useState({ brand: true, background: true, label: true });

	/** token name → the user's override entry. */
	const overrides = new Map(config.vars.map((entry) => [entry.name, entry]));

	const needle = query.trim().toLowerCase();
	const entries = (TOKENS.aliases ?? []).filter((entry) => needle === "" || entry.name.toLowerCase().includes(needle));

	/** The user's own variables that are not in the shipped catalog. */
	const custom = config.vars.filter((entry) => !CATALOG_BY_NAME.has(entry.name));

	const setOverride = (name, scheme, value) => {
		commit((state) => {
			const existing = state.vars.find((entry) => entry.name === name);
			if (existing === undefined) {
				// Mirror the stated value onto the other scheme so the token never
				// goes illegible when the palette flips — the same rule the
				// composer applies for one-sided entries.
				state.vars.push({ name, light: scheme === "light" ? value : value, dark: scheme === "dark" ? value : value });
				return;
			}
			existing[scheme] = value;
		});
	};

	const clearOverride = (name) => {
		commit((state) => {
			state.vars = state.vars.filter((entry) => entry.name !== name);
		});
	};

	const addCustom = () => {
		const name = globalThis.prompt?.(t("vars.customName"), "--");
		if (typeof name !== "string") return;
		const trimmed = name.trim();
		if (!/^--[\w-]+$/.test(trimmed)) {
			showToast(t("vars.customName"));
			return;
		}
		setOverride(trimmed, "light", "#888888");
	};

	/** Group the visible catalog entries, preserving TOKEN_GROUP_ORDER. */
	const grouped = new Map();
	for (const entry of entries) {
		const group = entry.group ?? "other";
		if (!grouped.has(group)) grouped.set(group, []);
		grouped.get(group).push(entry);
	}
	const orderedGroups = [...grouped.keys()].sort((a, b) => {
		const left = TOKEN_GROUP_ORDER.indexOf(a);
		const right = TOKEN_GROUP_ORDER.indexOf(b);
		return (left < 0 ? 999 : left) - (right < 0 ? 999 : right);
	});

	return h("div", { style: S.column }, [
		h(Group, {
			key: "head",
			title: t("vars.title"),
			help: t("vars.hint"),
			children: [
				h("div", { key: "search", style: S.row }, [
					h(TextInput, {
						key: "query",
						value: query,
						onChange: setQuery,
						placeholder: t("vars.search"),
						ariaLabel: t("vars.search"),
						style: { flex: "1 1 auto" }
					}),
					h("span", { key: "count", style: S.chip }, t("vars.count", { n: entries.length })),
					h(Button, { key: "add", onClick: addCustom, children: `+ ${t("vars.customAdd")}` })
				])
			]
		}),
		custom.length === 0 ? null : h(Group, {
			key: "custom",
			title: t("vars.customAdd"),
			children: custom.map((entry) => h(TokenRow, {
				key: entry.name,
				t,
				name: entry.name,
				entry: { name: entry.name, light: "", dark: "" },
				override: entry,
				onChange: (scheme, value) => setOverride(entry.name, scheme, value),
				onClear: () => clearOverride(entry.name)
			}))
		}),
		...orderedGroups.map((group) => {
			const open = openGroups[group] === true;
			const groupEntries = grouped.get(group);
			const overridden = groupEntries.filter((entry) => overrides.has(entry.name)).length;
			return h(Group, {
				key: group,
				title: h("button", {
					type: "button",
					onClick: () => setOpenGroups((current) => ({ ...current, [group]: !open })),
					style: { ...S.button, border: "none", background: "transparent", padding: "0 4px", display: "flex", gap: "6px" }
				}, [
					h("span", { key: "arrow", style: { width: "10px", display: "inline-block" } }, open ? "▾" : "▸"),
					h("span", { key: "name" }, t(`vars.group.${group}`)),
					h("span", { key: "count", style: S.chip }, String(groupEntries.length)),
					overridden === 0 ? null : h("span", { key: "on", style: { ...S.chip, ...S.chipAccent } }, `${overridden} ${t("vars.overridden")}`)
				]),
				children: open ? [
					h("div", { key: "list", style: S.scrollBox }, groupEntries.map((entry) => h(TokenRow, {
						key: entry.name,
						t,
						name: entry.name,
						entry,
						override: overrides.get(entry.name),
						onChange: (scheme, value) => setOverride(entry.name, scheme, value),
						onClear: () => clearOverride(entry.name)
					})))
				] : []
			});
		}),
		orderedGroups.length === 0 && custom.length === 0
			? h("div", { key: "empty", style: { ...S.hint, padding: "12px 0" } }, t("common.empty"))
			: null
	]);
}

/**
 * One token row: name, shipped defaults, and a light/dark value pair.
 *
 * The color swatches are driven from the LIVE computed value when the token is
 * not overridden, so the panel shows what is actually on screen (accounting for
 * whatever theme plugin is active) rather than the shipped default.
 */
function TokenRow({ t, name, entry, override, onChange, onClear }) {
	const [expanded, setExpanded] = _react.useState(false);
	const overridden = override !== undefined && override !== null;
	const color = looksLikeColor(entry);
	const lightValue = overridden ? override.light : "";
	const darkValue = overridden ? override.dark : "";

	// Resolve the live value lazily, only while the row is open, so a 160-row
	// list does not force 320 layout reads on every render.
	const live = _react.useMemo(() => {
		if (!expanded) return { light: "", dark: "" };
		try {
			return { light: liveTokenValue(name, "light"), dark: liveTokenValue(name, "dark") };
		} catch {
			return { light: "", dark: "" };
		}
	}, [expanded, name]);

	return h("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "6px",
			padding: "6px 4px",
			borderBottom: "1px solid var(--dsw-alias-border-l2)"
		}
	}, [
		h("div", { key: "head", style: { ...S.row, gap: "6px", cursor: "pointer" }, onClick: () => setExpanded(!expanded) }, [
			h("span", {
				key: "arrow",
				style: { width: "10px", flex: "none", color: "var(--dsw-alias-label-tertiary)" }
			}, expanded ? "▾" : "▸"),
			color ? h("span", {
				key: "swatch",
				style: {
					width: "14px",
					height: "14px",
					flex: "none",
					borderRadius: "3px",
					border: "1px solid var(--dsw-alias-border-l2)",
					background: `var(${name}, ${entry.light || "transparent"})`
				}
			}) : null,
			h("code", {
				key: "name",
				style: { ...S.code, flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
				title: name
			}, name.replace(/^--dsw-alias-/, "")),
			overridden ? h("span", { key: "badge", style: { ...S.chip, ...S.chipAccent } }, t("vars.overridden")) : null
		]),
		expanded ? h("div", { key: "body", style: { ...S.column, gap: "6px", paddingLeft: "16px" } }, [
			entry.light === "" ? null : h("div", { key: "defaults", style: { ...S.hint, fontFamily: "var(--ds-font-family-code)", wordBreak: "break-all" } },
				`${t("vars.defaultLight")}: ${entry.light}${entry.dark === entry.light ? "" : `   ·   ${t("vars.defaultDark")}: ${entry.dark}`}`),
			live.light === "" ? null : h("div", { key: "live", style: { ...S.hint, fontFamily: "var(--ds-font-family-code)" } }, `live: ${live.light}`),
			h("div", { key: "light", style: S.row }, [
				h("span", { key: "label", style: { flex: "0 0 48px" } }, t("vars.light")),
				color ? h(ColorControl, {
					key: "control",
					value: lightValue,
					computed: live.light || entry.light,
					ariaLabel: `${name} ${t("vars.light")}`,
					onChange: (value) => onChange("light", value)
				}) : h(TextInput, {
					key: "control",
					value: lightValue,
					onChange: (value) => onChange("light", value),
					placeholder: entry.light,
					ariaLabel: `${name} ${t("vars.light")}`,
					style: { flex: "1 1 auto", fontFamily: "var(--ds-font-family-code)" }
				})
			]),
			h("div", { key: "dark", style: S.row }, [
				h("span", { key: "label", style: { flex: "0 0 48px" } }, t("vars.dark")),
				color ? h(ColorControl, {
					key: "control",
					value: darkValue,
					computed: live.dark || entry.dark,
					ariaLabel: `${name} ${t("vars.dark")}`,
					onChange: (value) => onChange("dark", value)
				}) : h(TextInput, {
					key: "control",
					value: darkValue,
					onChange: (value) => onChange("dark", value),
					placeholder: entry.dark,
					ariaLabel: `${name} ${t("vars.dark")}`,
					style: { flex: "1 1 auto", fontFamily: "var(--ds-font-family-code)" }
				})
			]),
			h("div", { key: "actions", style: S.row }, [
				h(Button, { key: "clear", variant: "danger", onClick: onClear, disabled: !overridden, children: t("common.reset") }),
				h(Button, {
					key: "copy",
					onClick: () => {
						void copyText(`var(${name})`).then((ok) => showToast(ok ? t("common.copied") : t("common.copyFailed")));
					},
					children: t("common.copy")
				})
			])
		]) : null
	]);
}

// ── tab: density & layout ───────────────────────────────────────────────────

/** The density/typography sliders. */
function LayoutTab({ t: rawT, config, commit }) {
	const t = translatorFor(rawT);

	const format = (spec, value) => {
		if (spec.format === "px") return `${Math.round(value)}px`;
		return `${Math.round(value * 100)}%`;
	};

	return h("div", { style: S.column }, [
		h(Group, {
			key: "sliders",
			title: t("tab.layout"),
			help: t("layout.hint"),
			children: [
				h("div", { key: "preview", style: S.hint }, t("layout.preview")),
				...KNOB_SPECS.map((spec) => h(Slider, {
					key: spec.key,
					label: t(spec.label),
					hint: t(spec.hint),
					min: spec.min,
					max: spec.max,
					step: spec.step,
					value: config.knobs[spec.key],
					display: format(spec, config.knobs[spec.key]),
					onChange: (value) => commit((draft) => {
						draft.knobs[spec.key] = value;
					})
				}))
			]
		}),
		h(Group, {
			key: "reset",
			last: true,
			children: [
				h(Button, {
					key: "reset",
					onClick: () => commit((draft) => {
						draft.knobs = { ...DEFAULT_KNOBS };
					}),
					children: t("layout.resetAll")
				})
			]
		})
	]);
}

// ── tab: presets & sharing ──────────────────────────────────────────────────

/** Preset packs, export/import, and the reset-everything path. */
function PresetsTab({ t: rawT, config, commit, host }) {
	const t = translatorFor(rawT);
	const [paste, setPaste] = _react.useState("");
	const fileRef = _react.useRef(null);

	const applyPresetById = (presetId) => {
		commit((draft) => {
			const next = applyPreset(draft, presetId);
			draft.enabled = next.enabled;
			draft.css = next.css;
			draft.knobs = next.knobs;
			draft.vars = next.vars;
			draft.preset = next.preset;
		});
	};

	const exportConfig = () => {
		const payload = {
			format: "dsh-custom-style",
			version: 1,
			exportedAt: new Date().toISOString(),
			config: {
				enabled: config.enabled,
				css: config.css,
				rules: config.rules,
				vars: config.vars,
				knobs: config.knobs,
				preset: config.preset
			}
		};
		downloadFile(`dsh-custom-style-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
	};

	/** Adopt an imported payload, accepting either the envelope or a bare config. */
	const importPayload = (text) => {
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			showToast(`${t("common.importFailed")}: JSON`);
			return;
		}
		const candidate = parsed !== null && typeof parsed === "object" && parsed.config !== undefined ? parsed.config : parsed;
		if (candidate === null || typeof candidate !== "object") {
			showToast(`${t("common.importFailed")}: shape`);
			return;
		}
		if (!globalThis.confirm?.(t("presets.importConfirm"))) return;
		commit((draft) => {
			const next = normalizeState(candidate);
			draft.enabled = next.enabled;
			draft.css = next.css;
			draft.rules = next.rules;
			draft.vars = next.vars;
			draft.knobs = next.knobs;
			draft.preset = next.preset;
		});
		setPaste("");
		showToast(t("presets.imported"));
	};

	const onFileChosen = (event) => {
		const file = event.target.files?.[0];
		if (file === undefined) return;
		const reader = new FileReader();
		reader.onload = () => importPayload(String(reader.result ?? ""));
		reader.readAsText(file);
		// Allow re-choosing the same file.
		event.target.value = "";
	};

	const resetEverything = async () => {
		if (!globalThis.confirm?.(t("presets.resetAllConfirm"))) return;
		commit((draft) => {
			const fresh = defaultState();
			draft.enabled = fresh.enabled;
			draft.css = fresh.css;
			draft.rules = fresh.rules;
			draft.vars = fresh.vars;
			draft.knobs = fresh.knobs;
			draft.preset = fresh.preset;
		});
		try {
			await host.reset();
		} catch {
			// The next push overwrites the file anyway; a failed reset is benign.
		}
		showToast(t("presets.resetDone"));
	};

	return h("div", { style: S.column }, [
		h(Group, {
			key: "presets",
			title: t("presets.title"),
			help: t("presets.hint"),
			children: [
				h("div", {
					key: "grid",
					style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px" }
				}, PRESETS.map((preset) => h("div", {
					key: preset.id,
					style: config.preset === preset.id ? { ...S.card, ...S.cardActive } : S.card
				}, [
					h("div", { key: "name", style: { ...S.row, justifyContent: "space-between" } }, [
						h("span", { key: "label", style: { color: "var(--dsw-alias-label-primary)", fontSize: "13px" } }, t(preset.name)),
						config.preset === preset.id ? h("span", { key: "badge", style: { ...S.chip, ...S.chipAccent } }, t("presets.applied")) : null
					]),
					h("div", { key: "desc", style: S.hint }, t(preset.description)),
					h("div", { key: "action", style: S.row }, [
						h(Button, { onClick: () => applyPresetById(preset.id), children: t("presets.apply") })
					])
				])))
			]
		}),
		h(Group, {
			key: "export",
			title: t("presets.export"),
			help: t("presets.exportHint"),
			children: [
				h(Button, { key: "export", variant: "primary", onClick: exportConfig, children: t("presets.export") })
			]
		}),
		h(Group, {
			key: "import",
			title: t("presets.import"),
			help: t("presets.importHint"),
			children: [
				h("div", { key: "file", style: S.row }, [
					h("input", {
						key: "input",
						ref: fileRef,
						type: "file",
						accept: "application/json,.json",
						onChange: onFileChosen,
						style: { display: "none" }
					}),
					h(Button, {
						key: "choose",
						onClick: () => fileRef.current?.click(),
						children: t("presets.importFile")
					})
				]),
				h("textarea", {
					key: "paste",
					value: paste,
					placeholder: t("presets.importPaste"),
					"aria-label": t("presets.importPaste"),
					onChange: (event) => setPaste(event.target.value),
					style: {
						width: "100%",
						minHeight: "96px",
						boxSizing: "border-box",
						padding: "8px",
						borderRadius: "10px",
						border: "1px solid var(--dsw-alias-border-l2)",
						background: "var(--dsw-alias-bg-layer-1, transparent)",
						color: "var(--dsw-alias-label-primary)",
						fontFamily: "var(--ds-font-family-code)",
						fontSize: "12px",
						lineHeight: "18px",
						outline: "none",
						resize: "vertical"
					}
				}),
				h(Button, {
					key: "apply",
					variant: "primary",
					disabled: paste.trim() === "",
					onClick: () => importPayload(paste),
					children: t("presets.importApply")
				})
			]
		}),
		h(Group, {
			key: "danger",
			last: true,
			title: t("presets.danger"),
			children: [
				h(Button, { key: "reset", variant: "danger", onClick: () => void resetEverything(), children: t("presets.resetAll") })
			]
		})
	]);
}

// ── the settings section ────────────────────────────────────────────────────

/**
 * The plugin's settings page: header, master switch, tab strip, active tab.
 *
 * The five tabs are rendered in place rather than piped through a nested slot.
 * A `settings.section` seat is a single nav entry that owns its whole content
 * column, and the sibling tabs share one store and one locale namespace — so a
 * child slot would add a registration each and still leave the section deciding
 * which one is visible. Rendering them directly keeps the plugin to one nav
 * entry and one registration.
 */
function Section({ t: rawT }) {
	const t = translatorFor(rawT);
	const [active, setActive] = _react.useState("css");
	// Subscribe unconditionally (hooks may not be conditional); the null store
	// only occurs before `apply` installs it, and then nothing renders.
	const config = useStoreValue(
		panelApi.store === null ? noopSubscribe : panelApi.store.subscribe,
		panelApi.store === null ? emptyConfig : panelApi.store.get
	);
	if (panelApi.store === null) return null;

	/** tab id → label key and renderer. */
	const TABS = [
		["css", "tab.css"],
		["picker", "tab.picker"],
		["vars", "tab.vars"],
		["layout", "tab.layout"],
		["presets", "tab.presets"]
	];
	const commit = panelApi.commit;
	const content = {
		css: h(CssTab, { key: "css", t, config, commit }),
		picker: h(PickerTab, {
			key: "picker",
			t,
			config,
			commit,
			startPicking: () => panelApi.startPicking(),
			stopPicking: () => panelApi.stopPicking(),
			picker: panelApi.picker
		}),
		vars: h(VarsTab, { key: "vars", t, config, commit }),
		layout: h(LayoutTab, { key: "layout", t, config, commit }),
		presets: h(PresetsTab, { key: "presets", t, config, commit, host: panelApi.host })
	};

	return h("div", { style: S.root, "data-dcs-ui": "1" }, [
		h("div", { key: "header", style: S.header }, [
			h("div", { key: "title", style: S.title }, t("section.title")),
			h("div", { key: "subtitle", style: S.subtitle }, t("section.subtitle"))
		]),
		h("div", { key: "master", style: { paddingBottom: "12px" } }, [
			h(MasterRow, { t, config })
		]),
		h("div", { key: "tabs", style: S.tabs, role: "tablist" }, TABS.map(([id, labelKey]) => h("button", {
			key: id,
			type: "button",
			role: "tab",
			onClick: () => setActive(id),
			"aria-selected": active === id,
			style: active === id ? { ...S.tab, ...S.tabActive } : S.tab,
			children: t(labelKey)
		}))),
		h("div", { key: "content", style: { paddingTop: "4px" } }, [content[active] ?? null])
	]);
}

// ── test handle ─────────────────────────────────────────────────────────────

/**
 * The pure surface, published so the behavior suite can assert against the
 * SHIPPED bundle instead of a reimplementation of its logic.
 *
 * The sentinel comment is load-bearing: `tools/build-client.mjs` recognizes it,
 * strips this declaration out of the factory body, and re-adds the object to the
 * module's real `exports` — failing the build outright if the sentinel is gone,
 * so the tests can never silently drift away from the artifact users install.
 */
const testHandle = /* @__TEST_HANDLE__ */ {
	SETTINGS_NS,
	API_PATH,
	PLUGIN_ID,
	CACHE_KEY,
	WIRE_KEYS,
	DEFAULT_KNOBS,
	KNOB_SPECS,
	PROPERTY_SPECS,
	PRESETS,
	defaultState,
	normalizeState,
	encodeState,
	decodeWire,
	composeCss,
	densityLayer,
	variableLayer,
	ruleLayer,
	ruleToCss,
	qualify,
	needsUnit,
	clampKnob,
	applyPreset,
	cssBalance,
	escapeIdent,
	escapeAttributeValue,
	isHashedClass,
	fill,
	normalizeHex,
	/** The live panel bindings, so a test can drive the store directly. */
	panel: panelApi,
	/** Selector generation and computed-value reading, for DOM-backed tests. */
	buildSelector,
	resolveElement,
	/** The picking bar's portal decision, asserted directly by the DOM suite. */
	renderPickerBar,
	/** The bar component itself, so its copy and controls can be rendered. */
	PickerBar,
	/** Modal-layer resolution, asserted directly by the modal suite. */
	findModalOverlay,
	hideModal,
	showModal
};
