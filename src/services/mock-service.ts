import { 
  GenerateContentRequest, 
  GenerateContentResponse, 
  Schema, 
  SchemaType,
  Part,
  Content,
  SafetyRating,
  HarmCategory,
  HarmProbability,
  HarmSeverity,
  FinishReason,
  isTextPart,
  createDefaultSafetyRatings,
  EnhancedTool,
  GroundingMetadata,
  CodeExecutionTool,
  ExecutableCode,
  CodeExecutionResult,
  CodeExecutionPart,
  CodeExecutionResultPart
} from '../types/vertex-ai';
import { advancedFeaturesService } from './advanced-features';
import { contextCachingService } from './context-caching';
import { systemInstructionsService } from './system-instructions';
import { thinkingModeService } from './thinking-mode';
import {
  PresetResponse,
  defaultPresetResponses,
  defaultTokenResponse,
  defaultEmbeddingResponse,
  availableModels,
  defaultFallbackResponse,
  getAvailableModels,
  getBaseModelDefinitions
} from '../data/preset-responses';

// Configuration interface for MockGeminiService
export interface MockGeminiServiceConfig {
  /** Mock API delay in milliseconds */
  mockDelayMs: number;
  
  /** Whether streaming is enabled */
  enableStreaming: boolean;
  
  /** Default model name */
  defaultModel: string;
  
  /** Preset responses to use */
  presetResponses: PresetResponse[];
  
  /** API type to use */
  apiType: 'google-ai' | 'vertex-ai';
  
  /** Google AI specific configuration */
  googleAI?: {
    /** API key for Google AI */
    apiKey?: string;
    
    /** Base URL for Google AI API */
    baseUrl?: string;
  };
  
  /** Google Cloud Project validation */
  googleCloud: {
    /** If set, only allow requests with this project ID. If not set, allow any project ID */
    enforceProjectId?: string;
    
    /** If set, only allow requests with this location. If not set, allow any location */
    enforceLocation?: string;
    
    /** Default project ID to use in model names and responses */
    defaultProjectId: string;
    
    /** Default location to use in model names and responses */
    defaultLocation: string;
  };
  
  /** Safety settings configuration */
  safety: {
    /** Whether to include safety ratings in responses */
    includeSafetyRatings: boolean;
    
    /** Whether to include usage metadata in responses */
    includeUsageMetadata: boolean;
  };
}

// Factory function to create default configuration
export function createDefaultConfig(): MockGeminiServiceConfig {
  return {
    mockDelayMs: parseInt(process.env.MOCK_DELAY_MS || '100', 10),
    enableStreaming: process.env.ENABLE_STREAMING !== 'false',
    defaultModel: process.env.DEFAULT_MODEL || 'gemini-1.5-pro',
    presetResponses: [...defaultPresetResponses],
    apiType: (process.env.API_TYPE as 'google-ai' | 'vertex-ai') || 'vertex-ai',
    googleAI: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      baseUrl: process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com'
    },
    googleCloud: {
      enforceProjectId: process.env.GOOGLE_CLOUD_ENFORCE_PROJECT_ID || undefined,
      enforceLocation: process.env.GOOGLE_CLOUD_ENFORCE_LOCATION || undefined,
      defaultProjectId: process.env.GOOGLE_CLOUD_DEFAULT_PROJECT_ID || 'mock-project',
      defaultLocation: process.env.GOOGLE_CLOUD_DEFAULT_LOCATION || 'us-central1'
    },
    safety: {
      includeSafetyRatings: true,
      includeUsageMetadata: true
    }
  };
}

// Factory function to create configuration with custom overrides
export function createConfig(overrides: Partial<MockGeminiServiceConfig> = {}): MockGeminiServiceConfig {
  const defaultConfig = createDefaultConfig();
  
  return {
    ...defaultConfig,
    ...overrides,
    googleCloud: {
      ...defaultConfig.googleCloud,
      ...overrides.googleCloud
    },
    safety: {
      ...defaultConfig.safety,
      ...overrides.safety
    }
  };
}

// Factory function to create a MockGeminiService instance with default configuration
export function createMockGeminiService(overrides: Partial<MockGeminiServiceConfig> = {}): MockGeminiService {
  const config = createConfig(overrides);
  return new MockGeminiService(config);
}

