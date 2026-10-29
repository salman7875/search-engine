export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export type RetrieveData = {
  id: number;
  docId: number;
  title: string;
  text: string;
  len: number;
  score: number;
  snippet: string;
};
