import Groq from "groq-sdk";
import logger from "../utils/logger.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a senior software engineer and technical content creator.
You analyze code and generate structured educational content.
Always respond with valid markdown only.`;

const buildPrompt = (filePath, fileContent) => `
Analyze this code file and generate content for a developer blog post.

File: ${filePath}

Code:
\`\`\`
${fileContent.slice(0, 4000)}
\`\`\`

Return ONLY this exact markdown  structure:

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
  console.log(raw);
  
};

export { analyzeFile };
