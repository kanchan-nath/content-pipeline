import Groq from "groq-sdk";
import logger from "../utils/logger.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a senior software engineer and technical content creator.
You analyze code and generate structured educational content.
Always respond with valid JSON only. No markdown. No preamble. No explanation outside JSON.`;

const buildPrompt = (filePath, fileContent) => `
Analyze this code file and generate content for a developer blog post.

File: ${filePath}

Code:
\`\`\`
${fileContent.slice(0, 4000)}
\`\`\`

Return ONLY this exact JSON structure:

{
  "title": "engaging blog post title about this code",
  "seniorVsJunior": "2-3 paragraphs: why this code is written this way from senior dev perspective vs how junior would write it",
  "howItWorks": "brief technical overview of what this code does and how it works (2-3 paragraphs)",
  "documentation": "markdown documentation for this file including purpose, params, return values, usage example",
  "juniorExplanation": "simple explanation for junior devs using analogies and plain language (2-3 paragraphs)",
  "bestCodeChunk": {
    "code": "paste the most interesting chunk of code here",
    "explanation": "why this specific chunk is written well, what pattern it uses, why it is better than alternatives"
  },
  "conversationStarter": "3-4 thought provoking questions this code raises that would spark discussion in comments",
  "linkedinDraft": "short punchy LinkedIn post (max 200 words) teasing the blog post, ends with CTA to read full article",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

/**
 * Analyze single file and return all content pieces
 */
const analyzeFile = async (filePath, fileContent) => {
  logger.info(`Groq analyzing: ${filePath}`);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(filePath, fileContent) },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content?.trim();

  try {
    const parsed = JSON.parse(raw);
    logger.info(`Groq done: ${filePath}`);
    return parsed;
  } catch (err) {
    logger.error(`JSON parse failed for ${filePath}: ${err.message}`);
    logger.error(`Raw response: ${raw?.slice(0, 200)}`);
    throw new Error(`Groq returned invalid JSON for ${filePath}`);
  }
};

export { analyzeFile };
