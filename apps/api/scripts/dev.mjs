// Local dev runner: compiles with tsc in watch mode (so decorator metadata is
// emitted exactly like the production build) and restarts the compiled API with
// `node --watch` whenever dist/ changes.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const tscBin = require.resolve("typescript/bin/tsc");

// Start from a clean dist/ so files of deleted sources are not loaded.
rmSync("dist", { recursive: true, force: true });

const children = new Set();
let server;
let shuttingDown = false;

function track(child, name) {
  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      process.stderr.write(`[dev] ${name} exited (${signal ?? code}), stopping\n`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

function shutdown(code) {
  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exitCode = code;
}

const tsc = track(
  spawn(process.execPath, [tscBin, "-p", "tsconfig.json", "--watch", "--preserveWatchOutput"], {
    stdio: ["ignore", "pipe", "inherit"],
  }),
  "tsc"
);

tsc.stdout.setEncoding("utf8");
tsc.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  // tsc prints this after every compilation, including when there are type errors
  // (it still emits JavaScript then, like the old tsx dev server did).
  if (!server && chunk.includes("Watching for file changes")) {
    server = track(
      spawn(process.execPath, ["--watch", "--enable-source-maps", "dist/index.js"], {
        stdio: "inherit",
      }),
      "api"
    );
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}
