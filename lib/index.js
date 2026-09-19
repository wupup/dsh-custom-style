/**
 * dsh-custom-style — host half.
 *
 * Durable, origin-independent persistence for the browser half, plus nothing
 * else. The plugin is a pure presentation-layer extension: it never touches
 * sessions, tools, or the model.
 *
 * ## Why a host half at all
 *
 * The browser half could keep everything in `localStorage`, but that store is
 * scoped per origin (scheme + host + port). DSH Desktop binds its web server to
 * an OS-assigned port on every launch, so the GUI origin changes on restart and
 * `localStorage` silently "forgets" the saved stylesheet — the bytes are still
 * in the leveldb, just under the previous port's origin. The same is true for
 * anyone reaching the web GUI through a different host/port.
 *
 * So the authoritative copy lives in a file under `$DSH_HOME`, reachable
 * through one fenced JSON route:
 *
 *   POST /custom-style/api   { "method": "get" }
 *                            → { ok: true, value: <state object> }
 *
 *   POST /custom-style/api   { "method": "set", "patch": { key: value, ... } }
 *                            → { ok: true }        (merge; null deletes a key)
 *
 *   POST /custom-style/api   { "method": "reset" }
 *                            → { ok: true }        (write `{}`)
 *
 * `set` MERGES rather than replaces. Two browser tabs each hold their own
 * in-memory cache; a tab that edits the density sliders must not wipe the
 * custom CSS another tab just wrote. Values are restricted to `string | null`
 * so a compromised page cannot smuggle non-JSON types into the file, and the
 * merge happens against a re-read of the file (not a cached copy) so a write
 * from another process is never clobbered.
 *
 * ## Route security
 *
 * Same trust fence as `dsh-better-sidebar`'s `/sidebar` routes and
 * `dsh-dream-skin`'s `/dream-skin/api`: loopback Host (or a configured trusted
 * authority) plus same-origin browser markers. This is a DNS-rebinding and
 * cross-site-request defense, not authentication — the route carries only the
 * user's own visual preferences.
 *
 * Export discipline: this file is loaded by the cordis Loader as an ES module.
 */

import { homedir } from "node:os";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/** State file name inside the DSH home directory. */
const STATE_FILENAME = "custom-style.json";
/**
 * Max accepted request body. A hand-written stylesheet is kilobytes; this
 * ceiling is generous enough for an imported preset pack carrying base64
 * wallpaper/background data URLs, while still bounding what one request can
 * allocate.
 */
const MAX_BODY_BYTES = 16 * 1024 * 1024;
/** Route prefix owned by this plugin. */
const API_PREFIX = "/custom-style/api";
/** Ownership tag written onto every style tag this plugin mounts. */
const PLUGIN_ID = "dsh-custom-style";

/** Plugin identity for cordis.yml rows. */
export const name = PLUGIN_ID;

/**
 * Services required before mounting: the web server that owns the route table
 * and the runtime fact object carrying the deployment's trusted authorities.
 */
export const inject = ["webServer", "webRuntime"];

// ── state file ──────────────────────────────────────────────────────────────

/** Absolute path of the state file under the DSH home directory. */
function statePath() {
	const home = process.env.DSH_HOME && process.env.DSH_HOME.length > 0
		? process.env.DSH_HOME
		: join(homedir(), ".dsh");
	return join(home, STATE_FILENAME);
}

/** Read the state object; `{}` when absent, unreadable, or corrupt. */
function readState() {
	try {
		const parsed = JSON.parse(readFileSync(statePath(), "utf8"));
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * Persist the state object atomically (tmp + rename).
 *
 * The direct write is a Windows fallback: `rename` can fail there when the
 * target is transiently locked by an indexer or antivirus scan, and for this
 * single-process, last-writer-wins case a direct write is strictly better than
 * losing the user's stylesheet. `mode: 0o600` is ignored on Windows but keeps
 * the file owner-only on POSIX.
 */
function writeState(state) {
	const file = statePath();
	mkdirSync(dirname(file), { recursive: true });
	const body = JSON.stringify(state);
	const tmp = `${file}.tmp`;
	writeFileSync(tmp, body, { encoding: "utf8", mode: 0o600 });
	try {
		renameSync(tmp, file);
	} catch {
		writeFileSync(file, body, { encoding: "utf8", mode: 0o600 });
	}
}

// ── trust fence ─────────────────────────────────────────────────────────────

/** Normalized URL of a Host-header authority, or undefined when unparsable. */
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return undefined;
	}
}

/** Whether a normalized URL hostname names the local loopback authority. */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4
		&& parts[0] === "127"
		&& parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Canonical authority form: `hostname`, or `hostname:port` when a port was written. */
function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}

/**
 * Assert one configured `trustedHosts` entry is a bare authority (`host` or
 * `host:port`) in canonical form — mirrors dsh-client-connection's guard.
 * Anything WHATWG parsing would silently rewrite (whitespace, dangling colon,
 * zero-padded port, path fragment, bogus host spelling) is refused, so a
 * misconfigured entry cannot quietly broaden the authority grant. The list
 * arrives from `webRuntime` already validated by dsh-web-app; this is a
 * defensive second check that fails loud on a broken value.
 */
function assertTrustedAuthority(entry) {
	const entryUrl = parseAuthority(entry);
	if (entryUrl !== undefined && canonicalAuthority(entry, entryUrl) === entry.toLowerCase()) return;
	throw new Error(`${PLUGIN_ID}: trustedHosts entry ${JSON.stringify(entry)} is not a bare host[:port] authority`);
}

