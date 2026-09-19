/**
 * Pre-flight checks for the shipped artifacts.
 *
 * CI and contributors both run this. It answers the questions the behavior suite
 * deliberately does not:
 *
 *  1. Does the committed `lib/client.js` still match `src/`? A stale bundle is the
 *     single most likely release mistake — the sources say one thing, users install
 *     another, and every test still passes because the tests run the bundle.
 *  2. Is the generated bundle even parseable? Broken syntax would otherwise be
 *     discovered by a user's white-screened GUI.
 *  3. Is `lib/tokens.json` a real catalog rather than a failed extraction?
 *  4. Does the host half still load and export the loader contract?
 *
 * Run: node tools/check.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Collected failure messages, reported together at the end. */
const failures = [];

/**
 * Run one named check, reporting its outcome.
 * `run` may be sync or async; a throw (or rejection) fails the check.
 */
async function check(name, run) {
	try {
		const detail = await run();
		process.stdout.write(`  ok    ${name}${detail ? ` — ${detail}` : ""}\n`);
	} catch (error) {
		failures.push(`${name}: ${error.message}`);
		process.stdout.write(`  FAIL  ${name} — ${error.message}\n`);
	}
}

/**
 * Collapse CRLF to LF so comparisons ignore the checkout's line-ending style.
 * @param text - file content read from disk.
 * @returns the same content with a single `\n` line terminator everywhere.
 */
function normalizeEol(text) {
	return text.replace(/\r\n/g, "\n");
}

process.stdout.write("artifact checks\n");

// The bundle is regenerated and compared FIRST, so a stale artifact is reported
// before the parse check would report its (possibly stale) syntax as fine.
// The builder is imported rather than spawned: it has no side effects beyond
// writing its output, and importing it works in sandboxes that forbid the pipes
// a child process would need.
await check("the committed bundle matches src/", async () => {
	const bundlePath = join(root, "lib", "client.js");
	if (!existsSync(bundlePath)) throw new Error("lib/client.js is missing");
	const before = readFileSync(bundlePath, "utf8");
	await import("./build-client.mjs");
	const after = readFileSync(bundlePath, "utf8");
	// Compare with line endings normalized. `.gitattributes` declares this repo
	// LF-in-the-object-database, so a Windows checkout materializes CRLF while the
	// builder always emits LF — a byte comparison would report a false "stale" on
	// every Windows machine. Content differences are what matter here.
	if (normalizeEol(before) !== normalizeEol(after)) {
		// The freshly built (correct) file is left in place so the fix is obvious.
		throw new Error("STALE — run `npm run client` and commit lib/client.js");
	}
	return "in sync";
});

await check("lib/client.js exists and is non-trivial", () => {
	const source = readFileSync(join(root, "lib", "client.js"), "utf8");
	if (source.length < 20_000) throw new Error(`suspiciously small (${source.length} bytes)`);
	if (!source.includes("window.__ModuleLoader__.load(")) throw new Error("does not register a module factory");
	return `${(source.length / 1024).toFixed(1)} KiB`;
});

await check("lib/client.js parses as a plain script", () => {
	// `new vm.Script` compiles with classic-script semantics — exactly how the
	// loader evaluates a plugin bundle. A module-mode parse would accept syntax
	// (top-level await, import) that the loader cannot actually run.
	const source = readFileSync(join(root, "lib", "client.js"), "utf8");
	new vm.Script(source, { filename: "lib/client.js" });
	return "syntax valid";
});

await check("lib/tokens.json is a usable catalog", () => {
	const path = join(root, "lib", "tokens.json");
	if (!existsSync(path)) throw new Error("lib/tokens.json is missing");
	const catalog = JSON.parse(readFileSync(path, "utf8"));
	const aliases = catalog.aliases;
	if (!Array.isArray(aliases) || aliases.length < 100) {
		throw new Error(`only ${aliases?.length ?? 0} tokens — the extractor probably failed`);
	}
	for (const entry of aliases) {
		if (typeof entry.name !== "string" || !entry.name.startsWith("--dsw-")) {
			throw new Error(`malformed catalog entry: ${JSON.stringify(entry)}`);
		}
	}
	return `${aliases.length} tokens`;
});

await check("the host half exports the loader contract", async () => {
	// Dynamic import through a file: URL, because a bare Windows path is not a
	// valid ESM specifier.
	const module = await import(pathToFileURL(join(root, "lib", "index.js")).href);
	if (typeof module.apply !== "function") throw new Error("lib/index.js must export apply(ctx)");
	if (!Array.isArray(module.inject)) throw new Error("lib/index.js must export an inject[] array");
	if (typeof module.name !== "string") throw new Error("lib/index.js must export a name string");
	return `${module.name} injects [${module.inject.join(", ")}]`;
});

process.stdout.write("\n");
if (failures.length > 0) {
	process.stderr.write(`${failures.length} check(s) failed:\n`);
	for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
	process.exit(1);
}
process.stdout.write("all artifact checks passed\n");
