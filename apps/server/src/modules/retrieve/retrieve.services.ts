import { quicker } from "@repo/utils";
import { IndexData, LexiconEntry, ResolvedType } from "./retreive.types.js";
import { retrieveUtils } from "./retrieve.utils.js";

const { openFile, fileRead, parseJSON, readSlice, readSliceDescriptor } = retrieveUtils

const k1 = 1.5;
const B = 0.75;

const loadIndex = (): IndexData | undefined => {
  try {
    return {
      units: fileRead('units.ndjson'),
      postings: fileRead('postings.ndjson'),
      positions: fileRead('positions.ndjson'),
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

const getPostings = (index: IndexData, term: string): [number, number][] => {
  const { off, len } = index.lexicon[term] as LexiconEntry;
  const fd = openFile("postings.ndjson")
  return JSON.parse(readSliceDescriptor(fd, off, len))
}

const getPositions = (index: IndexData, term: string): number[][] => {
  const { pOff, pLen } = index.lexicon[term] as LexiconEntry;
  const fd = openFile("positions.ndjson")
  const positions = JSON.parse(readSliceDescriptor(fd, pOff, pLen)) as number[][]
  return positions.map(pos => {
    let prev = 0

    return pos.map((p) => prev += p)
  })
}

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

const phraseMatches = (index: IndexData, q: { stem: string, pos: number }[]) => {
  if (q.some(({ stem }) => !index.lexicon[stem])) return []

  const postings = q.map(t => {
    const post = getPostings(index, t.stem)
    const pos = getPositions(index, t.stem)

    const hash = new Map<number, Set<number>>();
    post.forEach(([unitId], idx) => hash.set(unitId, new Set(pos[idx])))
    return hash
  })

  const output: { unitId: number, tf: number }[] = []
  for (const [unitId, first] of postings[0]!) {
    if (!postings.every((post) => post.has(unitId))) continue
    let count = 0;

    for (const pos of first) {
      let ok = true

      for (let j = 1; j < q.length && ok; j++) {
        ok = postings[j]!.get(unitId)!.has(pos + q[j]!.pos - q[0]!.pos)
      }
      if (ok) count++
    }

    if (count) output.push({ unitId, tf: count })
  }
  return output
}


const bm25 = (tf: number, df: number, len: number, meta: IndexData['meta']) => {
  const idf = Math.log(1 + (meta.N - df + 0.5) / (df + 0.5))
  const norm = 1 - B + (B * len) / meta.avgLen
  return idf * ((tf * (k1 + 1)) / (tf + k1 * norm))
}

export const retriveService = {
  loadIndex,
  resolveToken,
  getUnit,
  phraseMatches,
  getPostings,
  bm25
}