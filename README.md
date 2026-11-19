# KidSafe Chat

A safe AI chatbot for kids and teens under 18. Ask **Nova** about homework, science, stories, or games. Adult, violent, terrorist, drug, and hateful words are blocked with a clear **"This is an 18+ word"** message.

Built with Next.js, React Three Fiber (3D animated background), Tailwind CSS, and Meta Llama models through [FastRouter](https://fastrouter.ai) (an OpenAI-compatible model gateway).

## Features

- **Four safety checks** on every message:
  1. **Word filter.** Blocks bad words instantly, even tricks like `s3x`, `f.u.c.k`, `fuuuck`, `f*ck`. Works without an API key.
  2. **AI moderation.** Two checks run in parallel: Meta's **Llama Guard 4** safety classifier, plus a kid-strict classifier that also blocks things Llama Guard allows for adults (alcohol, swearing, dirty jokes, bullying). Together they catch harmful meaning without bad words (e.g. "how do I hurt someone").
  3. **Kid-safe instructions.** Nova is told to stay age-appropriate, refuse jailbreak tricks, and never ask for personal information.
  4. **Answer check.** Nova's own reply is checked again before it is shown.
- **Self-harm support.** Messages about self-harm get a kind reply pointing to a trusted adult and helplines, not a "blocked" message.
- **3D dark-blue theme.** A glowing orb follows the mouse and changes colour: blue when idle, purple while thinking, red with a shake when a message is blocked.
- **Privacy and abuse limits.** The API key stays on the server, each visitor is limited to 20 messages a minute, and messages are capped at 1,000 characters.

## Requirements

- [Node.js](https://nodejs.org/) **20 or newer** (22 recommended). Check with `node -v`.
- A [FastRouter](https://fastrouter.ai) API key with credits.

## Setup

### 1. Get the code

```bash
git clone https://github.com/vis243/kidsafe-chat.git
cd kidsafe-chat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your FastRouter API key

Copy the example file to `.env.local`:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Open `.env.local` and replace the placeholder with your key:

```env
FASTROUTER_API_KEY=sk-v1-your-real-key
# Optional: use a different chat model (default: meta-llama/llama-3.1-8b-instruct-turbo)
FASTROUTER_MODEL=
```

> **Never put your real key in `.env.example`** or commit it. `.env.local` is git-ignored; `.env.example` is committed.

### 4. Run it

```bash
npm run dev
```

Open **http://localhost:3000**. Keep the terminal open while you use the app.

To use another port:

```bash
# macOS / Linux
PORT=4000 npm run dev

# Windows (PowerShell)
$env:PORT=4000; npm run dev
```

## Production build

```bash
npm run build
npm start
```

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm test` | Run the word-filter tests |
| `npm run lint` | Lint the code |

## Customising

| What | Where |
|---|---|
| Add or remove blocked words | [`lib/safety/wordlist.ts`](lib/safety/wordlist.ts) |
| Blocked-message wording and helplines | [`lib/safety/categories.ts`](lib/safety/categories.ts) |
| Nova's personality and rules, moderation strictness | [`lib/llm.ts`](lib/llm.ts) |
| Chat API logic | [`app/api/chat/route.ts`](app/api/chat/route.ts) |
| Chat UI | [`components/ChatApp.tsx`](components/ChatApp.tsx) |
| 3D background | [`components/Scene3D.tsx`](components/Scene3D.tsx) |

Run `npm test` after editing the word list to check nothing innocent gets blocked.

## Troubleshooting

| Message in the chat | Fix |
|---|---|
| "the FastRouter account is out of credits" | Top up your FastRouter account, wait a minute, try again. |
| "the FastRouter API key is invalid" | Check `FASTROUTER_API_KEY` in `.env.local` (or in Vercel's environment variables). |
| "The chatbot isn't set up yet" | `.env.local` is missing or has no key. See step 3. |
| "the model ... isn't available" | Set `FASTROUTER_MODEL` to a model listed by FastRouter (e.g. `meta-llama/llama-3.1-8b-instant`). |
| Browser says "can't reach this page" | Make sure `npm run dev` is still running and you're using the port it prints. |

## Project structure

```
app/
  api/chat/route.ts   Chat API (all four safety checks)
  layout.tsx, page.tsx
components/
  ChatApp.tsx         Chat interface
  Scene3D.tsx         3D animated background
lib/
  safety/             Word filter, word list, blocked-message text
  llm.ts              FastRouter client, moderation checks, Nova's instructions
  rate-limit.ts       Per-visitor message limit
tests/
  filter.test.ts      Word-filter tests
```

## Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js automatically.
2. In **Settings → Environment Variables**, add `FASTROUTER_API_KEY` (and optionally `FASTROUTER_MODEL`). `.env.local` is not uploaded, so the key must be set here.
3. Deploy. Redeploy after changing environment variables.

## Notes before going public

- The message limit is stored in memory, so it only works on a single server. Use a shared store such as Redis if you deploy across several servers.
- If real children will use the app, you need parental consent and a privacy policy under laws like COPPA (US) and India's DPDP Act.
- No filter is perfect. This app reduces risk but does not replace adult supervision.
