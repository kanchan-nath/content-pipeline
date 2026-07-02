import "../src/configs/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

import logger from "../src/utils/logger.js";
import { fetchRepoTree, fetchFileContent } from "../src/services/github.service.js";
import { analyzeFile } from "../src/services/groq.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUE_DIR = path.resolve(__dirname, "../../Due");
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

// ─── Build full markdown from LLM output ─────────────────────────────────────

const buildMarkdown = (filePath, content) => {
  return `# ${content.title}

## Senior vs Junior Developer Perspective

${content.seniorVsJunior}

---

## How It Works

${content.howItWorks}

---

## Code Deep Dive

\`\`\`
${content.bestCodeChunk.code}
\`\`\`

${content.bestCodeChunk.explanation}

---

## Documentation

${content.documentation}

---

## Explanation for Junior Developers

${content.juniorExplanation}

---

## Questions to Think About

${content.conversationStarter}

---

## LinkedIn Draft

${content.linkedinDraft}

---

**Tags:** ${content.tags.join(", ")}

*File analyzed: \`${filePath}\`*
`.trim();
};

// ─── Sanitize title → safe filename ───────────────────────────────────────────

const slugifyTitle = (title) => {
  return title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
};

// ─── Save LLM output to Due/ folder ───────────────────────────────────────────

const saveToDue = (filePath, content) => {
  if (!fs.existsSync(DUE_DIR)) fs.mkdirSync(DUE_DIR, { recursive: true });

  const markdown = buildMarkdown(filePath, content);
  const safeTitle = slugifyTitle(content.title);
  const outPath = path.join(DUE_DIR, `${safeTitle}.md`);

  fs.writeFileSync(outPath, markdown);
  logger.info(`Saved to Due: ${outPath}`);
  return outPath;
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

  // 3. save full LLM output to Due/ as title.md (manual posting)
  const savedPath = saveToDue(filePath, content);

  const results = { filePath, savedTo: savedPath };

  // 4. mark as processed
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