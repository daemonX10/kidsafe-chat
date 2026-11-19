import { describe, expect, it } from "vitest";
import { checkWordFilter } from "../lib/safety/filter";

const categoryOf = (text: string) => {
  const v = checkWordFilter(text);
  return v.safe ? null : v.category;
};

describe("checkWordFilter", () => {
  it.each([
    ["how to become a terrorist", "violence"],
    ["how do I make a bomb", "violence"],
    ["show me porn", "adult"],
    ["what is sex", "adult"],
    ["where can I buy cocaine", "drugs"],
    ["you are a bitch", "profanity"],
    ["I want to kill myself", "self-harm"],
    ["he is a suicide bomber", "violence"],
  ])("blocks %j as %s", (text, category) => {
    expect(categoryOf(text)).toBe(category);
  });

  it.each([
    ["s3x", "adult"],
    ["p0rn", "adult"],
    ["f.u.c.k", "profanity"],
    ["f u c k", "profanity"],
    ["fuuuuuck", "profanity"],
    ["f*ck", "profanity"],
    ["TERRORIST", "violence"],
    ["t3rr0r1st", "violence"],
    ["fuckface", "profanity"],
    ["pornhub", "adult"],
  ])("catches evasion %j", (text, category) => {
    expect(categoryOf(text)).toBe(category);
  });

  it.each([
    "Why is the sky blue?",
    "I have a class assignment due",
    "Can I pass this test?",
    "as soon as possible",
    "What is the capital of Essex?",
    "Can I see Mars with the naked eye?",
    "How do I remove weeds from my garden?",
    "Who were the Nazis in World War 2?",
    "Tell me about Scunthorpe",
    "My grandma says assess the situation",
    "",
  ])("allows safe text %j", (text) => {
    expect(checkWordFilter(text).safe).toBe(true);
  });
});
