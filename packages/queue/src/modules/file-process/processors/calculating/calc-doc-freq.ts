import { quicker } from "@repo/utils";

export const calculateDocFrequency = (
  data: { id: string; title: string; text: string }[],
) => {
  try {
    const docFrequency = new Map<string, number>();
    const processedTokensList: string[][] = [];
    const processedTitleTokensList: string[][] = [];

    const unProcessedTokensList: {
      literal: string;
      phonetic: string | null;
      altPhonetic: string | null;
    }[][] = [];
    const unProcessedTitleTokensList: {
      literal: string;
      phonetic: string;
      altPhonetic: string;
    }[][] = [];

    for (const d of data) {
      const bodyPipeline = quicker.processTextPipeline(d.text);
      const titlePipeline = quicker.processTextPipeline(d.title);

      const titleTokens = titlePipeline.map((p) => `${p.literal}-title`);
      const bodyTokens = bodyPipeline.map((p) => p.literal);

      unProcessedTokensList.push(bodyPipeline);
      unProcessedTitleTokensList.push(titlePipeline);

      processedTitleTokensList.push(titlePipeline.map((p) => p.literal));

      const integratedTokens = [...titleTokens, ...bodyTokens];
      processedTokensList.push(integratedTokens);

      const uniqueTokensInDoc = new Set(integratedTokens);

      for (const token of uniqueTokensInDoc) {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      }
    }

    return {
      docFrequency,
      processedToken: processedTokensList,
      processedTitleTokens: processedTitleTokensList,
      unProcessedToken: unProcessedTokensList,
      unProcessedTitleTokens: unProcessedTitleTokensList,
    };
  } catch (error) {
    console.error(`Error in calculateDocFrequencyJSON:`, error);
    throw error;
  }
};
