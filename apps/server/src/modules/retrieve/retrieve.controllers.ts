import type { Request, Response } from 'express';
import { quicker } from '@repo/utils';

import { IndexData } from './retreive.types.js';
import { retriveService } from './retrieve.services.js';
import { retrieveUtils } from './retrieve.utils.js';



let index: IndexData | undefined;


const k1 = 1.5;
const B = 0.75;

const getAllDocs = async (req: Request, res: Response) => {
  const { query, lm } = req.query as { query: string, lm: string };
  const limit = parseInt(lm)

  try {
    index ??= retriveService.loadIndex();
    if (!index) {
      return res.status(503).json({
        success: false,
        message: 'Search index is not ready yet.',
      });
    }

    const searchIndex = index;
    const scoreMap = new Map()
    const tokens = quicker.generateTokens(query)

    for (const token of new Set(tokens)) {
      for (const { term, weight } of retriveService.resolveToken(searchIndex, token)) {
        const entry = searchIndex.lexicon[term];
        if (!entry) {
          throw new Error(`Missing lexicon entry for term "${term}"`);
        }
        const { df, off, len } = entry;
        const postings = JSON.parse(retrieveUtils.readSlice(searchIndex.postings, off, len))
        const idf = Math.log(1 + (searchIndex.meta.N - df + 0.5) / (df * 0.5))

        for (const [unitId, tf] of postings) {
          const unitLen = searchIndex.meta.lens[unitId];
          if (unitLen === undefined) {
            throw new Error(`Missing index length for unit ${unitId}`);
          }
          const norm = 1 - B + (B * unitLen) / searchIndex.meta.avgLen
          const score = weight * idf * ((tf * (k1 + 1)) / (tf + k1 + norm))
          scoreMap.set(unitId, (scoreMap.get(unitId) || 0) + score)
        }
      }
    }

    const bestPerDoc = new Map();
    for (const [unitId, score] of [...scoreMap].sort((a, b) => b[1] - a[1])) {
      const unit = retriveService.getUnit(searchIndex, unitId)
      if (!bestPerDoc.has(unitId)) {
        bestPerDoc.set(unitId, { ...unit, score, snippet: unit.text.slice(0, 200) })
      }

      if (bestPerDoc.size >= limit) break;
    }

    const result = [...bestPerDoc.values()]
    res.status(200).json({
      success: true,
      message: 'Results are here!',
      data: result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      err: errorMessage,
    });
  }
};

export const retrieveController = {
  getAllDocs,
};
