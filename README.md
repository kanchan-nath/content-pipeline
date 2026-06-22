# Content Pipeline

Auto-generates blog posts from GitHub repo code using Groq LLM.
Posts to Hashnode + Dev.to. Saves LinkedIn drafts locally.

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
| `HASHNODE_API_KEY` | hashnode.com → Account Settings → Developer |
| `HASHNODE_PUBLICATION_ID` | hashnode.com → ur blog → Settings → scroll down to Publication ID |
| `DEVTO_API_KEY` | dev.to → Settings → Extensions → API Keys |

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
3. For each file → Groq generates 6 content pieces
4. Auto-publishes to Hashnode + Dev.to
5. Saves LinkedIn post draft to `drafts/` folder
6. Processes 1 file per cron run (avoids spam)

## Generated content per file

- Senior vs Junior developer perspective
- How it works overview  
- Full documentation
- Junior-friendly explanation
- Best code chunk + why it's good
- Conversation starter questions
- LinkedIn post draft (manual post)