// Factory function to create a MockGeminiService with custom project/location
export function createMockGeminiServiceForProject(
  projectId: string,
  location: string = 'us-central1',
  overrides: Partial<MockGeminiServiceConfig> = {}
): MockGeminiService {
  const config = createConfig({
    ...overrides,
    googleCloud: {
      ...overrides.googleCloud,
      defaultProjectId: projectId,
      defaultLocation: location
    }
  });
  return new MockGeminiService(config);
}

// Factory function to create a MockGeminiService with custom presets
export function createMockGeminiServiceWithPresets(
  customPresets: PresetResponse[],
  overrides: Partial<MockGeminiServiceConfig> = {}
): MockGeminiService {
  const config = createConfig({
    ...overrides,
    presetResponses: customPresets
  });
  return new MockGeminiService(config);
}

// Factory function to create a Google AI service
export async function createGoogleAIService(overrides: Partial<MockGeminiServiceConfig> = {}): Promise<any> {
  const config = createConfig({
    ...overrides,
    apiType: 'google-ai'
  });
  
  // Import GoogleAIService dynamically
  const { GoogleAIService } = await import('./google-ai-service');
  return new GoogleAIService(config);
}

// Factory function to create a Vertex AI service (default behavior)
export function createVertexAIService(overrides: Partial<MockGeminiServiceConfig> = {}): MockGeminiService {
  const config = createConfig({
    ...overrides,
    apiType: 'vertex-ai'
  });
  return new MockGeminiService(config);
}

// Factory function to create service based on API type
export async function createServiceForAPIType(
  apiType: 'google-ai' | 'vertex-ai',
  overrides: Partial<MockGeminiServiceConfig> = {}
): Promise<any> {
  if (apiType === 'google-ai') {
    return await createGoogleAIService(overrides);
  } else {
    return createVertexAIService(overrides);
  }
}

// Token limit error class
export class TokenLimitError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'TokenLimitError';
  }
}

export class MockGeminiService {
  private config: MockGeminiServiceConfig;

  constructor(config: MockGeminiServiceConfig = createDefaultConfig()) {
    this.config = config;
  }

  async generateContent(request: GenerateContentRequest, modelName?: string, projectId?: string, location?: string): Promise<GenerateContentResponse> {
    // Simulate API delay
    await this.delay(this.config.mockDelayMs);

    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;

    // Handle cached content if present
    let effectiveContents = request.contents;
    let cacheTokenCount = 0;
    
    if (request.cachedContent) {
      const cacheId = request.cachedContent.split('/').pop();
      if (cacheId) {
        const cacheResult = await contextCachingService.applyCachedContent(cacheId, request.contents);
        effectiveContents = cacheResult.allContents;
        cacheTokenCount = cacheResult.cacheTokenCount;
      }
    }

    // Apply system instructions
    let systemInstruction: Content | undefined;
    if (request.systemInstruction) {
      if (typeof request.systemInstruction === 'string') {
        systemInstruction = systemInstructionsService.createSystemInstruction(request.systemInstruction);
      } else {
        systemInstruction = request.systemInstruction;
      }
    }
    
    effectiveContents = systemInstructionsService.applySystemInstruction(
      effectiveContents,
      systemInstruction,
      modelName
    );

    // Process enhanced tools (grounding, code execution)
    let groundingMetadata: GroundingMetadata | undefined;
    let enhancedContent = '';
    let hasCodeExecutionTool = false;
    
    if (request.tools && request.tools.length > 0) {
      const inputText = this.extractTextFromContents(effectiveContents);
      
      // Check for code execution tool
      hasCodeExecutionTool = request.tools.some((tool: any) => 
        tool.codeExecution !== undefined
      );
      
      const toolResult = await advancedFeaturesService.processEnhancedTools(
        request.tools as EnhancedTool[], 
        inputText
      );
      groundingMetadata = toolResult.groundingMetadata;
      enhancedContent = toolResult.additionalContent || '';
    }

    // Validate input token limits
    const model = this.getModelByName(modelName, effectiveProjectId, effectiveLocation);
    if (model) {
      const inputText = this.extractTextFromContents(effectiveContents);
      const inputTokens = this.estimateTokens(inputText);
      
      if (inputTokens > model.inputTokenLimit) {
        throw new TokenLimitError(
          `Request exceeds token limit. Input tokens: ${inputTokens}, limit: ${model.inputTokenLimit}`
        );
      }
    }

    // Check if structured output is requested
    if (request.generationConfig?.responseSchema) {
      return this.generateStructuredResponse(request, model);
    }

    // Extract text from the request to match against presets
    const inputText = this.extractTextFromContents(effectiveContents);
    
    // Find matching preset response
    const matchedResponse = this.findMatchingPreset(inputText);
    
    let response: GenerateContentResponse;
    if (matchedResponse) {
      // Apply any custom delay from the preset
      if (matchedResponse.delay) {
        await this.delay(matchedResponse.delay);
      }
      response = matchedResponse.response;
    } else {
      // Return fallback response if no match found
      response = defaultFallbackResponse;
    }

    // Enhance response with grounding content if available
    if (enhancedContent && response.candidates && response.candidates[0]) {
      const originalText = response.candidates[0].content.parts[0]?.text || '';
      response.candidates[0].content.parts[0] = {
        text: enhancedContent + '\n\n' + originalText
      };
    }

    // Apply system instruction behavioral enhancements
    if (response.candidates && response.candidates[0] && response.candidates[0].content.parts[0]) {
      const originalText = response.candidates[0].content.parts[0].text || '';
      const enhancedText = systemInstructionsService.enhanceResponseWithSystemBehavior(
        originalText,
        systemInstruction,
        modelName
      );
      if (enhancedText !== originalText) {
        response.candidates[0].content.parts[0] = {
          text: enhancedText
        };
      }
    }

    // Add grounding metadata if available
    if (groundingMetadata && response.candidates && response.candidates[0]) {
      response.candidates[0].groundingMetadata = groundingMetadata;
    }

    // Process code execution in response
    if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
      response.candidates[0].content.parts = await advancedFeaturesService.processCodeExecutionParts(
        response.candidates[0].content.parts
      );
    }

