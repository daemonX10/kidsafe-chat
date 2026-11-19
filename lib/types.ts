import type { SafetyCategory } from "./safety/categories";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse =
  | { type: "reply"; text: string }
  | { type: "blocked"; category: SafetyCategory; label: string; text: string }
  | { type: "error"; text: string };

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_HISTORY = 12;