/** Whether the request authority matches a trustedHosts entry (exact or port-less). */
function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		assertTrustedAuthority(entry);
		const entryUrl = parseAuthority(entry);
		if (entryUrl === undefined) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
			? entryUrl.hostname === hostUrl.hostname
			: entryUrl.host === hostUrl.host;
	});
}

/**
 * Decide whether one request may reach the plugin route.
 * @param req - node HTTP request facts (headers).
 * @param trustedHosts - non-loopback authorities this deployment serves.
 * @returns true when the Host is ours (loopback or trusted) and browser markers are same-origin.
 */
function isTrustedApiRequest(req, trustedHosts) {
	const host = typeof req.headers.host === "string" ? req.headers.host : undefined;
	if (host === undefined) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === undefined) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	// A cross-site fetch is refused outright even when the Host header looks
	// right; a same-origin page may legitimately omit `Origin` (some fetch
	// paths and top-level navigations do), so a missing Origin is allowed.
	if (req.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = req.headers.origin;
	if (origin === undefined) return true;
	try {
		// Compare HOSTNAME, not host. The Host fence above already bound the
		// authority, so the port must not re-decide trust — and some Chromium
		// builds serialize the Origin of a non-default-port loopback page without
		// the port. DSH Desktop binds an OS-assigned port on every launch, so a
		// port-sensitive comparison would 403 every write there.
		return new URL(origin).hostname === hostUrl.hostname;
	} catch {
		return false;
	}
}

// ── body / response helpers ─────────────────────────────────────────────────

/** Sentinel: the request body exceeded MAX_BODY_BYTES (respond 413, not 400). */
const PAYLOAD_TOO_LARGE = Symbol("payload-too-large");

/**
 * Read a JSON request body, capped at MAX_BODY_BYTES.
 * @returns the parsed body, `null` when not valid JSON, or PAYLOAD_TOO_LARGE.
 */
function readJsonBody(req) {
	return new Promise((resolve) => {
		const chunks = [];
		let size = 0;
		let aborted = false;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES && !aborted) {
				aborted = true;
				req.destroy();
				resolve(PAYLOAD_TOO_LARGE);
				return;
			}
			if (!aborted) chunks.push(chunk);
		});
		req.on("end", () => {
			if (aborted) return;
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				resolve(null);
			}
		});
		req.on("error", () => {
			if (!aborted) resolve(null);
		});
	});
}

/** Write a JSON response with the given status code. */
function writeJson(res, status, value) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(value));
}

/** Write one error envelope. */
function writeError(res, status, code, message) {
	writeJson(res, status, { ok: false, error: { code, message } });
}

/**
 * Apply a patch object onto a copy of the current file state.
 *
 * Only `string` and `null` values are accepted from the wire: a string sets a
 * key, `null` (or `undefined`) deletes it. Booleans and numbers are encoded by
 * the browser half as their JSON string form, which keeps this boundary narrow
 * without losing expressiveness — the client owns the schema and decodes it.
 * Keys not present in the patch are left exactly as they were.
 */
function applyPatch(patch) {
	const next = readState();
	for (const [key, value] of Object.entries(patch)) {
		if (typeof value === "string") next[key] = value;
		else if (value === null) delete next[key];
		// Anything else (number, boolean, object, array) is ignored rather than
		// rejected so one bad key cannot fail a whole multi-key save.
	}
	return next;
}

/** Handle one fenced API request. */
async function handleApi(req, res) {
	if (req.method !== "POST") {
		writeError(res, 405, "method-error", "method not allowed");
		return;
	}
	// Content-type fence: only JSON bodies are meaningful here. Without it a
	// cross-site form POST would otherwise be parsed as `{}` and mis-handled.
	const contentType = typeof req.headers["content-type"] === "string"
		? req.headers["content-type"].toLowerCase()
		: "";
	if (!contentType.startsWith("application/json")) {
		writeError(res, 415, "unsupported-media-type", "content-type must be application/json");
		return;
	}
	const payload = await readJsonBody(req);
	if (payload === PAYLOAD_TOO_LARGE) {
		writeError(res, 413, "payload-too-large", "request body too large");
		return;
	}
	if (payload === null || typeof payload !== "object" || typeof payload.method !== "string") {
		writeError(res, 400, "bad-request", "bad request");
		return;
	}

	if (payload.method === "get") {
		writeJson(res, 200, { ok: true, value: readState() });
		return;
	}

	if (payload.method === "set") {
		const patch = payload.patch;
		if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
			writeError(res, 400, "bad-request", "patch must be a plain object");
			return;
		}
		writeState(applyPatch(patch));
		writeJson(res, 200, { ok: true });
		return;
	}

	if (payload.method === "reset") {
		writeState({});
		writeJson(res, 200, { ok: true });
		return;
	}

	writeError(res, 404, "not-found", `unknown method "${payload.method}"`);
}

/**
 * Host loader entry: mount the fenced persistence route for the browser half.
 * @param ctx - host cordis context (`webServer`, `webRuntime`).
 */
export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: API_PREFIX,
		handler: async (req, res) => {
			if (!isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)) {
				writeError(res, 403, "forbidden", "forbidden");
				return;
			}
			try {
				await handleApi(req, res);
			} catch (error) {
				// Never echo the internal error to the browser: a trusted-origin
				// page has no business seeing filesystem paths or stack frames.
				console.error(`[${PLUGIN_ID}] persistence API error:`, error);
				writeError(res, 500, "internal", "internal error");
			}
		}
	}), `${PLUGIN_ID}: persistence API routes`);
}
