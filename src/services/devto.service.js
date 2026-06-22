import axios from "axios";
import logger from "../utils/logger.js";

const DEVTO_API = "https://dev.to/api";

/**
 * Build full markdown article from all content pieces
 */
const buildArticle = (filePath, content) => {
  return `
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

*File analyzed: \`${filePath}\`*
  `.trim();
};

/**
 * Publish post to Dev.to
 */
const publishToDevto = async (filePath, content) => {
  const articleContent = buildArticle(filePath, content);

  const { data } = await axios.post(
    `${DEVTO_API}/articles`,
    {
      article: {
        title: content.title,
        body_markdown: articleContent,
        published: true,
        tags: content.tags.slice(0, 4).map((t) => t.toLowerCase().replace(/\s+/g, "")),
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.DEVTO_API_KEY,
      },
    }
  );

  logger.info(`Dev.to published: ${data.url}`);
  return { id: data.id, url: data.url };
};

export { publishToDevto };
