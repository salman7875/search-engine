import type { APIResponse, RetrieveData } from "../types/api.types";
import { handleAPIError } from "../utils/error";

const API_URL = "http://localhost:3000";

const getUploadUrl = async (fileName: string, fileType: string, file: any) => {
  try {
    const res = await fetch(`${API_URL}/doc/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileType }),
    });
    if (!res.ok) {
      const errorText = await res
        .text()
        .catch(() => "Failed to get upload url response");
      throw new Error(`Server Error (${res.status}): ${errorText}`);
    }
    const resData = await res.json();

    if (!resData.sucess) {
      throw new Error("Failed to get upload url response");
    }

    const { uploadUrl } = resData.data;

    const s3UploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": fileType },
      body: file,
    });

    if (!s3UploadResponse.ok) {
      throw new Error("Failed to upload file to s3!");
    }
  } catch (error) {
    handleAPIError(error);
    throw error;
  }
};

const getResult = async (q: string): Promise<RetrieveData[]> => {
  try {
    const encodedQuery = encodeURIComponent(q);
    const res = await fetch(`${API_URL}/doc/retrieve?query=${encodedQuery}`);
    const resData: APIResponse<RetrieveData[]> = await res.json();

    if (!res.ok || !resData.success) {
      throw new Error(resData.message ?? "Failed to fetch response");
    }

    if (!Array.isArray(resData.data)) {
      throw new Error("The search response did not contain a results list.");
    }

    return resData.data;
  } catch (error) {
    handleAPIError(error);
    throw error;
  }
};

const createData = async (formData: any) => {
  try {
    const res = await fetch(`${API_URL}/doc/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Failed to upload data");
      throw new Error(`Server Error (${res.status}): ${errorText}`);
    }

    const resData: APIResponse<void> = await res.json();

    if (!resData.success) {
      throw new Error(resData.message ?? "Failed to upload response");
    }

    return resData;
  } catch (error) {
    handleAPIError(error);
    throw error;
  }
};

export const API = {
  createData,
  getUploadUrl,
  getResult,
};
