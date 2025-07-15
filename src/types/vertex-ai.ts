/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Import official types from the Google Cloud Vertex AI package
import {
  Content,
  Part,
  TextPart,
  InlineDataPart,
  FileDataPart,
  FunctionCallPart,
  FunctionResponsePart,
  FileData,
  GenerativeContentBlob,
  SafetyRating,
  SafetySetting,
  GenerationConfig,
  GenerateContentRequest,
  GenerateContentResponse,
  FunctionCall,
  FunctionResponse,
  FunctionDeclaration,
  FunctionDeclarationsTool,
  FunctionCallingMode,
  FunctionCallingConfig,
  ToolConfig,
  Schema,
  SchemaType,
  FunctionDeclarationSchema,
  FunctionDeclarationSchemaType,
  GroundingMetadata,
  GroundingChunk,
  GroundingSupport,
  Tool,
  RetrievalTool,
  GoogleSearchRetrievalTool,
  GetGenerativeModelParams,
  ModelParams,
  BaseModelParams,
  CountTokensRequest,
  CountTokensResponse,
  StartChatParams,
  ResponseSchema,
  GoogleDate,
  GoogleGenerativeAIError,
  VertexInit,
  VertexAI,
  GenerativeModel,
  ChatSession,
  RequestOptions,
  CachedContent,
  UsageMetadata,
  Mode,
  SearchEntryPoint,
  GroundingChunkWeb,
  GroundingChunkRetrievedContext,
  GroundingSupportSegment,
  Retrieval,
  VertexAISearch,
  VertexRagStore,
  RagResource,
  GoogleSearchRetrieval,
  DynamicRetrievalConfig,
  FunctionDeclarationSchemaProperty,
  BlockedReason,
  FinishReason,
  CitationMetadata,
  Citation,
  HarmCategory,
  HarmBlockThreshold,
  HarmProbability,
  HarmSeverity,
} from '@google-cloud/vertexai';

// Additional types for advanced features not in official SDK yet
export interface CodeExecutionTool {
  codeExecution?: {}; // Empty object enables code execution
}

export interface GoogleSearchTool {
  googleSearchRetrieval: {
    disableAttribution?: boolean;
  };
}

export interface ExecutableCode {
  language: 'PYTHON'; // Currently only Python supported
  code: string;
}

export interface CodeExecutionResult {
  outcome: 'OUTCOME_OK' | 'OUTCOME_FAILED' | 'OUTCOME_DEADLINE_EXCEEDED';
  output: string; // stdout on success, stderr on failure
}

// Code execution parts - used within existing Part interface
export interface CodeExecutionPart {
  executableCode?: ExecutableCode;
}

export interface CodeExecutionResultPart {
  codeExecutionResult?: CodeExecutionResult;
}

// Enhanced Tool type with new tool types
export type EnhancedTool = Tool | CodeExecutionTool | GoogleSearchTool;

// Context Caching types
export interface CachedContentRequest {
  model: string;
  systemInstruction?: Content;
  contents?: Content[];
  tools?: EnhancedTool[];
  toolConfig?: ToolConfig;
  displayName?: string;
  ttl?: string;
  expireTime?: string;
}

export interface CachedContentResponse {
  name: string;
  model: string;
  displayName?: string;
  usageMetadata?: {
    totalTokenCount: number;
  };
  createTime: string;
  updateTime: string;
  expireTime: string;
}

export interface UpdateCachedContentRequest {
  cachedContent: {
    ttl?: string;
    expireTime?: string;
  };
  updateMask: {
    paths: string[];
  };
}

// Live API types
export interface LiveAPIConfig {
  responseModalities: ('AUDIO' | 'TEXT')[];
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: string;
      };
    };
  };
}

export interface LiveAPIMessage {
  clientContent?: {
    turns: Content[];
    turnComplete: boolean;
  };
  setupComplete?: {};
  realtimeInput?: {
    mediaChunks: {
      mimeType: string;
      data: string;
    }[];
  };
}

// Batch processing types
export interface BatchPredictionJob {
  displayName: string;
  model: string;
  inputConfig: {
    instancesFormat: 'jsonl';
    gcsSource: {
      uris: string[];
    };
  };
  outputConfig: {
    predictionsFormat: 'jsonl';
    gcsDestination: {
      outputUriPrefix: string;
    };
  };
}

// Model tuning types
export interface TuningJob {
  baseModel: string;
  supervisedTuningSpec: {
    trainingDatasetUri: string;
    validationDatasetUri?: string;
    hyperParameters?: {
      epochCount?: number;
      learningRateMultiplier?: number;
    };
  };
}

// Re-export all the types
export {
  Content,
  Part,
  TextPart,
  InlineDataPart,
  FileDataPart,
  FunctionCallPart,
  FunctionResponsePart,
  FileData,
  GenerativeContentBlob,
  HarmCategory,
  HarmBlockThreshold,
  HarmProbability,
  HarmSeverity,
  SafetyRating,
  SafetySetting,
  GenerationConfig,
  GenerateContentRequest,
  GenerateContentResponse,
  BlockedReason,
  FinishReason,
  CitationMetadata,
  Citation,
  FunctionCall,
  FunctionResponse,
  FunctionDeclaration,
  FunctionDeclarationsTool,
  FunctionCallingMode,
  FunctionCallingConfig,
  ToolConfig,
  Schema,
  SchemaType,
  FunctionDeclarationSchema,
  FunctionDeclarationSchemaType,
  GroundingMetadata,
  GroundingChunk,
  GroundingSupport,
  Tool,
  RetrievalTool,
  GoogleSearchRetrievalTool,
  GetGenerativeModelParams,
  ModelParams,
  BaseModelParams,
  CountTokensRequest,
  CountTokensResponse,
  StartChatParams,
  ResponseSchema,
  GoogleDate,
  GoogleGenerativeAIError,
  VertexInit,
  VertexAI,
  GenerativeModel,
  ChatSession,
  RequestOptions,
  CachedContent,
  UsageMetadata,
  Mode,
  SearchEntryPoint,
  GroundingChunkWeb,
  GroundingChunkRetrievedContext,
  GroundingSupportSegment,
  Retrieval,
  VertexAISearch,
  VertexRagStore,
  RagResource,
  GoogleSearchRetrieval,
  DynamicRetrievalConfig,
  FunctionDeclarationSchemaProperty,
};

