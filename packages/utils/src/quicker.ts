import natural from "natural";
import { eng } from "./stopwords/stopword_eng.js";

const engSet = new Set(eng.map((w) => w.toLowerCase()));

const removeStopWords = (tokens: string[]): string[] => {
  return tokens.filter((t) => !engSet.has(t.toLowerCase()));
};

const processTextPipeline = (
  text: string,
): { literal: string; phonetic: string; altPhonetic: string }[] => {
  try {
    const tokenizer = new natural.WordTokenizer();
    const dm = new natural.DoubleMetaphone();

    const rawTokens = tokenizer.tokenize(text || "") || [];
    const filteredTokens = rawTokens.filter(
      (t) => !engSet.has(t.toLowerCase()),
    );

    return filteredTokens.map((token) => {
      const stemmed = natural.PorterStemmer.stem(token.toLowerCase());
      const phoneticResult = dm.process(token, 4);
      return {
        literal: stemmed,
        phonetic: (phoneticResult[0] || "").toLowerCase(),
        altPhonetic: (phoneticResult[1] || "").toLowerCase(),
      };
    });
  } catch (error) {
    console.error(`Error in text pipeline processing:`, error);
    throw error;
  }
};

export const quicker = {
  removeStopWords,
  processTextPipeline,
};
