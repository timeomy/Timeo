/**
 * Fix React instance duplication in pnpm monorepo.
 *
 * Problem: In a monorepo with React 18 (web/Next.js) and React 19 (mobile/Expo),
 * pnpm creates multiple separate copies of React 18 for styled-jsx, next, and
 * apps/web. During SSR prerendering, react-dom-server uses one React instance
 * while other packages use a different one, causing useContext failures.
 *
 * Fix: Symlink all React 18 copies to the web app's React (the canonical copy)
 * so they share the same instance during SSR.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webReact = path.join(root, "apps/web/node_modules/react");
const webReactDom = path.join(root, "apps/web/node_modules/react-dom");

if (!fs.existsSync(webReact) || !fs.existsSync(path.join(webReact, "package.json"))) {
  console.log("Web app React not found, skipping deduplication");
  process.exit(0);
}

const webReactReal = fs.realpathSync(webReact);
const webReactDomReal = fs.realpathSync(webReactDom);

function dedup(target, canonical) {
  if (!fs.existsSync(canonical)) return;
  if (!fs.existsSync(target)) return;

  // Check if target is a broken symlink or empty dir
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) {
    try {
      fs.realpathSync(target); // will throw if broken
      const targetReal = fs.realpathSync(target);
      if (targetReal === canonical) return; // already correct
    } catch {
      // broken symlink — remove and recreate
    }
    fs.unlinkSync(target);
    fs.symlinkSync(canonical, target);
    console.log(`Linked: ${path.relative(root, target)} → ${path.relative(root, canonical)}`);
    return;
  }

  if (stat.isDirectory()) {
    const files = fs.readdirSync(target);
    if (files.length === 0 || !fs.existsSync(path.join(target, "package.json"))) {
      // Empty or corrupted — replace with symlink
      fs.rmSync(target, { recursive: true, force: true });
      fs.symlinkSync(canonical, target);
      console.log(`Linked (restored): ${path.relative(root, target)} → ${path.relative(root, canonical)}`);
      return;
    }

    // Has files — check if different from canonical
    const targetReal = fs.realpathSync(target);
    if (targetReal !== canonical) {
      fs.rmSync(target, { recursive: true, force: true });
      fs.symlinkSync(canonical, target);
      console.log(`Linked: ${path.relative(root, target)} → ${path.relative(root, canonical)}`);
    }
  }
}

// Symlink all other React copies to the web app's React
dedup(path.join(root, "node_modules/styled-jsx/node_modules/react"), webReactReal);
dedup(path.join(root, "node_modules/next/node_modules/react"), webReactReal);
dedup(path.join(root, "node_modules/next/node_modules/react-dom"), webReactDomReal);

console.log("React deduplication complete");

// Fix HtmlContext mismatch between render.js (shared-runtime) and
// pages.runtime.prod.js (vendored bundle). render.js creates a Provider
// using shared-runtime HtmlContext (object A). pages.runtime.prod.js has
// its own compiled renderToHTML that uses a vendored HtmlContext (object B).
// A !== B → useContext in _document returns undefined → build fails.
//
// Fix: patch the shared-runtime module to re-export from the vendored
// context in pages.runtime.prod.js. This makes render.js, pages.runtime,
// and webpack chunks ALL use the same HtmlContext object (B).
const sharedRuntimePath = path.join(
  root,
  "node_modules/next/dist/shared/lib/html-context.shared-runtime.js"
);

if (fs.existsSync(sharedRuntimePath)) {
  const current = fs.readFileSync(sharedRuntimePath, "utf8");
  if (current.includes("pages.runtime.prod")) {
    console.log("HtmlContext shared-runtime already patched");
  } else {
    const patched = [
      '"use strict";',
      'const runtime = require("next/dist/compiled/next-server/pages.runtime.prod.js");',
      'module.exports = runtime.vendored.contexts.HtmlContext;',
      "",
    ].join("\n");
    fs.writeFileSync(sharedRuntimePath, patched);
    console.log("Patched shared-runtime html-context → vendored context");
  }
}

// Also restore vendored html-context files if they were previously patched
const vendoredContexts = [
  path.join(root, "node_modules/next/dist/server/future/route-modules/pages/vendored/contexts/html-context.js"),
  path.join(root, "node_modules/next/dist/esm/server/future/route-modules/pages/vendored/contexts/html-context.js"),
];

const originalVendored = '"use strict";\nmodule.exports = require("../../module.compiled").vendored["contexts"].HtmlContext;\n';

for (const ctxPath of vendoredContexts) {
  if (!fs.existsSync(ctxPath)) continue;
  const current = fs.readFileSync(ctxPath, "utf8");
  if (current.includes("html-context.shared-runtime")) {
    fs.writeFileSync(ctxPath, originalVendored);
    console.log(`Restored vendored: ${path.relative(root, ctxPath)}`);
  }
}
