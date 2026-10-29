import { quicker } from "@repo/utils";
import { IndexData, ResolvedType } from "./retreive.types.js";
import { retrieveUtils } from "./retrieve.utils.js";

const { fileRead, parseJSON, readSlice } = retrieveUtils

const loadIndex = (): IndexData | undefined => {
  try {
    return {
      units: fileRead('units.ndjson'),
      postings: fileRead('postings.ndjson'),
      unitOffsets: parseJSON<number[]>(
        fileRead('units.offset.json'),
      ),
      meta: parseJSON<IndexData['meta']>(
        fileRead('meta.json'),
      ),
      lexicon: parseJSON<IndexData['lexicon']>(
        fileRead('lexicon.json'),
      ),
      phonetic: parseJSON<IndexData['phonetic']>(
        fileRead('phonetic.json'),
      ),
    };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
};

const getUnit = (index: IndexData, id: number) => {
  const off = index.unitOffsets[id];
  const end = index.unitOffsets[id + 1] ?? index.units.length;
  if (off === undefined) {
    throw new Error(`Missing index offset for unit ${id}`);
  }
  return JSON.parse(readSlice(index.units, off, end - off));
};



const resolveToken = (index: IndexData, token: string): ResolvedType[] => {
  if (index.lexicon[token]) {
    return [{ term: token, weight: 1 }]
  }
  const data = new Set<string>();
  const phTokens = quicker.generatePhoneticTokens(token)

  for (const phToken of phTokens) {
    for (const t of index.phonetic[phToken] ?? []) {
      data.add(t)
    }
  }

  const terms = [...data].flatMap((term) => {
    const entry = index.lexicon[term];
    return entry ? [{ term, df: entry.df }] : [];
  });
  return terms
    .sort((a, b) => b.df - a.df)
    .slice(0, 3)
    .map(({ term }) => ({ term, weight: 0.5 }));
}

export const retriveService = {
  loadIndex,
  resolveToken,
  getUnit
}