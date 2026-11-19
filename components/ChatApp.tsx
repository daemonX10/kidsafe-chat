"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CATEGORY_LABELS, blockedReply } from "@/lib/safety/categories";
import { checkWordFilter } from "@/lib/safety/filter";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, type ChatMessage, type ChatResponse } from "@/lib/types";
import type { Mood } from "./Scene3D";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

type UiMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  kind: "normal" | "blocked" | "error";
  label?: string;
};

const SUGGESTIONS = [
  "Why is the sky blue?",
  "Tell me a funny space joke",
  "Help me understand fractions",
  "Give me a fun science experiment",
];

const SAFETY_LAYERS = ["Word shield", "AI moderation", "Kid-safe brain", "Answer check"];

let nextId = 1;

export default function ChatApp() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState<Mood>("idle");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => clearTimeout(moodTimer.current), []);

  function flashBlocked() {
    setMood("blocked");
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("idle"), 2200);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: UiMessage = { id: nextId++, role: "user", content, kind: "normal" };
    const local = checkWordFilter(content);
    if (!local.safe) {
      setMessages((m) => [
        ...m,
        { ...userMsg, kind: "blocked" },
        {
          id: nextId++,
          role: "assistant",
          content: blockedReply(local.category),
          kind: "blocked",
          label: CATEGORY_LABELS[local.category],
        },
      ]);
      flashBlocked();
      return;
    }

    const history: ChatMessage[] = [...messages, userMsg]
      .filter((m) => m.kind === "normal")
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content }));

    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setMood("thinking");

    let data: ChatResponse;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      data = await res.json();
    } catch {
      data = { type: "error", text: "I couldn't connect. Check your internet and try again." };
    }

    setLoading(false);
    if (data.type === "blocked") {
      setMessages((m) => [
        ...m.map((x) => (x.id === userMsg.id ? { ...x, kind: "blocked" as const } : x)),
        { id: nextId++, role: "assistant", content: data.text, kind: "blocked", label: data.label },
      ]);
      flashBlocked();
    } else {
      setMessages((m) => [
        ...m,
        { id: nextId++, role: "assistant", content: data.text, kind: data.type === "error" ? "error" : "normal" },
      ]);
      setMood("idle");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#030712] text-slate-100">
      <div className="absolute inset-0">
        <Scene3D mood={mood} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.15),transparent_55%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-10 lg:p-8">
        <section className="pointer-events-none flex shrink-0 flex-col justify-between lg:w-[45%]">
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/30">
              <ShieldIcon />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">KidSafe Chat</h1>
              <p className="text-xs text-sky-200/70">A safe AI buddy for under-18s</p>
            </div>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <h2 className="bg-gradient-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-5xl font-bold leading-tight text-transparent">
              Hi, I&apos;m Nova.
            </h2>
            <p className="mt-3 max-w-md text-slate-300">
              Ask me anything about school, science, stories, or games. I keep every chat friendly and safe.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SAFETY_LAYERS.map((layer, i) => (
                <span
                  key={layer}
                  className="rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-xs text-sky-200 backdrop-blur"
                >
                  {i + 1}. {layer}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, x: 40, rotateY: -12 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformPerspective: 1200 }}
          className="mt-auto flex h-[62dvh] min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 shadow-2xl shadow-blue-950/50 backdrop-blur-xl lg:mt-0 lg:h-auto"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${moodDot(mood)} shadow-[0_0_10px_currentColor]`} />
              <span className="text-sm font-medium">Nova</span>
              <span className="text-xs text-slate-400">
                {mood === "thinking" ? "thinking..." : mood === "blocked" ? "blocked a message" : "online"}
              </span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                Clear chat
              </button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
                <p className="text-slate-300">What would you like to learn today?</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void send(s)}
                      className="rounded-2xl border border-sky-400/15 bg-gradient-to-br from-sky-500/10 to-violet-500/10 px-4 py-3 text-left text-sm text-sky-100 transition hover:border-sky-400/40"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Bubble message={m} />
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-1.5 px-2 py-3"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-violet-400"
                      animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/10 p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 transition focus-within:border-sky-400/50 focus-within:shadow-[0_0_24px_rgba(56,189,248,0.15)]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder="Ask Nova something..."
                aria-label="Message"
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500"
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || loading}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                aria-label="Send"
                className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/25 disabled:opacity-40"
              >
                <SendIcon />
              </motion.button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Nova can make mistakes. Never share your address, school, phone number, or passwords.
            </p>
          </form>
        </motion.section>
      </div>
    </main>
  );
}

function Bubble({ message: m }: { message: UiMessage }) {
  if (m.role === "user") {
    return (
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md px-4 py-2.5 text-sm shadow-lg ${
          m.kind === "blocked"
            ? "bg-red-500/15 text-red-200 line-through decoration-red-400/60 ring-1 ring-red-400/30"
            : "bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-blue-900/40"
        }`}
      >
        {m.content}
      </div>
    );
  }
  if (m.kind === "blocked") {
    return (
      <motion.div
        animate={{ x: [0, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.45 }}
        className="max-w-[85%] rounded-2xl rounded-bl-md border border-red-400/30 bg-gradient-to-br from-red-500/15 to-orange-500/10 px-4 py-3 text-sm shadow-lg shadow-red-950/40"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">18+</span>
          <span className="text-xs font-semibold text-red-200">{m.label}</span>
        </div>
        <p className="text-red-50/90">{m.content}</p>
      </motion.div>
    );
  }
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed ${
        m.kind === "error"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/[0.06] text-slate-100"
      }`}
    >
      {m.content}
    </div>
  );
}

function moodDot(mood: Mood) {
  return mood === "thinking" ? "bg-violet-400 text-violet-400" : mood === "blocked" ? "bg-red-500 text-red-500" : "bg-emerald-400 text-emerald-400";
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
