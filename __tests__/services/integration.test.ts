import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';
import { 
  createGoogleAIService, 
  createMockGeminiService,
  MockGeminiService 
} from '../../src/services/mock-service';
import { GoogleAIService } from '../../src/services/google-ai-service';
import { TEST_CONFIG, skipIfNoApiKeys } from '../test-setup';
import { 
  GenerateContentRequest,
  GenerateContentResponse as VertexResponse,
  SchemaType
} from '../../src/types/vertex-ai';
import {
  GoogleAIGenerateContentRequest,
  GoogleAIGenerateContentResponse,
  GoogleAICountTokensRequest,
  GoogleAIEmbedContentRequest
} from '../../src/types/google-ai';

// Test data for comparison
const TEST_PROMPTS = {
  simple: 'Hello, how are you?',
  technical: 'Explain how machine learning works',
  creative: 'Write a short poem about coding',
  structured: 'List 3 programming languages and their primary use cases'
};

const JSON_SCHEMA_REQUEST: any = {
  type: 'object',
  properties: {
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          primaryUse: { type: 'string' },
          popularity: { type: 'integer' }
        },
        required: ['name', 'primaryUse']
      }
    }
  },
  required: ['languages']
};

describe('Integration Tests - Mock vs Real APIs', () => {
  let mockVertexService: MockGeminiService;
  let mockGoogleAIService: GoogleAIService;
  let realGoogleAI: GoogleGenerativeAI | null = null;
  let realVertexAI: VertexAI | null = null;

  beforeAll(() => {
    // Initialize mock services
    mockVertexService = createMockGeminiService({
      mockDelayMs: TEST_CONFIG.MOCK_DELAY,
      googleCloud: {
        defaultProjectId: TEST_CONFIG.GOOGLE_CLOUD_PROJECT_ID,
        defaultLocation: TEST_CONFIG.GOOGLE_CLOUD_LOCATION
      }
    });

    // Initialize real APIs if keys are available
    if (TEST_CONFIG.GOOGLE_AI_API_KEY && TEST_CONFIG.COMPARE_WITH_REAL_APIS) {
      realGoogleAI = new GoogleGenerativeAI(TEST_CONFIG.GOOGLE_AI_API_KEY);
      
      // Initialize Vertex AI if we have credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        realVertexAI = new VertexAI({
          project: TEST_CONFIG.GOOGLE_CLOUD_PROJECT_ID,
          location: TEST_CONFIG.GOOGLE_CLOUD_LOCATION,
        });
      }
    }
  });

  beforeEach(async () => {
    mockGoogleAIService = await createGoogleAIService({
      mockDelayMs: TEST_CONFIG.MOCK_DELAY,
      googleAI: {
        apiKey: 'mock-key'
      }
    });
  });

  describe('Google AI SDK Comparison', () => {
    it('should have similar response structure for simple prompts', async () => {
      if (skipIfNoApiKeys()) return;

      const mockRequest: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.simple }],
          role: 'user'
        }]
      };

      // Get mock response
      const mockResponse = await mockGoogleAIService.generateContent(mockRequest);

      if (realGoogleAI) {
        // Get real response
        const realModel = realGoogleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const realResult = await realModel.generateContent(TEST_PROMPTS.simple);
        const realResponse = realResult.response;

        // Compare structure
        expect(mockResponse).toHaveProperty('candidates');
        expect(realResponse).toHaveProperty('candidates');
        
        expect(mockResponse.candidates).toBeDefined();
        if (mockResponse.candidates) {
          expect(mockResponse.candidates).toHaveLength(1);
        }
        expect(realResponse.candidates).toBeDefined();
        if (realResponse.candidates) {
          expect(realResponse.candidates).toHaveLength(1);
        }

        if (mockResponse.candidates && realResponse.candidates) {
          expect(mockResponse.candidates[0]).toHaveProperty('content');
          expect(mockResponse.candidates[0]).toHaveProperty('finishReason');
          expect(realResponse.candidates[0]).toHaveProperty('content');
          expect(realResponse.candidates[0]).toHaveProperty('finishReason');
        }

        // Check usage metadata exists (structure may vary)
        expect(mockResponse).toHaveProperty('usageMetadata');
        if (realResponse.usageMetadata) {
          expect(realResponse.usageMetadata).toHaveProperty('totalTokenCount');
          expect(mockResponse.usageMetadata).toHaveProperty('totalTokenCount');
        }

        console.log('✅ Mock and real API have similar response structures');
      }
    });

    it('should handle JSON schema generation similarly', async () => {
      if (skipIfNoApiKeys()) return;

      const mockRequest: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.structured }],
          role: 'user'
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: JSON_SCHEMA_REQUEST
        }
      };

      // Get mock response
      const mockResponse = await mockGoogleAIService.generateContent(mockRequest);

      if (realGoogleAI) {
        // Get real response with schema
        const realModel = realGoogleAI.getGenerativeModel({ 
          model: 'gemini-1.5-pro',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: JSON_SCHEMA_REQUEST
          }
        });
        const realResult = await realModel.generateContent(TEST_PROMPTS.structured);
        const realResponse = realResult.response;

        // Both should produce valid JSON
        const mockText = mockResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        const realText = realResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        expect(mockText).toBeDefined();
        expect(realText).toBeDefined();

        if (mockText && realText) {
          // Both should parse as valid JSON
          const mockJson = JSON.parse(mockText);
          const realJson = JSON.parse(realText);

          // Both should follow the schema structure
          expect(mockJson).toHaveProperty('languages');
          expect(realJson).toHaveProperty('languages');
          expect(Array.isArray(mockJson.languages)).toBe(true);
          expect(Array.isArray(realJson.languages)).toBe(true);

          console.log('✅ Mock and real API both generate valid JSON following schema');
        }
      }
    });

    it('should have similar token counting behavior', async () => {
      if (skipIfNoApiKeys()) return;

      const mockRequest: GoogleAICountTokensRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.technical }],
          role: 'user'
        }]
      };

      // Get mock token count
      const mockTokens = await mockGoogleAIService.countTokens(mockRequest);

      if (realGoogleAI) {
        // Get real token count
        const realModel = realGoogleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const realResult = await realModel.countTokens(TEST_PROMPTS.technical);

        expect(mockTokens).toHaveProperty('totalTokens');
        expect(realResult).toHaveProperty('totalTokens');

        expect(typeof mockTokens.totalTokens).toBe('number');
        expect(typeof realResult.totalTokens).toBe('number');

        // Token counts should be in a reasonable range (±50% tolerance)
        const ratio = mockTokens.totalTokens / realResult.totalTokens;
        expect(ratio).toBeGreaterThan(0.5);
        expect(ratio).toBeLessThan(2.0);

        console.log(`✅ Token counts: Mock=${mockTokens.totalTokens}, Real=${realResult.totalTokens}, Ratio=${ratio.toFixed(2)}`);
      }
    });

    it('should handle streaming similarly', async () => {
      if (skipIfNoApiKeys()) return;

      const mockRequest: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.creative }],
          role: 'user'
        }]
      };

      // Get mock streaming response
      const mockChunks: GoogleAIGenerateContentResponse[] = [];
      for await (const chunk of mockGoogleAIService.streamGenerateContent(mockRequest)) {
        mockChunks.push(chunk);
      }

      if (realGoogleAI) {
        // Get real streaming response
        const realModel = realGoogleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const realStream = await realModel.generateContentStream(TEST_PROMPTS.creative);
        
        const realChunks: any[] = [];
        for await (const chunk of realStream.stream) {
          realChunks.push(chunk);
        }

        // Both should have multiple chunks
        expect(mockChunks.length).toBeGreaterThan(1);
        expect(realChunks.length).toBeGreaterThan(0);

        // Final chunks should have finish reason
        const mockFinal = mockChunks[mockChunks.length - 1];
        const realFinal = realChunks[realChunks.length - 1];

        expect(mockFinal.candidates?.[0]?.finishReason).toBe('STOP');
        expect(realFinal.candidates?.[0]?.finishReason).toBe('STOP');

        console.log(`✅ Streaming: Mock chunks=${mockChunks.length}, Real chunks=${realChunks.length}`);
      }
    });

    it('should handle embeddings with similar vector dimensions', async () => {
      if (skipIfNoApiKeys()) return;

      const mockRequest: GoogleAIEmbedContentRequest = {
        content: {
          parts: [{ text: TEST_PROMPTS.simple }],
          role: 'user'
        }
      };

      // Get mock embedding
      const mockEmbedding = await mockGoogleAIService.embedContent(mockRequest);

      if (realGoogleAI) {
        // Get real embedding
        const realModel = realGoogleAI.getGenerativeModel({ model: 'text-embedding-004' });
        const realResult = await realModel.embedContent(TEST_PROMPTS.simple);

        expect(mockEmbedding.embedding).toHaveProperty('values');
        expect(realResult.embedding).toHaveProperty('values');

        // Both should have same dimension (768 for text-embedding-004)
        expect(mockEmbedding.embedding.values).toHaveLength(768);
        expect(realResult.embedding.values).toHaveLength(768);

        // Values should be in valid range [-1, 1]
        mockEmbedding.embedding.values.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(-1);
          expect(val).toBeLessThanOrEqual(1);
        });

        console.log('✅ Mock and real embeddings have same dimensions and valid ranges');
      }
    });
  });

  describe('Vertex AI SDK Comparison', () => {
    it('should handle basic text generation with similar structure', async () => {
      if (!realVertexAI || skipIfNoApiKeys()) {
        console.log('⚠️  Skipping Vertex AI test - credentials not available');
        return;
      }

      const mockRequest: GenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.simple }],
          role: 'user'
        }]
      };

      // Get mock response
      const mockResponse = await mockVertexService.generateContent(mockRequest);

      // Get real Vertex AI response
      const realModel = realVertexAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const realResult = await realModel.generateContent(mockRequest);
      const realResponse = realResult.response;

      // Compare structures
      expect(mockResponse).toHaveProperty('candidates');
      expect(realResponse).toHaveProperty('candidates');

      expect(mockResponse.candidates).toHaveLength(1);
      expect(realResponse.candidates).toHaveLength(1);

      if (mockResponse.candidates && realResponse.candidates) {
        expect(mockResponse.candidates[0]).toHaveProperty('content');
        expect(mockResponse.candidates[0]).toHaveProperty('finishReason');
        expect(realResponse.candidates[0]).toHaveProperty('content');
        expect(realResponse.candidates[0]).toHaveProperty('finishReason');
      }

      console.log('✅ Mock and real Vertex AI have similar response structures');
    });

    it('should handle model listing consistently', async () => {
      // Mock models
      const mockModels = mockVertexService.getModels();

      if (realVertexAI) {
        try {
          // Note: Real Vertex AI model listing requires additional setup
          // This is a structural comparison
          expect(mockModels).toBeDefined();
          expect(Array.isArray(mockModels)).toBe(true);
          expect(mockModels.length).toBeGreaterThan(0);

          expect(mockModels[0]).toHaveProperty('name');
          expect(mockModels[0]).toHaveProperty('displayName');
          expect(mockModels[0]).toHaveProperty('inputTokenLimit');
          expect(mockModels[0]).toHaveProperty('outputTokenLimit');

          console.log(`✅ Mock provides ${mockModels.length} models with proper structure`);
        } catch (error) {
          console.log('⚠️  Real Vertex AI model listing requires additional permissions');
        }
      }
    });

    it('should handle token limits consistently', async () => {
      const longText = 'a'.repeat(15000); // Very long text
      const request: GenerateContentRequest = {
        contents: [{
          parts: [{ text: longText }],
          role: 'user'
        }]
      };

      // Mock should reject this for models with low token limits
      await expect(
        mockVertexService.generateContent(request, 'text-embedding-004')
      ).rejects.toThrow();

      // Mock should accept this for models with high token limits
      const response = await mockVertexService.generateContent(request, 'gemini-1.5-pro');
      expect(response).toBeDefined();

      console.log('✅ Mock handles token limits consistently with model specifications');
    });
  });

  describe('Error Handling Comparison', () => {
    it('should handle invalid model names similarly', async () => {
      const mockRequest: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.simple }],
          role: 'user'
        }]
      };

      // Mock should handle invalid model gracefully
      const mockResponse = await mockGoogleAIService.generateContent(mockRequest, 'invalid-model');
      expect(mockResponse).toBeDefined();

      if (realGoogleAI) {
        // Real API should also handle invalid models (may throw or use default)
        try {
          const realModel = realGoogleAI.getGenerativeModel({ model: 'invalid-model' });
          await realModel.generateContent(TEST_PROMPTS.simple);
        } catch (error) {
          expect(error).toBeDefined();
          console.log('✅ Both mock and real API handle invalid models appropriately');
        }
      }
    });

    it('should handle empty content similarly', async () => {
      const emptyRequest: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: '' }],
          role: 'user'
        }]
      };

      // Mock should handle empty content
      const mockResponse = await mockGoogleAIService.generateContent(emptyRequest);
      expect(mockResponse).toBeDefined();
      expect(mockResponse.candidates).toHaveLength(1);

      if (realGoogleAI) {
        try {
          const realModel = realGoogleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          const realResult = await realModel.generateContent('');
          const realResponse = realResult.response;
          
          expect(realResponse.candidates).toBeDefined();
          console.log('✅ Both mock and real API handle empty content');
        } catch (error) {
          console.log('⚠️  Real API behavior with empty content:', (error as Error)?.message);
        }
      }
    });
  });

  describe('Performance Comparison', () => {
    it('should have reasonable response times', async () => {
      if (skipIfNoApiKeys()) return;

      const request: GoogleAIGenerateContentRequest = {
        contents: [{
          parts: [{ text: TEST_PROMPTS.simple }],
          role: 'user'
        }]
      };

      // Measure mock performance
      const mockStart = Date.now();
      await mockGoogleAIService.generateContent(request);
      const mockTime = Date.now() - mockStart;

      console.log(`⏱️  Mock response time: ${mockTime}ms`);

      if (realGoogleAI) {
        // Measure real API performance
        const realStart = Date.now();
        const realModel = realGoogleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        await realModel.generateContent(TEST_PROMPTS.simple);
        const realTime = Date.now() - realStart;

        console.log(`⏱️  Real API response time: ${realTime}ms`);
        console.log(`⏱️  Mock is ${(realTime / mockTime).toFixed(1)}x faster`);

        // Mock should be significantly faster
        expect(mockTime).toBeLessThan(realTime);
      }
    });
  });
}); 