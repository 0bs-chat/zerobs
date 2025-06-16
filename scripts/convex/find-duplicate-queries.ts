#!/usr/bin/env bun

import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { parseArgs } from "util";

interface QueryUsage {
  query: string;
  count: number;
  files: string[];
}

async function findAllFiles(
  dir: string,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx"],
): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (
            !["node_modules", ".git", "dist", "build", ".next"].includes(
              entry.name,
            )
          ) {
            await scan(fullPath);
          }
        } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}:`, error);
    }
  }

  await scan(dir);
  return files;
}

async function findQueriesInFile(
  filePath: string,
): Promise<{ query: string; file: string }[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    const queries: { query: string; file: string }[] = [];

    // Regex to match api.* patterns (for Convex queries)
    // Matches patterns like: api.chatInputs.queries.get, api.chats.get, etc.
    const apiRegex =
      /\bapi\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

    let match;
    while ((match = apiRegex.exec(content)) !== null) {
      const fullQuery = `api.${match[1]}`;
      queries.push({ query: fullQuery, file: filePath });
    }

    return queries;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
    return [];
  }
}

function aggregateQueries(
  allQueries: { query: string; file: string }[],
): QueryUsage[] {
  const queryMap = new Map<string, { count: number; files: Set<string> }>();

  for (const { query, file } of allQueries) {
    if (!queryMap.has(query)) {
      queryMap.set(query, { count: 0, files: new Set() });
    }
    const usage = queryMap.get(query)!;
    usage.count++;
    usage.files.add(file);
  }

  return Array.from(queryMap.entries())
    .map(([query, { count, files }]) => ({
      query,
      count,
      files: Array.from(files).sort(),
    }))
    .filter((usage) => usage.count > 1) // Only show duplicates
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

async function main() {
  try {
    // Parse command line arguments
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        dir: {
          type: "string",
          short: "d",
          default: "src",
        },
        help: {
          type: "boolean",
          short: "h",
        },
      },
    });

    if (values.help) {
      console.log(`
Usage: bun run scripts/convex/find-duplicate-queries.ts [options]

Options:
  -d, --dir <directory>   Base directory to scan (default: src)
  -h, --help             Show this help message

Examples:
  bun run scripts/convex/find-duplicate-queries.ts
  bun run scripts/convex/find-duplicate-queries.ts --dir src
  bun run scripts/convex/find-duplicate-queries.ts -d components
      `);
      process.exit(0);
    }

    const baseDir = values.dir || "src";

    console.log(`Scanning for duplicate queries in: ${baseDir}`);
    console.log("---");

    const files = await findAllFiles(baseDir);
    console.log(`Found ${files.length} files to scan`);

    const allQueries: { query: string; file: string }[] = [];

    for (const file of files) {
      const queries = await findQueriesInFile(file);
      allQueries.push(...queries);
    }

    const duplicateQueries = aggregateQueries(allQueries);

    if (duplicateQueries.length === 0) {
      console.log("No duplicate queries found!");
      process.exit(0);
    }

    console.log(`\nFound ${duplicateQueries.length} duplicate queries:\n`);

    for (const { query, count } of duplicateQueries) {
      console.log(`${query}: ${count}`);
    }

    // Optionally show detailed file information
    if (process.argv.includes("--verbose") || process.argv.includes("-v")) {
      console.log("\nDetailed breakdown:");
      for (const { query, count, files } of duplicateQueries) {
        console.log(`\n${query}: ${count}`);
        for (const file of files) {
          console.log(`  - ${file}`);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
