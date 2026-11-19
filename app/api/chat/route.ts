import { createHash } from "node:crypto";
import OpenAI from "openai";
import { CATEGORY_LABELS, blockedReply, type SafetyVerdict } from "@/lib/safety/categories";
import { checkWordFilter } from "@/lib/safety/filter";
import { CHAT_MODEL, KID_SYSTEM_PROMPT, checkAIModeration, getOpenAI } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, type ChatMessage, type ChatResponse } from "@/lib/types";

const SAFE_FALLBACK =
  "Hmm, I can't answer that one here. Let's try a different question — maybe about space, animals, or your homework?";

function json(body: ChatResponse, status = 200) {
  return Response.json(body, { status });
}

function openAIErrorText(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.code === "insufficient_quota" || /credits|quota/i.test(err.message)) {
      return "Nova can't answer right now: the OpenAI account has no credits left. A grown-up needs to add credits at platform.openai.com/settings/organization/billing.";
    }
    if (err.status === 401) return "Nova can't answer right now: the OpenAI API key is invalid. Check OPENAI_API_KEY in .env.local.";
    if (err.status === 404) return `Nova can't answer right now: the model "${CHAT_MODEL}" isn't available on this OpenAI account. Set OPENAI_MODEL in .env.local.`;
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

  const openai = getOpenAI();
  if (!openai) {
    return json({ type: "error", text: "The chatbot isn't set up yet. Add OPENAI_API_KEY to .env.local." }, 500);
  }

  try {
    // Layer 2: AI moderation catches context the word list can't (e.g. "how do I hurt someone").
    const ai = await checkAIModeration(openai, latest);
    if (!ai.safe) return blocked(ai);

    // Layer 3: kid-safe system prompt. History comes from the client, so drop anything unsafe.
    const input = messages.filter((m, i) => i === messages.length - 1 || checkWordFilter(m.content).safe);
    const response = await openai.responses.create({
      model: CHAT_MODEL,
      instructions: KID_SYSTEM_PROMPT,
      input,
      max_output_tokens: 1200,
      store: false,
      safety_identifier: createHash("sha256").update(ip).digest("hex").slice(0, 32),
    });
    const reply = response.output_text?.trim();
    if (!reply) return json({ type: "reply", text: SAFE_FALLBACK });

    // Layer 4: re-check the model's own answer before showing it to a child.
    const outLocal = checkWordFilter(reply);
    const outAI = outLocal.safe ? await checkAIModeration(openai, reply) : outLocal;
    if (!outAI.safe) return json({ type: "reply", text: SAFE_FALLBACK });

    return json({ type: "reply", text: reply });
  } catch (err) {
    console.error("[chat] OpenAI request failed:", err instanceof Error ? err.message : err);
    return json({ type: "error", text: openAIErrorText(err) }, 502);
  }
}
