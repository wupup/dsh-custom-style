/**
 * Extract the `--dsw-*` design-token catalog from the shipped
 * `@deepseek-ai/dsh-client-ui-theme` client bundle.
 *
 * The bundle inlines each stylesheet as a JSON string literal; the raw
 * `.css` files are not published. This script recovers the
 * `design-platform.css` sheet, parses its `body` (light) and
 * `body[data-ds-dark-theme]` (dark) declaration blocks, and writes a
 * catalog of every token with its shipped default per scheme.
 *
 * Writes `lib/tokens.json` directly (a shell redirect would re-encode it as
 * UTF-16 on Windows PowerShell).
 *
 * Run: node tools/extract-tokens.mjs
 * (Regenerate when the DSH version changes.)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

/** The plugin root, derived from this script's own location. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const require = createRequire(import.meta.url);

/** The bundle path relative to an installed DSH tree. */
const BUNDLE_REL = "@deepseek-ai/dsh-client-ui-theme/lib/client.js";

/** Whether a directory is a DSH install root (has the CLI manifest). */
function isDshRoot(dir) {
	return existsSync(join(dir, "package.json")) && existsSync(join(dir, "lib", "bin.js"));
}

/** Directories that commonly hold the installed DSH CLI on this machine. */
function candidateRoots() {
	const roots = [];
	if (process.env.DSH_INSTALL_DIR) roots.push(process.env.DSH_INSTALL_DIR);
	// `npm root -g` names the global node_modules directory; the CLI lives one
	// level deeper under @deepseek-ai/dsh.
	try {
		const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: true }).trim();
		roots.push(join(globalRoot, "@deepseek-ai", "dsh"));
	} catch {
		// npm unavailable — the remaining candidates still apply
	}
	// node_modules/@deepseek-ai/dsh relative to a global npm prefix.
	if (process.env.APPDATA) roots.push(join(process.env.APPDATA, "npm", "node_modules", "@deepseek-ai", "dsh"));
	// A local install inside this plugin's own tree.
	roots.push(join(process.cwd(), "node_modules", "@deepseek-ai", "dsh"));
	return roots;
}

/** Absolute path of the theme client bundle inside the installed DSH tree. */
function bundlePath() {
	// 1. Normal module resolution — works when DSH is a dependency here, or when
	//    running from inside the DSH checkout via `pnpm run`.
	for (const specifier of ["@deepseek-ai/dsh-client-ui-theme/lib/client.js", `@deepseek-ai/dsh/node_modules/${BUNDLE_REL}`]) {
		try {
			return require.resolve(specifier);
		} catch {
			// try the next strategy
		}
	}
	// 2. Walk the known install roots. The theme package is a dependency of the
	//    CLI, so it sits in the CLI's own nested node_modules.
	for (const root of candidateRoots()) {
		if (!isDshRoot(root)) continue;
		for (const nested of [join("node_modules", BUNDLE_REL), BUNDLE_REL]) {
			const direct = join(root, nested);
			if (existsSync(direct)) return direct;
			const hoisted = join(root, "..", BUNDLE_REL);
			if (existsSync(hoisted)) return hoisted;
		}
	}
	throw new Error(
		"cannot locate @deepseek-ai/dsh-client-ui-theme/lib/client.js — is DSH installed? "
		+ "Set DSH_INSTALL_DIR to the @deepseek-ai/dsh directory to override."
	);
}

const source = readFileSync(bundlePath(), "utf8");

/**
 * Recover one inlined stylesheet by its marker comment.
 * The bundle names each sheet in a `//#region ... <file>.css.mjs` comment.
 */
function inlineSheet(fileName) {
	const marker = new RegExp(`//#region [^\\n]*${fileName.replace(".", "\\.")}\\.mjs\\r?\\n\\s*var \\w+ = ("(?:[^"\\\\]|\\\\.)*")`);
	const match = marker.exec(source);
	if (match === null) throw new Error(`stylesheet ${fileName} not found in bundle`);
	return JSON.parse(match[1]);
}

/** Parse `selector{...}` blocks out of a flat sheet, in source order. */
function blocks(css) {
	const out = [];
	const pattern = /([^{}]+)\{([^{}]*)\}/g;
	let match;
	while ((match = pattern.exec(css)) !== null) {
		out.push({ selector: match[1].trim(), body: match[2].trim() });
	}
	return out;
}

/** Parse `--name:value` pairs out of one declaration block. */
function declarations(body) {
	const out = new Map();
	for (const part of body.split(";")) {
		const index = part.indexOf(":");
		if (index < 0) continue;
		const name = part.slice(0, index).trim();
		if (!name.startsWith("--")) continue;
		out.set(name, part.slice(index + 1).trim());
	}
	return out;
}

const sheet = inlineSheet("design-platform.css");
const list = blocks(sheet);

/** Tokens declared on a bare `body` (the light base palette). */
const light = new Map();
/** Tokens declared on `body[data-ds-dark-theme]` (the dark base palette). */
const dark = new Map();

for (const block of list) {
	if (block.selector === "body") {
		for (const [name, value] of declarations(block.body)) if (!light.has(name)) light.set(name, value);
	} else if (block.selector.includes("data-ds-dark-theme")) {
		for (const [name, value] of declarations(block.body)) if (!dark.has(name)) dark.set(name, value);
	}
}

// The dark block is a full palette override in DSH, but fall back to the light
// value for any token it does not restate so every catalog entry has both
// schemes (the override API requires a `{light, dark}` pair unconditionally).
const names = [...new Set([...light.keys(), ...dark.keys()])].sort();

/**
 * Group prefix → machine-facing group key, in the order the panel shows them.
 *
 * `static` holds the raw palette a theme is built from; `specific` holds
 * component-scoped overrides. Both are real tokens, but they are the advanced
 * tail of the catalog, so they sort last.
 */
const GROUPS = [
	["--dsw-alias-brand-", "brand"],
	["--dsw-alias-button-", "button"],
	["--dsw-alias-interactive-", "interactive"],
	["--dsw-alias-label-", "label"],
	["--dsw-alias-border-", "border"],
	["--dsw-alias-bg-", "background"],
	["--dsw-alias-markdown-", "markdown"],
	["--dsw-alias-scrollbar-", "scrollbar"],
	["--dsw-alias-state-", "state"],
	["--dsw-alias-link", "link"],
	["--dsw-alias-toast-", "overlay"],
	["--dsw-alias-tooltip-", "overlay"],
	["--dsw-alias-", "alias"],
	["--dsw-specific-", "specific"],
	["--dsw-static-", "static"],
	["--dsw-shadow-", "shadow"],
	["--dsw-elevation-", "shadow"],
	["--dsw-font-", "typography"],
	["--dsw-", "other"]
];

/** Which semantic group a token belongs to. */
function groupOf(name) {
	for (const [prefix, group] of GROUPS) if (name.startsWith(prefix)) return group;
	return "other";
}

const catalog = names.map((name) => ({
	name,
	group: groupOf(name),
	light: light.get(name) ?? dark.get(name) ?? "",
	dark: dark.get(name) ?? light.get(name) ?? ""
}));

const output = `${JSON.stringify({
	generatedFrom: "design-platform.css (inlined in dsh-client-ui-theme)",
	aliases: catalog
}, null, "\t")}\n`;

const target = join(root, "lib", "tokens.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, output, "utf8");
process.stdout.write(`lib/tokens.json written: ${catalog.length} tokens, ${(output.length / 1024).toFixed(1)} KiB\n`);
