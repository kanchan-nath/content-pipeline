import axios from "axios";
import logger from "../utils/logger.js";

const GITHUB_API = "https://api.github.com";

const SKIP_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz",
  ".lock", ".log",
];

const SKIP_DIRS = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

const SKIP_FILENAMES = [".DS_Store", "Thumbs.db", "desktop.ini", ".gitkeep"];

const shouldSkip = (path) => {
  if (SKIP_DIRS.some((dir) => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) return true;
  if (SKIP_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;
  const filename = path.split("/").pop();
  if (SKIP_FILENAMES.includes(filename)) return true;
  return false;
};

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_PAT}`,
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "content-pipeline",
});

/**
 * Recursively fetch all file paths from repo tree
 */
const fetchRepoTree = async (owner, repo, branch = "main") => {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const { data } = await axios.get(url, { headers: getHeaders() });

  const files = data.tree
    .filter((item) => item.type === "blob")
    .filter((item) => !shouldSkip(item.path))
    .map((item) => item.path);

  logger.info(`Fetched ${files.length} files from ${owner}/${repo}`);
  return files;
};

/**
 * Fetch raw content of single file
 */
const fetchFileContent = async (owner, repo, filePath) => {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

  const { data } = await axios.get(url, { headers: getHeaders() });

  // content is base64 encoded
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return content;
};

export { fetchRepoTree, fetchFileContent };