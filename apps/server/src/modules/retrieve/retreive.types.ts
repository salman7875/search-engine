export type LexiconEntry = {
  df: number;
  off: number;
  len: number;
};

export type IndexData = {
  units: Buffer;
  postings: Buffer;
  unitOffsets: number[];
  meta: {
    N: number;
    avgLen: number;
    lens: number[];
  };
  lexicon: Record<string, LexiconEntry>;
  phonetic: Record<string, string[]>;
};

export type ResolvedType = {
  term: string;
  weight: number;
}