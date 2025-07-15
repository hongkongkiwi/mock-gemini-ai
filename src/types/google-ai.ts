// Google AI (Gemini API) types
// These are simpler than Vertex AI types and use different structure

export interface GoogleAIContent {
  parts: GoogleAIPart[];
  role?: 'user' | 'model';
}

export interface GoogleAIPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
}

export interface GoogleAIGenerateContentRequest {
  contents: GoogleAIContent[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: string;
    responseSchema?: any;
  };
  safetySettings?: GoogleAISafetySetting[];
  systemInstruction?: GoogleAIContent;
  tools?: GoogleAITool[];
}

export interface GoogleAISafetySetting {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface GoogleAITool {
  functionDeclarations?: GoogleAIFunctionDeclaration[];
  codeExecution?: {
    language: 'PYTHON';
  };
  googleSearchRetrieval?: {
    disableAttribution?: boolean;
  };
}

export interface GoogleAIFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GoogleAICandidate {
  content: GoogleAIContent;
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  index?: number;
  safetyRatings?: GoogleAISafetyRating[];
  citationMetadata?: {
    citationSources: any[];
  };
  groundingMetadata?: {
    searchEntryPoint?: {
      renderedContent: string;
    };
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
      retrievedContext?: {
        uri: string;
        title: string;
        text: string;
      };
    }>;
    groundingSupports?: Array<{
      segment?: {
        startIndex: number;
        endIndex: number;
        text: string;
      };
      groundingChunkIndices?: number[];
      confidenceScores?: number[];
    }>;
    webSearchQueries?: string[];
  };
}

export interface GoogleAISafetyRating {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GoogleAIGenerateContentResponse {
  candidates: GoogleAICandidate[];
  promptFeedback?: {
    safetyRatings?: GoogleAISafetyRating[];
    blockReason?: string;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GoogleAICountTokensRequest {
  contents: GoogleAIContent[];
}

export interface GoogleAICountTokensResponse {
  totalTokens: number;
}

export interface GoogleAIEmbedContentRequest {
  content: GoogleAIContent;
  model?: string;
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
  title?: string;
  outputDimensionality?: number;
}

export interface GoogleAIEmbedContentResponse {
  embedding: {
    values: number[];
  };
}

export interface GoogleAIBatchEmbedContentsRequest {
  requests: GoogleAIEmbedContentRequest[];
}

export interface GoogleAIBatchEmbedContentsResponse {
  embeddings: {
    values: number[];
  }[];
}

export interface GoogleAIModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature: number;
  topP: number;
  topK: number;
}

// Google AI specific error response
export interface GoogleAIError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any[];
  };
}

// Simple model definitions for Google AI
export const googleAIModels: GoogleAIModel[] = [
  {
    name: 'gemini-pro',
    version: '1.0',
    displayName: 'Gemini Pro',
    description: 'Most capable model for complex tasks',
    inputTokenLimit: 32760,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'countTokens'],
    temperature: 0.9,
    topP: 1.0,
    topK: 1
  },
  {
    name: 'gemini-pro-vision',
    version: '1.0',
    displayName: 'Gemini Pro Vision',
    description: 'Multimodal model with vision capabilities',
    inputTokenLimit: 16384,
    outputTokenLimit: 2048,
    supportedGenerationMethods: ['generateContent', 'countTokens'],
    temperature: 0.4,
    topP: 1.0,
    topK: 32
  },
  {
    name: 'gemini-1.5-flash',
    version: '1.5',
    displayName: 'Gemini 1.5 Flash',
    description: 'Fast and efficient model',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'countTokens', 'embedContent'],
    temperature: 1.0,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-1.5-pro',
    version: '1.5',
    displayName: 'Gemini 1.5 Pro',
    description: 'Most capable multimodal model',
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'countTokens', 'embedContent'],
    temperature: 1.0,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'gemini-2.0-flash',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash',
    description: 'Latest fast model with multimodal capabilities',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent', 'countTokens', 'embedContent'],
    temperature: 1.0,
    topP: 0.95,
    topK: 64
  },
  {
    name: 'text-embedding-004',
    version: '1.0',
    displayName: 'Text Embedding 004',
    description: 'Text embedding model',
    inputTokenLimit: 3072,
    outputTokenLimit: 1,
    supportedGenerationMethods: ['embedContent'],
    temperature: 0.0,
    topP: 1.0,
    topK: 1
  }
];

// Utility function to find Google AI model by name
export function getGoogleAIModelByName(modelName: string): GoogleAIModel | undefined {
  return googleAIModels.find(model => model.name === modelName);
}

// Utility function to create default Google AI safety ratings
export function createDefaultGoogleAISafetyRatings(): GoogleAISafetyRating[] {
  return [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      probability: 'NEGLIGIBLE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      probability: 'NEGLIGIBLE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      probability: 'NEGLIGIBLE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      probability: 'NEGLIGIBLE'
    }
  ];
} 