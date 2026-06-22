import "../src/configs/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

import logger from "../src/utils/logger.js";
import { fetchRepoTree, fetchFileContent } from "../src/services/github.service.js";
import { analyzeFile } from "../src/services/groq.service.js";
import { publishToHashnode } from "../src/services/hashnode.service.js";
import { publishToDevto } from "../src/services/devto.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.resolve(__dirname, "../../drafts");
const PROCESSED_LOG = path.resolve(__dirname, "../../logs/processed.json");

// ─── Processed file tracker ───────────────────────────────────────────────────

const loadProcessed = () => {
  if (!fs.existsSync(PROCESSED_LOG)) return {};
  return JSON.parse(fs.readFileSync(PROCESSED_LOG, "utf-8"));
};

const markProcessed = (filePath, result) => {
  const processed = loadProcessed();
  processed[filePath] = { ...result, processedAt: new Date().toISOString() };
  fs.writeFileSync(PROCESSED_LOG, JSON.stringify(processed, null, 2));
};

const isProcessed = (filePath) => {
  const processed = loadProcessed();
  return !!processed[filePath];
};

// ─── LinkedIn draft saver ─────────────────────────────────────────────────────

const saveLinkedInDraft = (filePath, linkedinDraft) => {
  const safeName = filePath.replace(/\//g, "_").replace(/\./g, "-");
  const draftPath = path.join(DRAFTS_DIR, `${safeName}-linkedin.txt`);
  fs.writeFileSync(draftPath, linkedinDraft);
  logger.info(`LinkedIn draft saved: ${draftPath}`);
};

// ─── Process single file ──────────────────────────────────────────────────────

const processFile = async (owner, repo, filePath) => {
  if (isProcessed(filePath)) {
    logger.info(`Skip (already processed): ${filePath}`);
    return;
  }

  logger.info(`Processing: ${filePath}`);

  // 1. fetch file content
  const fileContent = await fetchFileContent(owner, repo, filePath);

  // skip empty or tiny files
  if (!fileContent || fileContent.trim().length < 50) {
    logger.warn(`Skip (too small): ${filePath}`);
    return;
  }

  // 2. Groq analyze + generate content
  const content = await analyzeFile(filePath, fileContent);

  // 3. publish to platforms
  const results = { filePath };

  try {
    const hashnodePost = await publishToHashnode(filePath, content);
    results.hashnode = hashnodePost.url;
  } catch (err) {
    logger.error(`Hashnode failed for ${filePath}: ${err.message}`);
    results.hashnodeError = err.message;
  }

  try {
    const devtoPost = await publishToDevto(filePath, content);
    results.devto = devtoPost.url;
  } catch (err) {
    logger.error(`Dev.to failed for ${filePath}: ${err.message}`);
    results.devtoError = err.message;
  }

  // 4. save LinkedIn draft
  saveLinkedInDraft(filePath, content.linkedinDraft);
  results.linkedinDraft = "saved to drafts/";

  // 5. mark as processed
  markProcessed(filePath, results);

  // small delay to avoid rate limits
  await new Promise((r) => setTimeout(r, 3000));
};

// ─── Main pipeline run ────────────────────────────────────────────────────────

const runPipeline = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!owner || !repo) {
    logger.error("GITHUB_OWNER and GITHUB_REPO required in .env");
    process.exit(1);
  }

  logger.info(`Pipeline start → ${owner}/${repo} (${branch})`);

  try {
    const files = await fetchRepoTree(owner, repo, branch);

    logger.info(`${files.length} files found. Processing one per run...`);

    // process ONE file per run to avoid rate limits + spam
    // change to `for...of` if u want all at once
    const unprocessed = files.filter((f) => !isProcessed(f));

    if (unprocessed.length === 0) {
      logger.info("All files processed. Nothing to do.");
      return;
    }

    const nextFile = unprocessed[0];
    await processFile(owner, repo, nextFile);

    logger.info(`Pipeline done. ${unprocessed.length - 1} files remaining.`);
  } catch (err) {
    logger.error(`Pipeline error: ${err.message}`);
  }
};

// ─── Entry point ──────────────────────────────────────────────────────────────

const mode = process.argv[2];

if (mode === "--once") {
  // run immediately once: node src/pipeline.js --once
  runPipeline();
} else if (mode === "--all") {
  // process ALL unprocessed files back to back (careful: rate limits)
  const runAll = async () => {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const files = await fetchRepoTree(owner, repo, branch);
    const unprocessed = files.filter((f) => !isProcessed(f));
    logger.info(`Processing all ${unprocessed.length} unprocessed files...`);
    for (const file of unprocessed) {
      await processFile(owner, repo, file);
    }
    logger.info("All done.");
  };
  runAll();
} else {
  // default: cron schedule — runs every day at 9am, processes 1 file
  logger.info("Pipeline running on schedule: daily 9am");
  cron.schedule("0 9 * * *", () => {
    logger.info("Cron triggered");
    runPipeline();
  });

  // also run once on startup
  runPipeline();
}
