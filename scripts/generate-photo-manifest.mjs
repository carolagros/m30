#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const defaultManifest = join(projectRoot, "src/photo-manifest.json");
const execFileAsync = promisify(execFile);

function printHelp() {
  console.log(`Generate src/photo-manifest.json from year folders.

Usage:
  node scripts/generate-photo-manifest.mjs --source-root <photos-dir> [options]

Options:
  --source-root <dir>     Directory containing 1996, 1997, ... year folders
  --manifest <file>       Manifest path. Default: src/photo-manifest.json
  --help                  Show this help
`);
}

function readOption(args, index) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${args[index]}`);
  }
  return value;
}

function parseArgs(args) {
  const options = {
    sourceRoot: null,
    manifest: defaultManifest,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--source-root") {
      options.sourceRoot = resolve(projectRoot, readOption(args, index));
      index += 1;
    } else if (arg.startsWith("--source-root=")) {
      options.sourceRoot = resolve(projectRoot, arg.slice("--source-root=".length));
    } else if (arg === "--manifest") {
      options.manifest = resolve(projectRoot, readOption(args, index));
      index += 1;
    } else if (arg.startsWith("--manifest=")) {
      options.manifest = resolve(projectRoot, arg.slice("--manifest=".length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.sourceRoot) {
    throw new Error("Missing --source-root. It must point to the folder containing the year folders.");
  }

  return options;
}

function stableNumber(text, salt = 0) {
  let hash = 2166136261 + salt;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function fallbackMonth(src, year) {
  const lastMonth = year === 2026 ? 4 : 11;
  return Math.floor(stableNumber(src, year) * (lastMonth + 1));
}

async function metadataDate(filePath) {
  try {
    const { stdout } = await execFileAsync("identify", [
      "-quiet",
      "-format",
      "%[EXIF:DateTimeOriginal]",
      filePath,
    ]);
    const match = stdout.trim().match(/^(\d{4}):(\d{2}):(\d{2})/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
  } catch {
    return null;
  }
}

async function metadataForNewPhoto(filePath, src, year) {
  const date = await metadataDate(filePath);

  if (!date) {
    return {
      month: fallbackMonth(src, year),
      source: "random-no-metadata",
      date: null,
    };
  }

  const [dateYear, dateMonth] = date.split("-").map(Number);
  if (dateYear === year && dateMonth >= 1 && dateMonth <= 12) {
    return {
      month: dateMonth - 1,
      source: "metadata",
      date,
    };
  }

  return {
    month: fallbackMonth(src, year),
    source: "random-metadata-year-mismatch",
    date,
  };
}

function normalizeSrc(sourceRoot, filePath) {
  const relativePath = relative(sourceRoot, filePath).split("/").join("/");
  return `src/pics/${relativePath}`;
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const existing = JSON.parse(await readFile(options.manifest, "utf8").catch(() => "[]"));
  const previousBySrc = new Map(existing.map((photo) => [photo.src, photo]));
  const files = await collectFiles(options.sourceRoot);
  const manifest = [];

  for (const filePath of files) {
    const src = normalizeSrc(options.sourceRoot, filePath);
    const extension = src.slice(src.lastIndexOf(".")).toLowerCase();
    if (!supportedExtensions.has(extension)) continue;

    const match = src.match(/^src\/pics\/(\d{4})\//);
    if (!match) continue;

    const year = Number(match[1]);
    const previous = previousBySrc.get(src);
    const metadata = previous ?? await metadataForNewPhoto(filePath, src, year);

    manifest.push({
      src,
      year,
      month: metadata.month,
      source: metadata.source,
      date: metadata.date,
    });
  }

  manifest.sort(
    (a, b) =>
      a.year - b.year ||
      a.month - b.month ||
      (a.date || "").localeCompare(b.date || "") ||
      a.src.localeCompare(b.src),
  );

  await writeFile(options.manifest, `${JSON.stringify(manifest)}\n`, "utf8");

  const counts = manifest.reduce((memo, photo) => {
    memo[photo.year] = (memo[photo.year] || 0) + 1;
    return memo;
  }, {});

  console.log(`Manifest written: ${options.manifest}`);
  console.log(`Photos: ${manifest.length}`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