// Additional types specific to our mock service
export interface MockServiceConfig {
  /** Default model to use for generation */
  defaultModel?: string;
  /** Whether to include safety ratings in responses */
  includeSafetyRatings?: boolean;
  /** Whether to include usage metadata in responses */
  includeUsageMetadata?: boolean;
  /** Default safety settings */
  defaultSafetySettings?: SafetySetting[];
}

// Response wrapper for our mock service
export interface MockResponse<T = any> {
  /** The response data */
  data: T;
  /** Metadata about the mock response */
  metadata: {
    /** The model used for this response */
    model: string;
    /** Whether this was a structured output request */
    isStructuredOutput?: boolean;
    /** The response format type */
    responseFormat?: 'text' | 'json' | 'enum';
    /** Schema used for structured output */
    schema?: Schema;
    /** Timestamp of response generation */
    timestamp: string;
  };
}

// Additional types for our preset responses
export interface PresetResponseEntry {
  /** The response content */
  response: GenerateContentResponse;
  /** Keywords or patterns that trigger this response */
  triggers: string[];
  /** Priority level (higher = preferred) */
  priority: number;
  /** Whether this is a multimodal response */
  isMultimodal?: boolean;
  /** Whether this supports structured output */
  supportsStructuredOutput?: boolean;
}

// Model information interface
export interface ModelInfo {
  /** The model name */
  name: string;
  /** Display name for the model */
  displayName: string;
  /** Description of the model */
  description: string;
  /** Model version */
  version: string;
  /** Input token limit */
  inputTokenLimit: number;
  /** Output token limit */
  outputTokenLimit: number;
  /** Supported features */
  supportedFeatures: string[];
  /** Whether the model supports multimodal input */
  supportsMultimodal: boolean;
  /** Whether the model supports function calling */
  supportsFunctionCalling: boolean;
  /** Whether the model supports structured output */
  supportsStructuredOutput: boolean;
}

// Export interface for backward compatibility
export interface VertexAITypes {
  // Make all the imported types available as properties
  Content: Content;
  Part: Part;
  TextPart: TextPart;
  InlineDataPart: InlineDataPart;
  FileDataPart: FileDataPart;
  FunctionCallPart: FunctionCallPart;
  FunctionResponsePart: FunctionResponsePart;
  HarmCategory: typeof HarmCategory;
  HarmBlockThreshold: typeof HarmBlockThreshold;
  HarmProbability: typeof HarmProbability;
  HarmSeverity: typeof HarmSeverity;
  SafetyRating: SafetyRating;
  SafetySetting: SafetySetting;
  GenerationConfig: GenerationConfig;
  GenerateContentRequest: GenerateContentRequest;
  GenerateContentResponse: GenerateContentResponse;
  BlockedReason: typeof BlockedReason;
  FinishReason: typeof FinishReason;
  Schema: Schema;
  SchemaType: typeof SchemaType;
  FunctionDeclaration: FunctionDeclaration;
  FunctionCall: FunctionCall;
  FunctionResponse: FunctionResponse;
  FunctionCallingMode: typeof FunctionCallingMode;
  Tool: Tool;
  ToolConfig: ToolConfig;
  CountTokensRequest: CountTokensRequest;
  CountTokensResponse: CountTokensResponse;
  ModelInfo: ModelInfo;
  PresetResponseEntry: PresetResponseEntry;
  MockResponse: MockResponse;
  MockServiceConfig: MockServiceConfig;
}

// Type guards for Part types
export function isTextPart(part: Part): part is TextPart {
  return 'text' in part && typeof part.text === 'string';
}

export function isInlineDataPart(part: Part): part is InlineDataPart {
  return 'inlineData' in part && part.inlineData !== undefined;
}

export function isFileDataPart(part: Part): part is FileDataPart {
  return 'fileData' in part && part.fileData !== undefined;
}

export function isFunctionCallPart(part: Part): part is FunctionCallPart {
  return 'functionCall' in part && part.functionCall !== undefined;
}

export function isFunctionResponsePart(part: Part): part is FunctionResponsePart {
  return 'functionResponse' in part && part.functionResponse !== undefined;
}

// Helper to create default safety settings
export function createDefaultSafetySettings(): SafetySetting[] {
  return [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
}

// Helper to create default safety ratings
export function createDefaultSafetyRatings(): SafetyRating[] {
  return [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      probability: HarmProbability.NEGLIGIBLE,
      severity: HarmSeverity.HARM_SEVERITY_NEGLIGIBLE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      probability: HarmProbability.NEGLIGIBLE,
      severity: HarmSeverity.HARM_SEVERITY_NEGLIGIBLE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      probability: HarmProbability.NEGLIGIBLE,
      severity: HarmSeverity.HARM_SEVERITY_NEGLIGIBLE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      probability: HarmProbability.NEGLIGIBLE,
      severity: HarmSeverity.HARM_SEVERITY_NEGLIGIBLE,
    },
  ];
} 