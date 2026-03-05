import { build } from "esbuild";

await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/server.js",
  format: "esm",
  sourcemap: false,
  minify: false,
  // Mark node built-ins and native modules as external
  external: [
    // Node.js built-ins
    "node:*",
    "fs", "path", "os", "crypto", "stream", "http", "https", "net", "tls",
    "zlib", "url", "util", "events", "buffer", "querystring", "child_process",
    "worker_threads", "dgram", "dns", "readline", "assert", "async_hooks",
    "perf_hooks", "string_decoder", "timers", "vm", "tty",
    // Native/binary deps
    "better-sqlite3",
    "pg-native",
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log("✅ API built successfully → dist/server.js");
