import { CATEGORY_LABELS, blockedReply, type SafetyVerdict } from "@/lib/safety/categories";
import { checkWordFilter } from "@/lib/safety/filter";
import { CHAT_MODEL, LLMError, checkAIModeration, generateKidReply, getApiKey } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, type ChatMessage, type ChatResponse } from "@/lib/types";

const SAFE_FALLBACK =
  "Hmm, I can't answer that one here. Let's try a different question — maybe about space, animals, or your homework?";

function json(body: ChatResponse, status = 200) {
  return Response.json(body, { status });
}

function llmErrorText(err: unknown): string {
  if (err instanceof LLMError) {
    if (err.status === 401 || err.status === 403) {
      return "Nova can't answer right now: the FastRouter API key is invalid. Check FASTROUTER_API_KEY in your environment variables.";
    }
    if (err.status === 402 || /credit|balance|quota/i.test(err.message)) {
      return "Nova can't answer right now: the FastRouter account is out of credits. A grown-up needs to top it up.";
    }
    if (err.status === 404) {
      return `Nova can't answer right now: the model "${err.model}" isn't available on FastRouter.`;
    }
    if (err.status === 429) return "Nova is getting too many questions right now. Please wait a minute and try again.";
  }
  return "Nova is taking a quick nap. Please try again in a moment.";
}

function blocked(verdict: Exclude<SafetyVerdict, { safe: true }>) {
  return json({
    type: "blocked",
    category: verdict.category,
    label: CATEGORY_LABELS[verdict.category],
    text: blockedReply(verdict.category),
  });
}

function parseMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return null;
  }
  const raw = (body as { messages: unknown[] }).messages.slice(-MAX_HISTORY);
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_CHARS) return null;
    messages.push({ role, content: trimmed });
  }
  return messages.length && messages[messages.length - 1].role === "user" ? messages : null;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) {
    return json({ type: "error", text: "Whoa, slow down a little! Try again in a minute." }, 429);
  }

  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) {
    return json({ type: "error", text: `Please send a message under ${MAX_MESSAGE_CHARS} characters.` }, 400);
  }
  const latest = messages[messages.length - 1].content;

  // Layer 1: instant local word filter (works even without an API key).
  const local = checkWordFilter(latest);
  if (!local.safe) return blocked(local);

  const apiKey = getApiKey();
  if (!apiKey) {
    return json({ type: "error", text: "The chatbot isn't set up yet. Add FASTROUTER_API_KEY to .env.local." }, 500);
  }

  try {
    // Layer 2: AI moderation catches context the word list can't (e.g. "how do I hurt someone").
    const ai = await checkAIModeration(apiKey, latest);
    if (!ai.safe) return blocked(ai);

    // Layer 3: kid-safe system prompt. History comes from the client, so drop anything unsafe.
    const input = messages.filter((m, i) => i === messages.length - 1 || checkWordFilter(m.content).safe);
    const reply = await generateKidReply(apiKey, input);
    if (!reply) return json({ type: "reply", text: SAFE_FALLBACK });

    // Layer 4: re-check the model's own answer before showing it to a child.
    const outLocal = checkWordFilter(reply);
    const outAI = outLocal.safe ? await checkAIModeration(apiKey, reply) : outLocal;
    if (!outAI.safe) return json({ type: "reply", text: SAFE_FALLBACK });

    return json({ type: "reply", text: reply });
  } catch (err) {
    console.error(`[chat] FastRouter request failed (${CHAT_MODEL}):`, err instanceof Error ? err.message : err);
    return json({ type: "error", text: llmErrorText(err) }, 502);
  }
}
