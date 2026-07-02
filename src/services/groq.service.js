// import Groq from "groq-sdk";
// import logger from "../utils/logger.js";

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const MODEL = "llama-3.3-70b-versatile";

// const SYSTEM_PROMPT = `You are a senior software engineer and technical documentation writer with 10+ years experience, and an SEO content strategist who understands Google's search ranking factors for developer content.`;

// /**
//  * Analyze single file and return all content pieces
//  */
// const analyzeFile = async (filePath, fileContent) => {
//   logger.info(`Groq analyzing: ${filePath}`);

//   const completion = await groq.chat.completions.create({
//     model: MODEL,
//     messages: [
//       { role: "system", content: SYSTEM_PROMPT },
//       { role: "user", content: buildPrompt(filePath, fileContent) },
//     ],
//     temperature: 1,
//     // max_tokens: 4000,
//   });

//   const raw = completion.choices[0]?.message?.content?.trim();
//   console.log(raw);
//   return raw
// };

// export { analyzeFile };

import OpenAI from "openai";
import logger from "../utils/logger.js";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

const MODEL = "deepseek-ai/deepseek-v4-pro";

const SYSTEM_PROMPT = `You are a senior software engineer and technical documentation writer with 10+ years experience, and an SEO content strategist who understands Google's search ranking factors for developer content.`;

const buildPrompt = (filePath, fileContent) => `

File: ${filePath}

Code:
\`\`\`
${fileContent}
\`\`\`

## Role
You are a senior software engineer and technical documentation writer with 10+ years experience, and an SEO content strategist who understands Google's search ranking factors for developer content.

## Objective
I will provide code, analyze it deeply, and produce a single, comprehensive, SEO-optimized documentation article that teaches the reader the concepts in the code while ranking well on Google search.

## Step 1: Code Acquisition and Analysis
- Fetch the target repository (or specified files/folders) from GitHub.
- Identify: language(s), frameworks, architecture pattern, core modules, data flow, external services/APIs used.
- For each significant file or module, extract the real code snippets (not paraphrased) that best represent the pattern being discussed.

## Step 2: Documentation Content Requirements
For each major concept or file, write in a natural, human tone — as if a senior engineer is walking a colleague through the codebase. Avoid robotic phrasing, avoid excessive hyphenated compound words, avoid generic filler ("in today's fast paced world", "in this section we will discuss").

Cover, where relevant:
- What the code does and why it exists in the system
- The core language/framework concept being used (e.g. async/await, dependency injection, connection pooling, JWT auth, queue workers)
- The actual code snippet, pulled from the real file, with file path noted
- Junior approach vs senior approach: show what a less experienced developer might write, then show the pattern actually used, and explain concretely why the senior version is better (performance, security, maintainability, scalability — be specific, not vague praise)
- Common pitfalls or bugs this pattern avoids
- Trade offs, if any — don't present every choice as flawless

## Step 3: SEO Requirements
-Title: use exactly ONE primary keyword phrase, 3-6 words, matching real search intent (e.g. "Node.js RAG API Tutorial" not "Node.js Express RAG API Tutorial: Building a Document Q&A System with Vector Search"). Do not stack multiple keyword phrases with colons/subtitles — pick the single phrase with highest search volume and commit to it. (e.g. "Node.js Express Authentication Tutorial" style phrasing) so it can rank first on Google.
- Naturally weave high volume, high intent developer search keywords throughout headers and body (e.g. "how to", "best practices", "tutorial", "example", "guide" combined with the actual tech names: React, Node.js, Express, PostgreSQL, Prisma, Redis, BullMQ, Pinecone, RAG, etc.)
- Use proper heading hierarchy (H1 once, H2 for major sections, H3 for sub-points) since Google weights headers heavily.
- Include a short meta-style summary paragraph near the top (2-3 sentences) that could double as a search snippet.
- End with a call to action linking to https://studeq.onrender.com/ (canonical production domain — do not use studeq.onrender.com, which is the deploy host and hurts domain SEO signals). as a backlink, framed naturally (e.g. "See this pattern live in production at StudeQ").

## Step 4: Diagrams
Generate minimum 3 diagrams for single-file docs, minimum 5 for multi-service/multi-file docs. Required coverage, include each that applies:
1. High-level architecture (client → API → DB/external services)
2. Primary request/response flow being documented
3. Any auth/validation flow present
4. Any queue/async/background job flow present
5. Any error/cleanup/rollback flow present
Do not skip a diagram type just because it seems simple — simple flows still help reader.

Use these for: system architecture, request/response flow, data flow between services, auth flow, queue/worker flow, and any multi-step process etc.. Use this format:
"
\`\`\` mermaid
flowchart LR
U[Student]-- >| uploads notes | A[StudeQ Client]
A-- > B[Express API]
B-- > C[Pinecone Vector Store]
B-- > D[Groq / NVIDIA NIM LLM]
C-- > D
D-- >| flashcards / quiz / answer | A
B-- > E[(Postgres + Mongo)]
B-- > F[Redis / BullMQ Queue]
F-- > G[Razorpay Payments]
\`\`\`

Each diagram must be preceded by 1-2 sentences of plain language context, and followed by a short explanation of what the arrows/nodes mean.

## Step 5: Voice and Readability Rules
- Write like a human engineer explaining to another human, not like marketing copy.
- No excessive hyphenated buzzwords ("cutting-edge", "state-of-the-art", "next-generation").
- No bullet point overload where prose reads better — mix paragraphs and lists naturally.
- Short, clear sentences over long, dense ones.
- Vary sentence structure so it doesn't sound machine generated.
- Only use code that is literally present in the provided file content.
- If a function is called but its implementation is not shown, write "implementation not shown in provided excerpt" instead of guessing or writing pseudocode.
Closing/summary section: do not use generic wrap-up phrasing ("add up to a robust, maintainable system", "in conclusion"). End on a specific, concrete takeaway instead — one real thing the reader should try or watch for in their own code.

## Output Format
- Single markdown document.
- H1 title (SEO keyword optimized)
- Meta summary paragraph
- Table of contents
- Sectioned body (concept explanation + code snippet + junior vs senior + diagrams as needed)
- Closing section with CTA backlink to https://studeq.onrender.com/

## Things you decide on your own
Where the prompt is silent (exact section order, how many diagrams per file, depth per module), use judgment as a senior engineer would — prioritize clarity and real teaching value over hitting an arbitrary word count.


`;

/**
 * Analyze single file and return all content pieces
 */
const analyzeFile = async (filePath, fileContent) => {
  logger.info(`LLM analyzing: ${filePath}`);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(filePath, fileContent) },
    ],
    temperature: 0.7,
    top_p: 0.9,
    max_completion_tokens: 16384,
    // deepseek-v4-pro is a reasoning model — disable thinking so
    // the response body is pure JSON, not reasoning + JSON
    // extra_body: { chat_template_kwargs: { thinking: false } },
    stream: false,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  logger.info(`LLM done: ${filePath}`);
  
  return raw
};

export { analyzeFile };