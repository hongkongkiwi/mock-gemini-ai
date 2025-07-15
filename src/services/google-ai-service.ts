import {
  GoogleAIGenerateContentRequest,
  GoogleAIGenerateContentResponse,
  GoogleAICountTokensRequest,
  GoogleAICountTokensResponse,
  GoogleAIEmbedContentRequest,
  GoogleAIEmbedContentResponse,
  GoogleAIBatchEmbedContentsRequest,
  GoogleAIBatchEmbedContentsResponse,
  GoogleAIModel,
  GoogleAIContent,
  GoogleAIPart,
  GoogleAICandidate,
  GoogleAISafetyRating,
  GoogleAITool,
  getGoogleAIModelByName,
  createDefaultGoogleAISafetyRatings,
  googleAIModels
} from '../types/google-ai';
import { advancedFeaturesService } from './advanced-features';
import { systemInstructionsService } from './system-instructions';
import { thinkingModeService } from './thinking-mode';
import {
  PresetResponse,
  defaultPresetResponses,
  defaultTokenResponse,
  defaultEmbeddingResponse,
  defaultFallbackResponse
} from '../data/preset-responses';
import { Schema, SchemaType, isTextPart } from '../types/vertex-ai';
import { MockGeminiServiceConfig } from './mock-service';

// Token limit error class for Google AI
export class GoogleAITokenLimitError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'GoogleAITokenLimitError';
  }
}

export class GoogleAIService {
  private config: MockGeminiServiceConfig;

  constructor(config: MockGeminiServiceConfig) {
    this.config = config;
  }

