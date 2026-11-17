// Runs Vitest from the canonical project path.
//
// On Windows, opening the folder as "c:\..." instead of "C:\..." makes Vitest
// load two copies of itself (one per drive-letter spelling), and every test
// file then fails with "Cannot read properties of undefined (reading 'config')".
// Resolving the real path first avoids that.
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const cwd = realpathSync.native(process.cwd());
const require = createRequire(path.join(cwd, "package.json"));
const bin = realpathSync.native(
  path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
);

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
