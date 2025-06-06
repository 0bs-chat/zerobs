#!/usr/bin/env node
// count-convex-usage.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Recursively collect all files under `dir` with one of the given exts,
// skipping node_modules, .git, dist, build, etc.
function collectFiles(dir, exts, results = []) {
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (
          ent.name === "node_modules" ||
          ent.name === ".git" ||
          ent.name === "dist" ||
          ent.name === "build"
        ) {
          continue;
        }
        collectFiles(full, exts, results);
      } else if (ent.isFile() && exts.includes(path.extname(ent.name))) {
        results.push(full);
      }
    }
  } catch {
    // ignore missing directories
  }
  return results;
}

// Count non-overlapping occurrences of `substr` in `str`
function countOccurrences(str, substr) {
  let count = 0;
  let idx = 0;
  while ((idx = str.indexOf(substr, idx)) !== -1) {
    count++;
    idx += substr.length;
  }
  return count;
}

function main() {
  // parse flags
  const argv = process.argv.slice(2);
  let frontendDir = "src";
  let convexDir = "convex";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--frontend" || a === "-f") {
      frontendDir = argv[++i];
    } else if (a.startsWith("--frontend=")) {
      frontendDir = a.split("=")[1];
    } else if (a === "--convex" || a === "-c") {
      convexDir = argv[++i];
    } else if (a.startsWith("--convex=")) {
      convexDir = a.split("=")[1];
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }

  // 1) get convex function-spec
  let raw;
  try {
    raw = execSync("bunx convex function-spec", { encoding: "utf8" });
  } catch (err) {
    console.error("✖ Error running convex function-spec:", err.message);
    process.exit(1);
  }

  // 2) parse JSON
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (err) {
    console.error("✖ Invalid JSON:", err.message);
    process.exit(1);
  }

  // 3) build list of public (api) functions only
  const funcs = [];
  for (const fn of spec.functions || []) {
    if (typeof fn.identifier !== "string") continue;
    const [filePath, fnName] = fn.identifier.split(":");
    if (!filePath || !fnName) continue;
    const visibility = fn.visibility?.kind;
    if (visibility !== "public") continue;  // skip internals

    const pathBits = filePath
      .split("/")
      .map((s) => s.replace(/\.(js|ts)x?$/, ""));
    const key = `api.${pathBits.join(".")}.${fnName}`;
    const shortName = `${pathBits.join(".")}.${fnName}`;
    funcs.push({ key, shortName });
  }

  // 4) collect files under frontendDir and convexDir
  const exts = [".js", ".ts", ".jsx", ".tsx"];
  const srcFiles = collectFiles(frontendDir, exts);
  const convexFiles = collectFiles(convexDir, exts);

  const srcTexts = srcFiles.map((f) => fs.readFileSync(f, "utf8"));
  const convexTexts = convexFiles.map((f) => fs.readFileSync(f, "utf8"));

  // 5) count usages and filter: src=0 && convex>0
  const report = [];
  for (const { key, shortName } of funcs) {
    let srcCount = 0;
    for (const txt of srcTexts) srcCount += countOccurrences(txt, shortName);
    let convexCount = 0;
    for (const txt of convexTexts)
      convexCount += countOccurrences(txt, shortName);

    if (srcCount === 0 && convexCount > 0) {
      report.push({ key, src: srcCount, convex: convexCount });
    }
  }

  // 6) print only the filtered ones
  report
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach(({ key, src, convex }) => {
      console.log(`${key}: src=${src}, convex=${convex}`);
    });
}

main();