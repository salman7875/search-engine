import natural from "natural";
import { eng } from "./stopwords/stopword_eng.js";

const engSet = new Set(eng.map((w) => w.toLowerCase()));

const tokenizer = new natural.WordTokenizer();
const dm = new natural.DoubleMetaphone();

type ProcessedToken = {
  literal: string;
  phonetic: string | null;
  altPhonetic: string | null;
};

export const processTextPipeline = (text: string): ProcessedToken[] => {
  const tokens = (tokenizer.tokenize((text ?? "").toLowerCase()) ?? []).filter(
    (t) => !engSet.has(t),
  );

  return tokens.map((token) => {
    const literal = natural.PorterStemmer.stem(token);

    if (token.length < 3 || !/^[a-z]+$/.test(token)) {
      return { literal, phonetic: null, altPhonetic: null };
    }

    const [primary = "", secondary = ""] = dm.process(token, 6);
    return {
      literal,
      phonetic: primary || null,
      altPhonetic: secondary && secondary !== primary ? secondary : null,
    };
  });
};

const removeStopWords = (tokens: string[]): string[] => {
  return tokens.filter((t) => !engSet.has(t.toLowerCase()));
};

export const quicker = {
  removeStopWords,
  processTextPipeline,
};