    // Add thinking mode if enabled and supported
    if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
      if (thinkingModeService.shouldEnableThinking(request, modelName)) {
        const inputText = this.extractTextFromContents(effectiveContents);
        response.candidates[0].content.parts = thinkingModeService.addThinkingToResponse(
          response.candidates[0].content.parts,
          inputText,
          modelName
        );
      }
    }

    // Update usage metadata to include cache tokens
    if (response.usageMetadata && cacheTokenCount > 0) {
      response.usageMetadata.cachedContentTokenCount = cacheTokenCount;
      response.usageMetadata.totalTokenCount = 
        (response.usageMetadata.totalTokenCount || 0) + cacheTokenCount;
    }

    // Trim output if model limits are specified
    if (model?.outputTokenLimit) {
      response = this.trimResponseToTokenLimit(response, model.outputTokenLimit);
    }

    return response;
  }

  private async generateStructuredResponse(request: GenerateContentRequest, model?: any): Promise<GenerateContentResponse> {
    const schema = request.generationConfig?.responseSchema!;
    const responseMimeType = request.generationConfig?.responseMimeType || 'application/json';
    const inputText = this.extractTextFromContents(request.contents);

    let responseText: string;

    if (responseMimeType === 'text/x.enum') {
      responseText = this.generateEnumResponse(schema, inputText);
    } else if (responseMimeType === 'application/json') {
      responseText = this.generateJsonResponse(schema, inputText);
    } else {
      // Fallback to regular response
      const matchedResponse = this.findMatchingPreset(inputText);
      let response = matchedResponse?.response || defaultFallbackResponse;
      
      // Trim output if model limits are specified
      if (model?.outputTokenLimit) {
        response = this.trimResponseToTokenLimit(response, model.outputTokenLimit);
      }
      
      return response;
    }

    // Trim response text to fit within output token limit
    if (model?.outputTokenLimit) {
      responseText = this.trimTextToTokenLimit(responseText, model.outputTokenLimit);
    }

    return {
      candidates: [{
        content: {
          parts: [{ text: responseText }],
          role: 'model'
        },
        finishReason: FinishReason.STOP,
        index: 0,
        safetyRatings: this.getDefaultSafetyRatings()
      }],
      usageMetadata: {
        promptTokenCount: this.estimateTokens(inputText),
        candidatesTokenCount: this.estimateTokens(responseText),
        totalTokenCount: this.estimateTokens(inputText) + this.estimateTokens(responseText)
      }
    };
  }

  private generateEnumResponse(schema: Schema, inputText: string): string {
    if (!schema.enum || schema.enum.length === 0) {
      return 'UNKNOWN';
    }

    // Simple heuristic-based enum selection
    const input = inputText.toLowerCase();
    
    // Check for sentiment analysis patterns
    if (schema.enum.includes('POSITIVE') && schema.enum.includes('NEGATIVE')) {
      if (input.includes('love') || input.includes('great') || input.includes('excellent') || input.includes('amazing')) {
        return 'POSITIVE';
      }
      if (input.includes('hate') || input.includes('bad') || input.includes('terrible') || input.includes('awful')) {
        return 'NEGATIVE';
      }
      if (schema.enum.includes('NEUTRAL')) {
        return 'NEUTRAL';
      }
    }

    // Check for genre classification
    if (schema.enum.includes('drama') && (input.includes('drama') || input.includes('serious') || input.includes('emotion'))) {
      return 'drama';
    }
    if (schema.enum.includes('comedy') && (input.includes('comedy') || input.includes('funny') || input.includes('humor'))) {
      return 'comedy';
    }
    if (schema.enum.includes('documentary') && (input.includes('documentary') || input.includes('factual') || input.includes('real-life'))) {
      return 'documentary';
    }

    // Check for condition assessment
    if (schema.enum.includes('damaged') && (input.includes('tear') || input.includes('broken') || input.includes('damage'))) {
      return 'damaged';
    }
    if (schema.enum.includes('new in package') && input.includes('new')) {
      return 'new in package';
    }
    if (schema.enum.includes('used') && input.includes('used')) {
      return 'used';
    }

    // Default to first enum value
    return schema.enum[0];
  }

  private generateJsonResponse(schema: Schema, inputText: string): string {
    const response = this.generateObjectFromSchema(schema, inputText);
    return JSON.stringify(response, null, 0);
  }

  private generateObjectFromSchema(schema: Schema, inputText: string, depth: number = 0): any {
    if (depth > 10) return null; // Prevent infinite recursion

    switch (schema.type) {
      case SchemaType.STRING:
        return this.generateStringValue(schema, inputText);
      
      case SchemaType.INTEGER:
        return this.generateIntegerValue(schema, inputText);
      
      case SchemaType.NUMBER:
        return this.generateNumberValue(schema, inputText);
      
      case SchemaType.BOOLEAN:
        return this.generateBooleanValue(schema, inputText);
      
      case SchemaType.ARRAY:
        return this.generateArrayValue(schema, inputText, depth);
      
      case SchemaType.OBJECT:
        return this.generateObjectValue(schema, inputText, depth);
      
      default:
        return null;
    }
  }

  private generateStringValue(schema: Schema, inputText: string): string {
    if (schema.enum && schema.enum.length > 0) {
      return this.generateEnumResponse(schema, inputText);
    }

    // Generate contextual strings based on input
    const input = inputText.toLowerCase();
    
    // Recipe names
    if (input.includes('recipe') || input.includes('cookie')) {
      const recipeNames = ['Chocolate Chip Cookies', 'Oatmeal Raisin Cookies', 'Sugar Cookies', 'Snickerdoodles', 'Peanut Butter Cookies'];
      return recipeNames[Math.floor(Math.random() * recipeNames.length)];
    }
    
    // Character names
    if (input.includes('character') || input.includes('name')) {
      const names = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Avery', 'Quinn'];
      return names[Math.floor(Math.random() * names.length)];
    }
    
    // Generic response
    return 'Generated string value';
  }

  private generateIntegerValue(schema: Schema, inputText: string): number {
    const min = 0;
    const max = 100;
    
    // Generate age-appropriate values
    if (inputText.toLowerCase().includes('age')) {
      return Math.floor(Math.random() * (80 - 18 + 1)) + 18;
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateNumberValue(schema: Schema, inputText: string): number {
    const min = 0;
    const max = 100;
    return Math.random() * (max - min) + min;
  }

  private generateBooleanValue(schema: Schema, inputText: string): boolean {
    // Generate contextual boolean values
    if (inputText.toLowerCase().includes('playable')) {
      return Math.random() > 0.5;
    }
    return Math.random() > 0.5;
  }

  private generateArrayValue(schema: Schema, inputText: string, depth: number): any[] {
    if (!schema.items) return [];
    
    const minItems = 1;
    const maxItems = 5;
    const itemCount = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    
    const result = [];
    for (let i = 0; i < itemCount; i++) {
      result.push(this.generateObjectFromSchema(schema.items, inputText, depth + 1));
    }
    
    return result;
  }

  private generateObjectValue(schema: Schema, inputText: string, depth: number): any {
    if (!schema.properties) return {};
    
    const result: any = {};
    
    // Handle property ordering
    const properties = Object.entries(schema.properties);
    
    for (const [key, propSchema] of properties) {
      const isRequired = schema.required?.includes(key) || false;
      const isNullable = (propSchema as Schema).nullable || false;
      
      if (isRequired || Math.random() > 0.3) {
        const value = this.generateObjectFromSchema(propSchema as Schema, inputText, depth + 1);
        if (value !== null || isNullable) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private getDefaultSafetyRatings(): SafetyRating[] {
    if (!this.config.safety.includeSafetyRatings) {
      return [];
    }
    
    return createDefaultSafetyRatings();
  }

  private estimateTokens(text: string): number {
    // Simple token estimation: approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }

  async *streamGenerateContent(request: GenerateContentRequest, modelName?: string, projectId?: string, location?: string): AsyncGenerator<any, void, unknown> {
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    // First get the complete response
    const response = await this.generateContent(request, modelName, effectiveProjectId, effectiveLocation);
    
    if (!response.candidates || response.candidates.length === 0) {
      return;
    }

    const content = response.candidates[0].content;
    const parts = content.parts;
    
    if (!parts || parts.length === 0) {
      return;
    }

    // Stream each part
    for (const part of parts) {
      if (isTextPart(part)) {
        // Split text into words and stream word by word
        const words = part.text.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
          currentText += (i > 0 ? ' ' : '') + words[i];
          
          // Add delay between words
          await this.delay(this.config.mockDelayMs);
          
          yield {
            candidates: [{
              content: {
                parts: [{ text: currentText }],
                role: 'model'
              },
              finishReason: i === words.length - 1 ? FinishReason.STOP : undefined,
              index: 0,
              safetyRatings: this.config.safety.includeSafetyRatings ? this.getDefaultSafetyRatings() : undefined
            }],
            usageMetadata: i === words.length - 1 ? response.usageMetadata : undefined
          };
        }
      }
    }
  }

  async countTokens(request: any, modelName?: string, projectId?: string, location?: string): Promise<any> {
    await this.delay(this.config.mockDelayMs);
    
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    // Simple token counting simulation
    const text = this.extractTextFromContents(request.contents || []);
    const approximateTokens = Math.ceil(text.length / 4); // Rough approximation
    
    // Validate input token limits for the model
    const model = this.getModelByName(modelName, effectiveProjectId, effectiveLocation);
    if (model && approximateTokens > model.inputTokenLimit) {
      throw new TokenLimitError(
        `Request exceeds token limit. Input tokens: ${approximateTokens}, limit: ${model.inputTokenLimit}`
      );
    }
    
    return {
      totalTokens: approximateTokens || defaultTokenResponse.totalTokens
    };
  }

  async embedContent(request: any, modelName?: string, projectId?: string, location?: string): Promise<any> {
    await this.delay(this.config.mockDelayMs);
    
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    // Return a deterministic embedding based on content
    const text = this.extractTextFromContent(request.content);
    
    // Validate input token limits for the model
    const model = this.getModelByName(modelName, effectiveProjectId, effectiveLocation);
    if (model) {
      const inputTokens = this.estimateTokens(text);
      if (inputTokens > model.inputTokenLimit) {
        throw new TokenLimitError(
          `Request exceeds token limit. Input tokens: ${inputTokens}, limit: ${model.inputTokenLimit}`
        );
      }
    }
    
    const embedding = this.generateDeterministicEmbedding(text);
    
    return {
      embedding: {
        values: embedding
      }
    };
  }

  async batchEmbedContents(request: any, modelName?: string, projectId?: string, location?: string): Promise<any> {
    await this.delay(this.config.mockDelayMs);
    
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    const embeddings = await Promise.all(
      request.requests.map(async (req: any) => {
        const result = await this.embedContent(req, modelName, effectiveProjectId, effectiveLocation);
        return result.embedding;
      })
    );
    
    return {
      embeddings
    };
  }

  // Model management methods
  getModels(projectId?: string, location?: string): any[] {
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    return getAvailableModels(effectiveProjectId, effectiveLocation);
  }

  getModel(modelName: string, projectId?: string, location?: string): any | undefined {
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    return this.getModelByName(modelName, effectiveProjectId, effectiveLocation);
  }

  // Preset management methods
  addPresetResponse(preset: PresetResponse): void {
    this.config.presetResponses.push(preset);
  }

  removePresetResponse(id: string): boolean {
    const index = this.config.presetResponses.findIndex(p => p.id === id);
    if (index > -1) {
      this.config.presetResponses.splice(index, 1);
      return true;
    }
    return false;
  }

  getPresetResponses(): PresetResponse[] {
    return [...this.config.presetResponses];
  }

  updatePresetResponse(id: string, updates: Partial<PresetResponse>): boolean {
    const index = this.config.presetResponses.findIndex(p => p.id === id);
    if (index > -1) {
      this.config.presetResponses[index] = { ...this.config.presetResponses[index], ...updates };
      return true;
    }
    return false;
  }

  private extractTextFromContents(contents: Content[]): string {
    return contents
      .map(content => this.extractTextFromContent(content))
      .join(' ');
  }

  private extractTextFromContent(content: Content): string {
    return content.parts
      .map(part => ('text' in part) ? part.text : '')
      .join(' ');
  }

  private findMatchingPreset(inputText: string): PresetResponse | null {
    const lowercaseInput = inputText.toLowerCase();
    
    for (const preset of this.config.presetResponses) {
      const { trigger } = preset;
      
      switch (trigger.type) {
        case 'text':
          if (lowercaseInput === trigger.value.toLowerCase()) {
            return preset;
          }
          break;
        case 'contains':
          if (lowercaseInput.includes(trigger.value.toLowerCase())) {
            return preset;
          }
          break;
        case 'regex':
          try {
            const regex = new RegExp(trigger.value, 'i');
            if (regex.test(inputText)) {
              return preset;
            }
          } catch (error) {
            console.warn(`Invalid regex pattern: ${trigger.value}`);
          }
          break;
      }
    }
    
    return null;
  }

  private generateDeterministicEmbedding(text: string): number[] {
    // Generate a deterministic embedding based on the text
    const embedding = Array.from({ length: 768 }, (_, i) => {
      const hash = this.simpleHash(text + i);
      return (hash % 2000 - 1000) / 1000; // Normalize to [-1, 1]
    });
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private trimResponseToTokenLimit(response: GenerateContentResponse, tokenLimit: number): GenerateContentResponse {
    const trimmedResponse = { ...response };
    
    if (trimmedResponse.candidates) {
      trimmedResponse.candidates = trimmedResponse.candidates.map(candidate => {
        const trimmedCandidate = { ...candidate };
        
        if (trimmedCandidate.content?.parts) {
          trimmedCandidate.content.parts = trimmedCandidate.content.parts.map(part => {
            if (isTextPart(part)) {
              const trimmedText = this.trimTextToTokenLimit(part.text, tokenLimit);
              return { text: trimmedText };
            }
            return part;
          });
        }
        
        return trimmedCandidate;
      });
    }
    
    // Update usage metadata if it exists
    if (trimmedResponse.usageMetadata) {
      const totalResponseText = this.extractTextFromResponse(trimmedResponse);
      const actualTokens = this.estimateTokens(totalResponseText);
      
      trimmedResponse.usageMetadata = {
        ...trimmedResponse.usageMetadata,
        candidatesTokenCount: actualTokens,
        totalTokenCount: (trimmedResponse.usageMetadata.promptTokenCount || 0) + actualTokens
      };
    }
    
    return trimmedResponse;
  }

  private trimTextToTokenLimit(text: string, tokenLimit: number): string {
    const currentTokens = this.estimateTokens(text);
    
    if (currentTokens <= tokenLimit) {
      return text;
    }
    
    // Estimate character limit based on token limit
    const approximateCharLimit = tokenLimit * 4; // ~4 chars per token
    
    // Try to trim at word boundaries
    const words = text.split(' ');
    let trimmedText = '';
    let currentLength = 0;
    
    for (const word of words) {
      const wordWithSpace = (trimmedText ? ' ' : '') + word;
      if (currentLength + wordWithSpace.length > approximateCharLimit) {
        break;
      }
      trimmedText += wordWithSpace;
      currentLength += wordWithSpace.length;
    }
    
    // If we couldn't fit any words, just truncate at character limit
    if (!trimmedText) {
      trimmedText = text.substring(0, approximateCharLimit);
    }
    
    return trimmedText;
  }

  private extractTextFromResponse(response: GenerateContentResponse): string {
    const textParts: string[] = [];
    
    response.candidates?.forEach(candidate => {
      candidate.content?.parts?.forEach(part => {
        if (isTextPart(part)) {
          textParts.push(part.text);
        }
      });
    });
    
    return textParts.join(' ');
  }

  private getModelByName(modelName?: string, projectId?: string, location?: string): any | undefined {
    if (!modelName) return undefined;
    
    // Use default project/location if not provided
    const effectiveProjectId = projectId || this.config.googleCloud.defaultProjectId;
    const effectiveLocation = location || this.config.googleCloud.defaultLocation;
    
    // Get available models with dynamic project/location
    const models = getAvailableModels(effectiveProjectId, effectiveLocation);
    
    // Handle full model path or just the model name
    if (modelName.includes('/')) {
      // Full path provided
      return models.find(model => 
        model.name === modelName ||
        model.name.endsWith(modelName.split('/').pop())
      );
    } else {
      // Just model name provided
      return models.find(model => 
        model.name.endsWith(`/${modelName}`) ||
        model.displayName === modelName ||
        model.id === modelName
      );
    }
  }

  // Code execution simulation
  private simulateCodeExecution(code: string): CodeExecutionResult {
    try {
      // Simulate Python code execution with some basic patterns
      const cleanCode = code.trim();
      
      // Handle print statements
      const printMatches = cleanCode.match(/print\s*\(\s*([^)]+)\s*\)/g);
      if (printMatches) {
        const outputs = printMatches.map(match => {
          const content = match.match(/print\s*\(\s*([^)]+)\s*\)/)?.[1] || '';
          // Remove quotes and evaluate simple expressions
          return content.replace(/['"]/g, '');
        });
        return {
          outcome: 'OUTCOME_OK',
          output: outputs.join('\n') + '\n'
        };
      }

      // Handle simple math expressions
      if (/^\s*\d+[\+\-\*\/\s\d]*\d*\s*$/.test(cleanCode)) {
        try {
          // Simple arithmetic evaluation (be careful in real implementation)
          const result = eval(cleanCode.replace(/[^0-9+\-*/().\s]/g, ''));
          return {
            outcome: 'OUTCOME_OK',
            output: `${result}\n`
          };
        } catch {
          return {
            outcome: 'OUTCOME_FAILED',
            output: 'SyntaxError: invalid syntax\n'
          };
        }
      }

      // Handle variable assignments and basic operations
      if (cleanCode.includes('=') || cleanCode.includes('for ') || cleanCode.includes('if ')) {
        return {
          outcome: 'OUTCOME_OK',
          output: 'Code executed successfully (simulated)\n'
        };
      }

      // Default success for other code
      return {
        outcome: 'OUTCOME_OK',
        output: 'Code executed successfully\n'
      };

    } catch (error) {
      return {
        outcome: 'OUTCOME_FAILED',
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      };
    }
  }

  // Enhanced content processing with code execution
  private processContentWithCodeExecution(content: Content): Content {
    if (!content.parts) return content;

    const processedParts: Part[] = [];
    
    for (const part of content.parts) {
      processedParts.push(part);
      
      // Check if this part contains executable code
      const codeExecutionPart = part as CodeExecutionPart;
      if (codeExecutionPart.executableCode) {
        // Simulate code execution
        const result = this.simulateCodeExecution(codeExecutionPart.executableCode.code);
        
        // Add execution result as next part
        const resultPart: CodeExecutionResultPart = {
          codeExecutionResult: result
        };
        processedParts.push(resultPart as Part);
      }
    }

    return {
      ...content,
      parts: processedParts
    };
  }
} 