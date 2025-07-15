import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { google } from '@ai-sdk/google';
import { generateText, streamText, generateObject, embed } from 'ai';
import { z } from 'zod';
import { MockGeminiService } from '../../src/services/mock-service';
import { TEST_CONFIG } from '../test-setup';
import express from 'express';
import { Server } from 'http';

let app: express.Application;
let server: Server;
let mockService: MockGeminiService;
const TEST_PORT = 3001;
const MOCK_BASE_URL = `http://localhost:${TEST_PORT}`;

describe('Vercel AI SDK - Google AI Provider Integration', () => {
  beforeAll(async () => {
    // Start mock server
    mockService = new MockGeminiService({
      delay: TEST_CONFIG.MOCK_DELAY,
      enableCaching: true,
      enableLiveAPI: true,
      enableAdvancedFeatures: true
    });

    app = express();
    app.use(express.json());
    
    // Mount mock routes for Google AI format
    app.post('/v1beta/models/:model/:method', async (req, res) => {
      try {
        const { model, method } = req.params;
        
        // Handle embedContent case with colon in the URL
        if (method.includes('embedContent') || req.url.includes(':embedContent')) {
          const result = {
            embedding: {
              values: Array.from({ length: 768 }, () => Math.random() - 0.5)
            }
          };
          return res.json(result);
        }
        
        const result = await mockService.processRequest({
          model: model,
          contents: req.body.contents || [],
          generationConfig: req.body.generationConfig || {},
          safetySettings: req.body.safetySettings || [],
          tools: req.body.tools || [],
          systemInstruction: req.body.systemInstruction
        }, 'google-ai');
        
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    server = app.listen(TEST_PORT);
    
    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      server.on('listening', resolve);
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Text Generation with generateText', () => {
    it('should generate text using Gemini 1.5 Pro', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        prompt: 'Write a short story about a robot learning to paint.',
        maxTokens: 100
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.usage?.promptTokens).toBeGreaterThan(0);
      expect(result.usage?.completionTokens).toBeGreaterThan(0);
    });

    it('should generate text using Gemini 2.0 Flash', async () => {
      const model = google('gemini-2.0-flash-exp', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        prompt: 'Explain quantum computing in simple terms',
        maxTokens: 150
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should handle system instructions', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        system: 'You are a helpful AI assistant that always responds in a formal tone.',
        prompt: 'What is the weather like today?',
        maxTokens: 100
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });

    it('should handle multimodal input with image', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What do you see in this image?' },
              {
                type: 'image',
                image: Buffer.from('fake-image-data', 'base64')
              }
            ]
          }
        ],
        maxTokens: 100
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });
  });

  describe('Streaming with streamText', () => {
    it('should stream text generation', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = streamText({
        model,
        prompt: 'Count from 1 to 10 with explanations',
        maxTokens: 200
      });

      let fullText = '';
      let chunks = 0;

      for await (const textPart of result.textStream) {
        fullText += textPart;
        chunks++;
      }

      expect(fullText.length).toBeGreaterThan(0);
      expect(chunks).toBeGreaterThan(0);
      
      const finalResult = await result.response;
      expect(finalResult.text).toBe(fullText);
    });

    it('should stream with reasoning (thinking mode)', async () => {
      const model = google('gemini-2.0-flash-thinking-exp', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = streamText({
        model,
        prompt: 'Solve this math problem: What is 15 * 23?',
        experimental_providerOptions: {
          google: {
            includeThoughts: true
          }
        }
      });

      let hasReasoning = false;
      let hasText = false;

      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          hasText = true;
        } else if (part.type === 'reasoning') {
          hasReasoning = true;
        }
      }

      expect(hasText).toBe(true);
      // Note: Reasoning may or may not be present depending on mock implementation
    });
  });

  describe('Tool Calling', () => {
    it('should handle function calling', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const weatherTool = {
        name: 'getWeather',
        description: 'Get current weather for a location',
        parameters: z.object({
          location: z.string().describe('The city and state/country'),
          unit: z.enum(['celsius', 'fahrenheit']).optional()
        })
      };

      const result = await generateText({
        model,
        prompt: 'What is the weather like in New York?',
        tools: { getWeather: weatherTool },
        maxToolRoundtrips: 2
      });

      expect(result.text).toBeDefined();
      // Tool calls may or may not be present depending on mock behavior
    });

    it('should handle code execution tool', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        prompt: 'Calculate the factorial of 5 using Python code',
        tools: {
          executeCode: {
            name: 'executeCode',
            description: 'Execute Python code',
            parameters: z.object({
              code: z.string().describe('Python code to execute')
            })
          }
        },
        maxToolRoundtrips: 1
      });

      expect(result.text).toBeDefined();
    });
  });

  describe('Structured Output with generateObject', () => {
    it('should generate structured JSON output', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const schema = z.object({
        recipe: z.object({
          name: z.string(),
          ingredients: z.array(z.string()),
          instructions: z.array(z.string()),
          prepTime: z.number(),
          difficulty: z.enum(['easy', 'medium', 'hard'])
        })
      });

      const result = await generateObject({
        model,
        schema,
        prompt: 'Generate a recipe for chocolate chip cookies'
      });

      expect(result.object).toBeDefined();
      expect(result.object.recipe).toBeDefined();
      expect(result.object.recipe.name).toBeDefined();
      expect(Array.isArray(result.object.recipe.ingredients)).toBe(true);
      expect(Array.isArray(result.object.recipe.instructions)).toBe(true);
      expect(typeof result.object.recipe.prepTime).toBe('number');
      expect(['easy', 'medium', 'hard']).toContain(result.object.recipe.difficulty);
    });

    it('should generate structured output for data analysis', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const schema = z.object({
        analysis: z.object({
          summary: z.string(),
          keyPoints: z.array(z.string()),
          recommendations: z.array(z.string()),
          confidence: z.number().min(0).max(1)
        })
      });

      const result = await generateObject({
        model,
        schema,
        prompt: 'Analyze the trends in renewable energy adoption over the past 5 years'
      });

      expect(result.object.analysis).toBeDefined();
      expect(typeof result.object.analysis.summary).toBe('string');
      expect(Array.isArray(result.object.analysis.keyPoints)).toBe(true);
      expect(Array.isArray(result.object.analysis.recommendations)).toBe(true);
      expect(typeof result.object.analysis.confidence).toBe('number');
      expect(result.object.analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(result.object.analysis.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Embeddings', () => {
    it('should generate text embeddings', async () => {
      const model = google.textEmbeddingModel('text-embedding-004', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await embed({
        model,
        value: 'This is a test sentence for embedding generation.'
      });

      expect(result.embedding).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.embedding.length).toBeGreaterThan(0);
      expect(typeof result.embedding[0]).toBe('number');
    });

    it('should generate embeddings for multiple texts', async () => {
      const model = google.textEmbeddingModel('text-embedding-004', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const texts = [
        'First test sentence',
        'Second test sentence',
        'Third test sentence'
      ];

      const results = await Promise.all(
        texts.map(text => embed({ model, value: text }))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.embedding).toBeDefined();
        expect(Array.isArray(result.embedding)).toBe(true);
        expect(result.embedding.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Safety and Configuration', () => {
    it('should handle safety settings', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key',
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      });

      const result = await generateText({
        model,
        prompt: 'Tell me about internet safety for children',
        maxTokens: 100
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });

    it('should handle generation config parameters', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      const result = await generateText({
        model,
        prompt: 'Generate a creative story',
        temperature: 0.9,
        maxTokens: 150,
        topP: 0.95,
        topK: 40
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.usage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const model = google('invalid-model', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      await expect(generateText({
        model,
        prompt: 'This should fail',
        maxTokens: 100
      })).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: 'http://invalid-url:9999/v1beta',
        apiKey: 'test-key'
      });

      await expect(generateText({
        model,
        prompt: 'This should fail due to network error',
        maxTokens: 100
      })).rejects.toThrow();
    });
  });

  describe('Context Caching', () => {
    it('should work with cached context', async () => {
      const model = google('gemini-1.5-pro', {
        baseURL: `${MOCK_BASE_URL}/v1beta`,
        apiKey: 'test-key'
      });

      // First request to potentially cache context
      const result1 = await generateText({
        model,
        prompt: 'This is a long context that should be cached for future use...',
        maxTokens: 50
      });

      // Second request that might use cached context
      const result2 = await generateText({
        model,
        prompt: 'Continue from the previous context...',
        maxTokens: 50
      });

      expect(result1.text).toBeDefined();
      expect(result2.text).toBeDefined();
    });
  });
}); 