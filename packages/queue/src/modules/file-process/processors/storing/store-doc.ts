import db from "@repo/db";

export const storeDoc = (
  data: { id: string; title: string; text: string }[],
) => {
  try {
    const docIds: number[] = [];
    const insertDoc = db.prepare(`
      INSERT INTO docs (title, content, total_token) 
      VALUES (?, ?, ?) 
      ON CONFLICT(title) DO UPDATE SET content=excluded.content, total_token=excluded.total_token
      RETURNING id;
    `);

    const insertMany = db.transaction((docsList) => {
      for (const doc of docsList) {
        const tokensCount = doc.text ? doc.text.match(/\S+/g)?.length || 0 : 0;
        const result = insertDoc.get(doc.title, doc.text, tokensCount) as {
          id: number;
        };
        docIds.push(result.id);
      }
    });

    insertMany(data);
    return { docData: data, docIds };
  } catch (error) {
    console.error(`Error in storeDocDataJSON:`, error);
    throw error;
  }
};
