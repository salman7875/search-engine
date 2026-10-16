import db from '@repo/db';
import {
  DocumentRecord,
  ScoreRecord,
  VocabularyRecord,
} from './retreive.types.js';

const getVocabs = (phoneticTokens: string[]): VocabularyRecord[] => {
  try {
    if (phoneticTokens.length === 0) return [];

    const placeholders = phoneticTokens.map(() => '?').join(', ');

    const explain =
      db.prepare(`EXPLAIN QUERY PLAN SELECT id, token, phonetic_token, alt_phonetic_token, idf_score 
      FROM vocabulary 
      WHERE phonetic_token IN (${placeholders}) OR alt_phonetic_token IN (${placeholders})`);
    console.log(
      'THIS IS EXPLAIN IN ACTION!! \n',
      explain.all([...phoneticTokens, ...phoneticTokens]),
    );

    return db
      .prepare(
        `
      SELECT id, token, phonetic_token, alt_phonetic_token, idf_score 
      FROM vocabulary 
      WHERE phonetic_token IN (${placeholders}) OR alt_phonetic_token IN (${placeholders})
    `,
      )
      .all([...phoneticTokens, ...phoneticTokens]) as VocabularyRecord[];
  } catch (error) {
    console.error(`Error in getVocabs:`, error);
    throw error;
  }
};

const getVocabFromToken = (tokens: string[]) => {
  try {
    const vocabs = getVocabs(tokens);
    const vocabMap = new Map(vocabs.map((v) => [v.id, v]));
    const tokenIds = vocabs.map((v) => v.id);
    return { vocabs, vocabMap, tokenIds };
  } catch (error) {
    console.error(`Error in getVocabFromToken:`, error);
    throw error;
  }
};

const getScores = (tokenIds: number[]) => {
  try {
    if (tokenIds.length === 0) return { scoresRes: [], docIds: [] };

    const placeholders = tokenIds.map(() => '?').join(', ');
    const scoresRes = db
      .prepare(`SELECT * FROM scores WHERE token_id IN (${placeholders})`)
      .all(tokenIds) as ScoreRecord[];
    //   const scoresRes = db
    //     .prepare(
    //       `
    //   SELECT token_id, doc_id, tf_score, position FROM (
    //     SELECT *, ROW_NUMBER() OVER (PARTITION BY token_id ORDER BY tf_score DESC) AS rn
    //     FROM scores
    //     WHERE token_id IN (${placeholders})
    //   )
    //   WHERE rn <= ?
    // `,
    //     )
    //     .all(...tokenIds, 10) as ScoreRecord[];
    console.log('✨', scoresRes.length, tokenIds.length);

    const docIds = [...new Set(scoresRes.map((s) => s.doc_id))];
    return { scoresRes, docIds };
  } catch (error) {
    console.error(`Error in getScores:`, error);
    throw error;
  }
};

const getDocs = (docIds: number[]) => {
  try {
    if (docIds.length === 0) return { docRes: [] };
    const placeholders = docIds.map(() => '?').join(', ');
    const docRes = db
      .prepare(
        `SELECT id, title, content, total_token FROM docs WHERE id IN (${placeholders})`,
      )
      .all(docIds) as DocumentRecord[];
    return { docRes };
  } catch (error) {
    console.error(`Error in getDocs:`, error);
    throw error;
  }
};

const weightingAndMergingDocs = (
  processedTokens: string[],
  documents: DocumentRecord[],
  scores: ScoreRecord[],
  vocabMap: Map<number, VocabularyRecord>,
) => {
  try {
    const docMap = new Map(
      documents.map((d) => [
        d.id,
        { ...d, content: d.content.substring(0, 500) },
      ]),
    );
    const docRankingMap = new Map<number, any>();

    for (const score of scores) {
      const vocab = vocabMap.get(score.token_id);
      if (!vocab) continue;

      const docId = score.doc_id;
      if (!docRankingMap.has(docId)) {
        docRankingMap.set(docId, {
          doc_id: docId,
          docs: docMap.get(docId),
          totalScore: 0,
          titleMatchBonus: 0,
          matchedLiteralToken: new Set<string>(),
          matchedPhoneticToken: new Set<string>(),
          tokenPosition: new Map<string, number[]>(),
        });
      }

      const docRankData = docRankingMap.get(docId)!;
      const position = score.position
        ? JSON.parse(score.position.toString('utf-8'))
        : [];

      docRankData.totalScore += score.tf_score * vocab.idf_score;
      docRankData.matchedLiteralToken.add(vocab.token.toLowerCase());
      docRankData.matchedPhoneticToken.add(vocab.phonetic_token.toLowerCase());
      docRankData.tokenPosition.set(vocab.token.toLowerCase(), position);
    }

    const finalResults = Array.from(docRankingMap.values()).map((doc) => {
      let totalDistance = 0;
      let pairsCompared = 0;

      for (let i = 0; i < processedTokens.length - 1; i++) {
        const currentToken = processedTokens[i]!.toLowerCase();
        const nextToken = processedTokens[i + 1]!.toLowerCase();

        if (doc.matchedLiteralToken.has(`${currentToken}-title`)) {
          doc.titleMatchBonus = 25;
        }

        if (currentToken === nextToken) continue;

        const pos1 =
          doc.tokenPosition.get(currentToken) ||
          doc.tokenPosition.get(`${currentToken}-title`);
        const pos2 =
          doc.tokenPosition.get(nextToken) ||
          doc.tokenPosition.get(`${nextToken}-title`);

        if (pos1 && pos2) {
          let minPairDistance = Infinity;
          for (const p1 of pos1) {
            for (const p2 of pos2) {
              const distance = p2 - p1;
              if (distance > 0 && distance < minPairDistance && distance < 50) {
                minPairDistance = distance;
              }
            }
          }
          if (minPairDistance !== Infinity) {
            totalDistance += minPairDistance;
            pairsCompared++;
          }
        }
      }

      let proximityBoost = 1.0;
      let proximityScore = 0;

      if (pairsCompared > 0 && totalDistance > 0) {
        proximityScore = (pairsCompared * 100) / totalDistance;
        const avgDistance = totalDistance / pairsCompared;
        proximityBoost += 12 / (1.5 + Math.log(avgDistance));
      }

      if (totalDistance >= 1000) {
        proximityBoost *= 0.4;
      }

      const docLength = Number(doc.docs?.total_token) || 1;
      const baselineLength = 1000;

      const lengthFactor = Math.sqrt(docLength / baselineLength);

      const normalizedTfIdf =
        lengthFactor > 1
          ? Number(doc.totalScore) / lengthFactor
          : Number(doc.totalScore) * (1 + (1 - lengthFactor) * 0.5);

      const totalQueryTokens = processedTokens.length || 1;
      const matchCoverageRatio =
        doc.matchedPhoneticToken.size / totalQueryTokens;
      const coverageBonus = matchCoverageRatio * 10;

      const baseScore =
        normalizedTfIdf + coverageBonus + (doc.titleMatchBonus || 0);

      const finalScore = baseScore * proximityBoost;

      return {
        doc_id: doc.doc_id,
        docs: doc.docs,
        totalScore: Number(doc.totalScore.toFixed(3)),
        proximityScore: Number(proximityScore.toFixed(3)),
        finalScore: Number(finalScore.toFixed(3)),
      };
    });

    return finalResults.sort((a, b) => b.finalScore - a.finalScore);
  } catch (error) {
    console.error(`Error in weightingAndMergingDocs:`, error);
    throw error;
  }
};

export const retrieveService = {
  getVocabFromToken,
  getScores,
  getDocs,
  weightingAndMergingDocs,
};
