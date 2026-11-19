# KidSafe Chat

A safe AI chatbot for kids and teens under 18. Ask **Nova** about homework, science, stories, or games. Adult, violent, terrorist, drug, and hateful words are blocked with a clear **"This is an 18+ word"** message.

Built with Next.js, React Three Fiber (3D animated background), Tailwind CSS, and the OpenAI API.

## Features

- **Four safety checks** on every message:
  1. **Word filter.** Blocks bad words instantly, even tricks like `s3x`, `f.u.c.k`, `fuuuck`, `f*ck`. Works without an API key.
  2. **AI moderation.** OpenAI's free moderation model catches harmful meaning without bad words (e.g. "how do I hurt someone"). Limits are stricter than the defaults because the users are kids.
  3. **Kid-safe instructions.** Nova is told to stay age-appropriate, refuse jailbreak tricks, and never ask for personal information.
  4. **Answer check.** Nova's own reply is checked again before it is shown.
- **Self-harm support.** Messages about self-harm get a kind reply pointing to a trusted adult and helplines, not a "blocked" message.
- **3D dark-blue theme.** A glowing orb follows the mouse and changes colour: blue when idle, purple while thinking, red with a shake when a message is blocked.
- **Privacy and abuse limits.** The API key stays on the server, chats are not stored by OpenAI (`store: false`), each visitor is limited to 20 messages a minute, and messages are capped at 1,000 characters.

## Requirements

- [Node.js](https://nodejs.org/) **20 or newer** (22 recommended). Check with `node -v`.
- An [OpenAI API key](https://platform.openai.com/api-keys) with **credits** added at [Billing](https://platform.openai.com/settings/organization/billing/). A ChatGPT Plus subscription does not include API credits.

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

### 3. Add your OpenAI API key

Copy the example file to `.env.local`:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Open `.env.local` and replace the placeholder with your key:

```env
OPENAI_API_KEY=sk-proj-your-real-key
# Optional: use a different chat model (default: gpt-5.4-mini)
OPENAI_MODEL=
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
| Nova's personality and rules, moderation strictness | [`lib/openai.ts`](lib/openai.ts) |
| Chat API logic | [`app/api/chat/route.ts`](app/api/chat/route.ts) |
| Chat UI | [`components/ChatApp.tsx`](components/ChatApp.tsx) |
| 3D background | [`components/Scene3D.tsx`](components/Scene3D.tsx) |

Run `npm test` after editing the word list to check nothing innocent gets blocked.

## Troubleshooting

| Message in the chat | Fix |
|---|---|
| "the OpenAI account has no credits left" | Add credits at [OpenAI Billing](https://platform.openai.com/settings/organization/billing/), wait a minute, try again. |
| "the OpenAI API key is invalid" | Check `OPENAI_API_KEY` in `.env.local`. |
| "The chatbot isn't set up yet" | `.env.local` is missing or has no key. See step 3. |
| "the model ... isn't available" | Set `OPENAI_MODEL` in `.env.local` to a model your account can use (e.g. `gpt-4.1-mini`). |
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
  openai.ts           OpenAI client, moderation limits, Nova's instructions
  rate-limit.ts       Per-visitor message limit
tests/
  filter.test.ts      Word-filter tests
```

## Notes before going public

- The message limit is stored in memory, so it only works on a single server. Use a shared store such as Redis if you deploy across several servers.
- If real children will use the app, you need parental consent and a privacy policy under laws like COPPA (US) and India's DPDP Act.
- No filter is perfect. This app reduces risk but does not replace adult supervision.
