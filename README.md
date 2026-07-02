# Content Pipeline

Auto-generates blog posts from GitHub repo code using Groq LLM.
Saves full output locally to `Due/` as `title.md` — you post manually.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env values
```

## .env Keys

| Key | Where to get |
|-----|-------------|
| `GITHUB_PAT` | github.com → Settings → Developer Settings → Tokens (classic) → scope: `repo` |
| `GITHUB_OWNER` | ur GitHub username |
| `GITHUB_REPO` | repo name (private ok) |
| `GROQ_API_KEY` | console.groq.com |

## Run

```bash
# run once (1 file)
node src/pipeline.js --once

# run all unprocessed files
node src/pipeline.js --all

# run on cron schedule (daily 9am)
node src/pipeline.js
```

## How it works

1. Fetches all files from ur private GitHub repo
2. Skips already-processed files (tracked in `logs/processed.json`)
3. For each file → Groq generates content pieces
4. Saves full output to `Due/<title>.md` (filename = model's title, sanitized)
5. Processes 1 file per cron run (avoids spam)

## Generated content per file (all in one `Due/<title>.md`)

- Senior vs Junior developer perspective
- How it works overview
- Full documentation
- Junior-friendly explanation
- Best code chunk + why it's good
- Conversation starter questions
- LinkedIn post draft
- Tags
