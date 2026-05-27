#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const defaultOptions = {
  manifest: join(projectRoot, "src/photo-manifest.json"),
  sourceRoot: projectRoot,
  out: resolve(projectRoot, "..", "firebase-upload"),
  root: "m30-calendar",
  thumbSize: 480,
  largeSize: 1800,
  thumbQuality: 68,
  largeQuality: 82,
  limit: Number.POSITIVE_INFINITY,
  force: false,
  dryRun: false,
};

function printHelp() {
  console.log(`Prepare optimized Firebase Storage images.

Usage:
  node scripts/prepare-firebase-images.mjs [options]

Options:
  --out <dir>             Output directory. Default: ../firebase-upload
  --source-root <dir>     Source photo root. Default: project root
  --root <path>           Firebase object root. Default: m30-calendar
  --manifest <file>       Photo manifest. Default: src/photo-manifest.json
  --limit <number>        Process only the first N manifest items
  --force                 Regenerate files that already exist
  --dry-run               Report what would be generated without writing files
  --help                  Show this help

Output shape:
  <out>/<root>/thumbs/<original-src>.jpg
  <out>/<root>/large/<original-src>.jpg
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
  const options = { ...defaultOptions };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--out") {
      options.out = resolve(projectRoot, readOption(args, index));
      index += 1;
    } else if (arg.startsWith("--out=")) {
      options.out = resolve(projectRoot, arg.slice("--out=".length));
    } else if (arg === "--root") {
      options.root = readOption(args, index).replace(/^\/+|\/+$/g, "");
      index += 1;
    } else if (arg.startsWith("--root=")) {
      options.root = arg.slice("--root=".length).replace(/^\/+|\/+$/g, "");
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
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(readOption(args, index), 10);
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.root) {
    throw new Error("The Firebase object root cannot be empty.");
  }
  if (!Number.isFinite(options.limit) || options.limit < 1) {
    options.limit = Number.POSITIVE_INFINITY;
  }

  return options;
}

async function pathExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command) {
  const pathEntries = (process.env.PATH || "").split(":").filter(Boolean);
  for (const pathEntry of pathEntries) {
    if (await pathExists(join(pathEntry, command))) return true;
  }
  return false;
}

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(stderr.trim() || `${command} exited with code ${code}`));
      }
    });
  });
}

function objectPath(options, variant, src) {
  return `${options.root}/${variant}/${src}.jpg`;
}

function outputPath(options, variant, src) {
  return join(options.out, objectPath(options, variant, src));
}

async function sourcePathFor(options, src) {
  const directPath = join(options.sourceRoot, src);
  if (await pathExists(directPath)) return directPath;

  if (src.startsWith("src/pics/")) {
    return join(options.sourceRoot, src.slice("src/pics/".length));
  }

  return directPath;
}

async function ensureImageMagick() {
  if (await commandExists("magick")) return;

  throw new Error(
    "ImageMagick is required to generate reliable JPGs. Install it with: brew install imagemagick",
  );
}

async function convertImage(sourcePath, destinationPath, maxSize, quality, options) {
  if (!options.force && await pathExists(destinationPath)) {
    return "skipped";
  }

  if (options.dryRun) {
    return "planned";
  }

  await mkdir(dirname(destinationPath), { recursive: true });
  await run("magick", [
    sourcePath,
    "-auto-orient",
    "-resize", `${maxSize}x${maxSize}>`,
    "-strip",
    "-colorspace", "sRGB",
    "-background", "white",
    "-alpha", "remove",
    "-alpha", "off",
    "-quality", String(quality),
    destinationPath,
  ]);
  return "created";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun) {
    await ensureImageMagick();
  }
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  const processed = [];
  const missing = [];
  const unsupported = [];
  const failures = [];
  const seen = new Set();
  const counts = {
    thumbsCreated: 0,
    thumbsSkipped: 0,
    largeCreated: 0,
    largeSkipped: 0,
    planned: 0,
  };

  console.log(`Manifest: ${options.manifest}`);
  console.log(`Upload root: ${join(options.out, options.root)}`);
  console.log(`Mode: ${options.dryRun ? "dry run" : "write files"}`);
  console.log("");

  for (const photo of manifest) {
    if (!photo?.src || seen.has(photo.src)) continue;
    if (processed.length >= options.limit) break;

    seen.add(photo.src);
    const extension = extname(photo.src).toLowerCase();
    const sourcePath = await sourcePathFor(options, photo.src);

    if (!supportedExtensions.has(extension)) {
      unsupported.push(photo.src);
      continue;
    }
    if (!await pathExists(sourcePath)) {
      missing.push(photo.src);
      continue;
    }

    const thumbPath = outputPath(options, "thumbs", photo.src);
    const largePath = outputPath(options, "large", photo.src);

    try {
      const thumbStatus = await convertImage(sourcePath, thumbPath, options.thumbSize, options.thumbQuality, options);
      const largeStatus = await convertImage(sourcePath, largePath, options.largeSize, options.largeQuality, options);

      if (thumbStatus === "created") counts.thumbsCreated += 1;
      if (thumbStatus === "skipped") counts.thumbsSkipped += 1;
      if (largeStatus === "created") counts.largeCreated += 1;
      if (largeStatus === "skipped") counts.largeSkipped += 1;
      if (thumbStatus === "planned" || largeStatus === "planned") counts.planned += 1;

      processed.push({
        ...photo,
        thumbObject: objectPath(options, "thumbs", photo.src),
        largeObject: objectPath(options, "large", photo.src),
      });

      if (processed.length % 50 === 0) {
        console.log(`Processed ${processed.length} images...`);
      }
    } catch (error) {
      failures.push({ src: photo.src, error: error.message });
    }
  }

  if (!options.dryRun) {
    const uploadRoot = join(options.out, options.root);
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(
      join(uploadRoot, "manifest.json"),
      `${JSON.stringify(processed, null, 2)}\n`,
      "utf8",
    );
  }

  console.log("");
  console.log("Summary");
  console.log(`Processed images: ${processed.length}`);
  console.log(`Thumbs created: ${counts.thumbsCreated}`);
  console.log(`Thumbs skipped: ${counts.thumbsSkipped}`);
  console.log(`Large created: ${counts.largeCreated}`);
  console.log(`Large skipped: ${counts.largeSkipped}`);
  if (options.dryRun) console.log(`Would generate: ${counts.planned}`);
  console.log(`Missing files: ${missing.length}`);
  console.log(`Unsupported files: ${unsupported.length}`);
  console.log(`Failures: ${failures.length}`);

  if (missing.length > 0) {
    console.log("");
    console.log("Missing:");
    missing.forEach((src) => console.log(`- ${src}`));
  }

  if (unsupported.length > 0) {
    console.log("");
    console.log("Unsupported:");
    unsupported.forEach((src) => console.log(`- ${src}`));
  }

  if (failures.length > 0) {
    console.log("");
    console.log("Failures:");
    failures.forEach((failure) => console.log(`- ${failure.src}: ${failure.error}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
