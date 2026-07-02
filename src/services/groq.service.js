import Groq from "groq-sdk";
import logger from "../utils/logger.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a senior software engineer and technical documentation writer with 10+ years experience, and an SEO content strategist who understands Google's search ranking factors for developer content.`;

const buildPrompt = (filePath, fileContent) => `

File: ${filePath}

Code:
\`\`\`
${fileContent.slice(0, 4000)}
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
- Title: use the single highest search volume, most relevant keyword phrase for the topic (e.g. "Node.js Express Authentication Tutorial" style phrasing) so it can rank first on Google.
- Naturally weave high volume, high intent developer search keywords throughout headers and body (e.g. "how to", "best practices", "tutorial", "example", "guide" combined with the actual tech names: React, Node.js, Express, PostgreSQL, Prisma, Redis, BullMQ, Pinecone, RAG, etc.)
- Use proper heading hierarchy (H1 once, H2 for major sections, H3 for sub-points) since Google weights headers heavily.
- Include a short meta-style summary paragraph near the top (2-3 sentences) that could double as a search snippet.
- End with a call to action linking to https://studeq.onrender.com/ as a backlink, framed naturally (e.g. "See this pattern live in production at StudeQ").

## Step 4: Diagrams
Generate as many Mermaid flowcharts as genuinely help explain flow — err on the side of more diagrams, not fewer. Use these for: system architecture, request/response flow, data flow between services, auth flow, queue/worker flow, and any multi-step process. Use this format:
"
mermaid
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


Each diagram must be preceded by 1-2 sentences of plain language context, and followed by a short explanation of what the arrows/nodes mean.

## Step 5: Voice and Readability Rules
- Write like a human engineer explaining to another human, not like marketing copy.
- No excessive hyphenated buzzwords ("cutting-edge", "state-of-the-art", "next-generation").
- No bullet point overload where prose reads better — mix paragraphs and lists naturally.
- Short, clear sentences over long, dense ones.
- Vary sentence structure so it doesn't sound machine generated.

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
  logger.info(`Groq analyzing: ${filePath}`);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(filePath, fileContent) },
    ],
    temperature: 1,
    // max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  console.log(raw);
  return raw
};

export { analyzeFile };
