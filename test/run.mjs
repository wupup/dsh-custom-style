/**
 * Run the behavior suite.
 *
 * `node --test <files>` spawns one child process per test file with piped
 * stdio, which fails with `EPERM` under a sandbox that forbids opening named
 * pipes. Importing the same files in one process runs the identical `node:test`
 * suite without spawning anything, so this is the entry point `npm test` uses.
 *
 * `node --test test/*.test.mjs` works identically outside such a sandbox.
 */

import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const suites = readdirSync(here)
	.filter((name) => name.endsWith(".test.mjs"))
	.sort();

if (suites.length === 0) {
	process.stderr.write("no test files found\n");
	process.exit(1);
}

for (const suite of suites) {
	// A bare Windows path is not a valid ESM specifier; it must be a file: URL.
	await import(pathToFileURL(join(here, suite)).href);
}
