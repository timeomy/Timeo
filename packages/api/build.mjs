import { build } from "esbuild";
import { readFileSync } from "fs";

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/server.js",
  format: "esm",
  sourcemap: false,
  minify: false,
  // Externalize ALL npm packages — only bundle workspace code (@timeo/*)
  // but not their npm dependencies
  external: [
    ...allDeps.filter((d) => !d.startsWith("@timeo/")),
    // Node.js built-ins
    "node:*",
    "fs", "path", "os", "crypto", "stream", "http", "https", "net", "tls",
    "zlib", "url", "util", "events", "buffer", "querystring", "child_process",
    "worker_threads", "dgram", "dns", "readline", "assert", "async_hooks",
    "perf_hooks", "string_decoder", "timers", "vm", "tty",
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log("✅ API built successfully → dist/server.js");