  async generateContent(request: GoogleAIGenerateContentRequest, modelName?: string): Promise<GoogleAIGenerateContentResponse> {
    // Simulate API delay
    await this.delay(this.config.mockDelayMs);

    // Apply system instructions to contents
    let effectiveContents = request.contents;
    let systemInstruction: any | undefined;
    
    if (request.systemInstruction) {
      if (typeof request.systemInstruction === 'string') {
        systemInstruction = systemInstructionsService.createSystemInstruction(request.systemInstruction);
      } else {
        systemInstruction = request.systemInstruction;
      }
      
      effectiveContents = systemInstructionsService.applySystemInstruction(
        request.contents as any,
        systemInstruction,
        modelName
      ) as any;
    }

    // Process enhanced tools (grounding, code execution)
    let groundingMetadata: any | undefined;
    let enhancedContent = '';
    
    if (request.tools && request.tools.length > 0) {
      const inputText = this.extractTextFromContents(effectiveContents);
      const toolResult = await advancedFeaturesService.processEnhancedTools(
        request.tools as any[], 
        inputText
      );
      groundingMetadata = toolResult.groundingMetadata;
      enhancedContent = toolResult.additionalContent || '';
    }

    // Validate input token limits
    const model = this.getModelByName(modelName);
    if (model) {
      const inputText = this.extractTextFromContents(effectiveContents);
      const inputTokens = this.estimateTokens(inputText);
      
      if (inputTokens > model.inputTokenLimit) {
        throw new GoogleAITokenLimitError(
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
    
    let response: GoogleAIGenerateContentResponse;
    if (matchedResponse) {
      // Apply any custom delay from the preset
      if (matchedResponse.delay) {
        await this.delay(matchedResponse.delay);
      }
      response = this.convertToGoogleAIResponse(matchedResponse.response);
    } else {
      // Return fallback response if no match found
      response = this.convertToGoogleAIResponse(defaultFallbackResponse);
    }

    // Enhance response with grounding content if available
    if (enhancedContent && response.candidates && response.candidates[0]) {
      const originalText = response.candidates[0].content.parts[0]?.text || '';
      response.candidates[0].content.parts[0] = {
        text: enhancedContent + '\n\n' + originalText
      };
    }

    // Add grounding metadata if available
    if (groundingMetadata && response.candidates && response.candidates[0]) {
      response.candidates[0].groundingMetadata = groundingMetadata;
    }

    // Process code execution in response
    if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
      response.candidates[0].content.parts = await advancedFeaturesService.processCodeExecutionParts(
        response.candidates[0].content.parts as any
      ) as any;
    }

    // Apply system instruction behavioral enhancements
    if (systemInstruction && response.candidates && response.candidates[0] && response.candidates[0].content.parts[0]) {
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

    // Add thinking mode if enabled and supported
    if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
      if (thinkingModeService.shouldEnableThinking(request, modelName)) {
        const inputText = this.extractTextFromContents(effectiveContents);
        response.candidates[0].content.parts = thinkingModeService.addThinkingToResponse(
          response.candidates[0].content.parts as any,
          inputText,
          modelName
        ) as any;
      }
    }

    // Trim output if model limits are specified
    if (model?.outputTokenLimit) {
      response = this.trimResponseToTokenLimit(response, model.outputTokenLimit);
    }

    return response;
  }

  async countTokens(request: GoogleAICountTokensRequest, modelName?: string): Promise<GoogleAICountTokensResponse> {
    await this.delay(this.config.mockDelayMs);
    
    // Simple token counting simulation
    const text = this.extractTextFromContents(request.contents);
    const approximateTokens = Math.ceil(text.length / 4); // Rough approximation
    
    // Validate input token limits for the model
    const model = this.getModelByName(modelName);
    if (model && approximateTokens > model.inputTokenLimit) {
      throw new GoogleAITokenLimitError(
        `Request exceeds token limit. Input tokens: ${approximateTokens}, limit: ${model.inputTokenLimit}`
      );
    }
    
    return {
      totalTokens: approximateTokens || defaultTokenResponse.totalTokens
    };
  }

  async embedContent(request: GoogleAIEmbedContentRequest, modelName?: string): Promise<GoogleAIEmbedContentResponse> {
    await this.delay(this.config.mockDelayMs);
    
    // Return a deterministic embedding based on content
    const text = this.extractTextFromContent(request.content);
    
    // Validate input token limits for the model
    const model = this.getModelByName(modelName);
    if (model) {
      const inputTokens = this.estimateTokens(text);
      if (inputTokens > model.inputTokenLimit) {
        throw new GoogleAITokenLimitError(
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

  async batchEmbedContents(request: GoogleAIBatchEmbedContentsRequest, modelName?: string): Promise<GoogleAIBatchEmbedContentsResponse> {
    await this.delay(this.config.mockDelayMs);
    
    const embeddings = await Promise.all(
      request.requests.map(async (req) => {
        const result = await this.embedContent(req, modelName);
        return result.embedding;
      })
    );
    
    return {
      embeddings
    };
  }

  async *streamGenerateContent(request: GoogleAIGenerateContentRequest, modelName?: string): AsyncGenerator<GoogleAIGenerateContentResponse, void, unknown> {
    // First get the complete response
    const response = await this.generateContent(request, modelName);
    
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
      if (part.text) {
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
              finishReason: i === words.length - 1 ? 'STOP' : undefined,
              index: 0,
              safetyRatings: this.config.safety.includeSafetyRatings ? this.getDefaultSafetyRatings() : undefined
            }],
            usageMetadata: i === words.length - 1 ? response.usageMetadata : undefined
          };
        }
      }
    }
  }

  // Model management methods
  getModels(): GoogleAIModel[] {
    return googleAIModels;
  }

  getModel(modelName: string): GoogleAIModel | undefined {
    return this.getModelByName(modelName);
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

  // Private helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractTextFromContents(contents: GoogleAIContent[]): string {
    return contents.map(content => 
      content.parts.map(part => part.text || '').join(' ')
    ).join(' ');
  }

  private extractTextFromContent(content: GoogleAIContent): string {
    return content.parts.map(part => part.text || '').join(' ');
  }

  private estimateTokens(text: string): number {
    // Simple token estimation: approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }

  private getModelByName(modelName?: string): GoogleAIModel | undefined {
    if (!modelName) return undefined;
    return getGoogleAIModelByName(modelName);
  }

  private getDefaultSafetyRatings(): GoogleAISafetyRating[] {
    if (!this.config.safety.includeSafetyRatings) {
      return [];
    }
    
    return createDefaultGoogleAISafetyRatings();
  }

  private findMatchingPreset(inputText: string): PresetResponse | undefined {
    const lowercaseInput = inputText.toLowerCase();
    
    for (const preset of this.config.presetResponses) {
      const { trigger } = preset;
      
      if (trigger.type === 'text' && lowercaseInput.includes(trigger.value.toLowerCase())) {
        return preset;
      }
      
      if (trigger.type === 'contains' && lowercaseInput.includes(trigger.value.toLowerCase())) {
        return preset;
      }
      
      if (trigger.type === 'regex') {
        const regex = new RegExp(trigger.value, 'i');
        if (regex.test(inputText)) {
          return preset;
        }
      }
    }
    
    return undefined;
  }

  private convertToGoogleAIResponse(vertexResponse: any): GoogleAIGenerateContentResponse {
    // Convert Vertex AI response format to Google AI format
    const candidates: GoogleAICandidate[] = vertexResponse.candidates?.map((candidate: any) => ({
      content: {
        parts: candidate.content.parts.map((part: any) => ({
          text: part.text
        })),
        role: 'model'
      },
      finishReason: candidate.finishReason as any,
      index: candidate.index,
      safetyRatings: this.config.safety.includeSafetyRatings ? this.getDefaultSafetyRatings() : undefined
    })) || [];

    return {
      candidates,
      usageMetadata: this.config.safety.includeUsageMetadata ? vertexResponse.usageMetadata : undefined
    };
  }

  private async generateStructuredResponse(request: GoogleAIGenerateContentRequest, model?: GoogleAIModel): Promise<GoogleAIGenerateContentResponse> {
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
        // Convert to Google AI format first, then trim
        const googleAIResponse = this.convertToGoogleAIResponse(response);
        return this.trimResponseToTokenLimit(googleAIResponse, model.outputTokenLimit);
      }
      
      return this.convertToGoogleAIResponse(response);
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
        finishReason: 'STOP',
        index: 0,
        safetyRatings: this.config.safety.includeSafetyRatings ? this.getDefaultSafetyRatings() : undefined
      }],
      usageMetadata: this.config.safety.includeUsageMetadata ? {
        promptTokenCount: this.estimateTokens(inputText),
        candidatesTokenCount: this.estimateTokens(responseText),
        totalTokenCount: this.estimateTokens(inputText) + this.estimateTokens(responseText)
      } : undefined
    };
  }

  private generateEnumResponse(schema: any, inputText: string): string {
    if (!schema.enum || schema.enum.length === 0) {
      return 'UNKNOWN';
    }

    const input = inputText.toLowerCase();
    
    // Check for sentiment analysis
    if (schema.enum.includes('POSITIVE') && (input.includes('great') || input.includes('amazing') || input.includes('love'))) {
      return 'POSITIVE';
    }
    if (schema.enum.includes('NEGATIVE') && (input.includes('bad') || input.includes('terrible') || input.includes('hate'))) {
      return 'NEGATIVE';
    }
    if (schema.enum.includes('NEUTRAL')) {
      return 'NEUTRAL';
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

    // Default to first enum value
    return schema.enum[0];
  }

  private generateJsonResponse(schema: Schema, inputText: string): string {
    const response = this.generateObjectFromSchema(schema, inputText);
    return JSON.stringify(response, null, 0);
  }

  private generateObjectFromSchema(schema: any, inputText: string, depth: number = 0): any {
    if (depth > 10) return null; // Prevent infinite recursion

    // Handle both string and enum schema types
    const schemaType = typeof schema.type === 'string' ? schema.type : schema.type;
    
    switch (schemaType) {
      case 'string':
      case SchemaType.STRING:
        return this.generateStringValue(schema, inputText);
      
      case 'integer':
      case SchemaType.INTEGER:
        return this.generateIntegerValue(schema, inputText);
      
      case 'number':
      case SchemaType.NUMBER:
        return this.generateNumberValue(schema, inputText);
      
      case 'boolean':
      case SchemaType.BOOLEAN:
        return this.generateBooleanValue(schema, inputText);
      
      case 'array':
      case SchemaType.ARRAY:
        return this.generateArrayValue(schema, inputText, depth);
      
      case 'object':
      case SchemaType.OBJECT:
        return this.generateObjectValue(schema, inputText, depth);
      
      default:
        return null;
    }
  }

  private generateStringValue(schema: any, inputText: string): string {
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

  private generateIntegerValue(schema: any, inputText: string): number {
    const min = 0;
    const max = 100;
    
    // Generate age-appropriate values
    if (inputText.toLowerCase().includes('age')) {
      return Math.floor(Math.random() * (80 - 18 + 1)) + 18;
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateNumberValue(schema: any, inputText: string): number {
    const min = 0;
    const max = 100;
    return Math.random() * (max - min) + min;
  }

  private generateBooleanValue(schema: any, inputText: string): boolean {
    // Generate contextual boolean values
    if (inputText.toLowerCase().includes('playable')) {
      return Math.random() > 0.5;
    }
    return Math.random() > 0.5;
  }

  private generateArrayValue(schema: any, inputText: string, depth: number): any[] {
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

  private generateObjectValue(schema: any, inputText: string, depth: number): any {
    if (!schema.properties) return {};
    
    const result: any = {};
    
    // Handle property ordering
    const properties = Object.entries(schema.properties);
    
    for (const [key, propSchema] of properties) {
      const isRequired = schema.required?.includes(key) || false;
      const isNullable = (propSchema as any).nullable || false;
      
      if (isRequired || Math.random() > 0.3) {
        const value = this.generateObjectFromSchema(propSchema, inputText, depth + 1);
        if (value !== null || isNullable) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private trimResponseToTokenLimit(response: GoogleAIGenerateContentResponse, tokenLimit: number): GoogleAIGenerateContentResponse {
    if (!response.candidates || response.candidates.length === 0) {
      return response;
    }

    const trimmedCandidates = response.candidates.map(candidate => {
      const trimmedParts = candidate.content.parts.map(part => {
        if (part.text) {
          return { text: this.trimTextToTokenLimit(part.text, tokenLimit) };
        }
        return part;
      });

      return {
        ...candidate,
        content: {
          ...candidate.content,
          parts: trimmedParts
        }
      };
    });

    return {
      ...response,
      candidates: trimmedCandidates
    };
  }

  private trimTextToTokenLimit(text: string, tokenLimit: number): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= tokenLimit) {
      return text;
    }
    
    // Trim text to fit within token limit
    const targetLength = Math.floor(text.length * (tokenLimit / estimatedTokens));
    return text.substring(0, targetLength);
  }

  private generateDeterministicEmbedding(text: string): number[] {
    const embedding = new Array(768).fill(0);
    let seed = 0;
    
    for (let i = 0; i < text.length; i++) {
      seed = (seed * 31 + text.charCodeAt(i)) % 1000000;
    }
    
    for (let i = 0; i < 768; i++) {
      const random = Math.sin(seed + i) * 10000;
      embedding[i] = (random - Math.floor(random)) * 2 - 1;
    }
    
    return embedding;
  }
} 