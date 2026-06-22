import axios from "axios";
import logger from "../utils/logger.js";

const HASHNODE_API = "https://gql.hashnode.com";

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
 * Publish post to Hashnode
 */
const publishToHashnode = async (filePath, content) => {
  const articleContent = buildArticle(filePath, content);

  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          slug
          url
        }
      }
    }
  `;

  const variables = {
    input: {
      title: content.title,
      contentMarkdown: articleContent,
      tags: content.tags.slice(0, 5).map((tag) => ({ slug: tag.toLowerCase().replace(/\s+/g, "-"), name: tag })),
      publicationId: process.env.HASHNODE_PUBLICATION_ID,
    },
  };

  const { data } = await axios.post(
    HASHNODE_API,
    { query: mutation, variables },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.HASHNODE_API_KEY,
      },
    }
  );

  if (data.errors) {
    throw new Error(`Hashnode error: ${JSON.stringify(data.errors)}`);
  }

  const post = data.data.publishPost.post;
  logger.info(`Hashnode published: ${post.url}`);
  return post;
};

export { publishToHashnode };
