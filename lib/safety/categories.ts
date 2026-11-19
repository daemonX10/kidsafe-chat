export type SafetyCategory =
  | "adult"
  | "violence"
  | "drugs"
  | "self-harm"
  | "hate"
  | "profanity";

export type SafetyVerdict =
  | { safe: true }
  | {
      safe: false;
      category: SafetyCategory;
      source: "word-filter" | "ai-moderation";
      matched?: string;
    };

export const CATEGORY_LABELS: Record<SafetyCategory, string> = {
  adult: "18+ adult content",
  violence: "Violence / terrorism",
  drugs: "Drugs / alcohol",
  "self-harm": "Needs a trusted adult",
  hate: "Hateful language",
  profanity: "Bad language",
};

export function blockedReply(category: SafetyCategory): string {
  switch (category) {
    case "self-harm":
      return "It sounds like you might be going through something really hard, and you deserve support. Please talk to a parent, teacher, or another adult you trust right now. If you feel unsafe, call your local emergency number or a helpline (India: Childline 1098 or Tele-MANAS 14416, US: 988). You are not alone.";
    case "violence":
      return "This is an 18+ word. Topics about terrorism, weapons, or hurting people aren't allowed here. Let's talk about something fun or helpful instead!";
    case "drugs":
      return "This is an 18+ word. Drugs and alcohol aren't topics for this chat. Want to learn something cool about science or space instead?";
    case "hate":
      return "This is an 18+ word. Hateful words can really hurt people. Let's keep this chat kind and respectful.";
    case "profanity":
      return "This is an 18+ word. Let's use friendly words here. Try asking your question another way!";
    case "adult":
    default:
      return "This is an 18+ word. That's not something we can talk about here. Ask me about homework, stories, animals, or games instead!";
  }
}
