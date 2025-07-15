export interface CachedContent {
  name: string;
  model: string;
  systemInstruction?: {
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  };
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
    role?: string;
  }>;
  ttl?: string;
  expireTime?: string;
  createTime?: string;
  updateTime?: string;
  usageMetadata?: {
    totalTokenCount: number;
  };
}

export interface CreateCachedContentRequest {
  model: string;
  systemInstruction?: {
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  };
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
    role?: string;
  }>;
  ttl?: string;
  labels?: Record<string, string>;
}

export interface ListCachedContentsResponse {
  cachedContents: CachedContent[];
  nextPageToken?: string;
} 