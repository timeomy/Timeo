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
