import type { Request, Response } from 'express';
import { quicker } from '@repo/utils';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import fs from 'node:fs/promises';

import { retrieveService } from './retrieve.services.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const results: Record<string, number> = {};
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    results[entry.name] = Number(entry.duration.toFixed(2));
    console.log(`[Metric] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

observer.observe({ entryTypes: ['measure'], buffered: true });

const getAllDocs = async (req: Request, res: Response) => {
  Object.keys(results).forEach((key) => delete results[key]);
  const { query } = req.query as { query: string };

  try {
    if (!query || query.trim() === '') {
      return res.status(200).json({
        success: true,
        message: '[Invalid Query]: Please provide the query!',
        data: [],
      });
    }

    performance.mark('job-start');

    performance.mark('pipeline-start');
    const queryPipeline = quicker.processTextPipeline(query);
    performance.mark('pipeline-end');
    performance.measure('pipeline', 'pipeline-start', 'pipeline-end');

    performance.mark('mapping-pipeline-start');
    const phoneticTokens = queryPipeline.map((p) => p.phonetic);
    const literalTokens = queryPipeline.map((p) => p.literal);
    performance.mark('mapping-pipeline-end');
    performance.measure(
      'mapping-pipeline',
      'mapping-pipeline-start',
      'mapping-pipeline-end',
    );

    performance.mark('vocab-from-token-start');
    const { vocabMap, tokenIds } =
      retrieveService.getVocabFromToken(phoneticTokens);
    performance.mark('vocab-from-token-end');
    performance.measure(
      'vocab-from-token-end',
      'vocab-from-token-start',
      'vocab-from-token-end',
    );

    if (!tokenIds || tokenIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matching results found.',
        data: [],
      });
    }

    performance.mark('get-score-start');
    const { scoresRes, docIds } = retrieveService.getScores(tokenIds);
    performance.mark('get-score-end');
    performance.measure('get-score', 'get-score-start', 'get-score-end');

    if (!docIds || docIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No documents match the search criteria.',
        data: [],
      });
    }

    performance.mark('get-doc-start');
    const { docRes } = retrieveService.getDocs(docIds);
    performance.mark('get-doc-end');
    performance.measure('get-doc-end', 'get-doc-start', 'get-doc-end');

    performance.mark('weight-and-merge-start');
    const result = retrieveService.weightingAndMergingDocs(
      literalTokens,
      docRes,
      scoresRes,
      vocabMap,
    );
    performance.mark('weight-and-merge-end');
    performance.measure(
      'weight-and-merge',
      'weight-and-merge-start',
      'weight-and-merge-end',
    );

    performance.mark('job-end');
    performance.measure('total-job-time', 'job-start', 'job-end');

    await new Promise((resolve) => setImmediate(resolve));

    const outputPath = path.join(
      __dirname,
      '../../../../../metrics/',
      'retrieving-perf-results.json',
    );

    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          processedAt: new Date().toISOString(),
          metrics: results,
        },
        null,
        2,
      ),
      'utf-8',
    );

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
