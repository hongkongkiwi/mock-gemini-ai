import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MockGeminiService, 
  TokenLimitError, 
  createMockGeminiService, 
  createMockGeminiServiceForProject, 
  createMockGeminiServiceWithPresets,
  createGoogleAIService,
  createVertexAIService,
  createServiceForAPIType,
  createConfig,
  MockGeminiServiceConfig
} from '../../src/services/mock-service';
import { GoogleAIService, GoogleAITokenLimitError } from '../../src/services/google-ai-service';
import { 
  GenerateContentRequest, 
  GenerateContentResponse, 
  Schema, 
  SchemaType, 
  FinishReason,
  HarmCategory,
  HarmProbability,
  HarmSeverity
} from '../../src/types/vertex-ai';
import {
  GoogleAIGenerateContentRequest,
  GoogleAICountTokensRequest,
  GoogleAIEmbedContentRequest
} from '../../src/types/google-ai';
import { PresetResponse } from '../../src/data/preset-responses';

describe('MockGeminiService', () => {
  let service: MockGeminiService;

  beforeEach(() => {
    service = createMockGeminiService();
  });

  describe('API Type Selection', () => {
    it('should create Vertex AI service by default', () => {
      const vertexService = createMockGeminiService();
      expect(vertexService).toBeInstanceOf(MockGeminiService);
    });

    it('should create Google AI service when specified', async () => {
      const googleAIService = await createGoogleAIService();
      expect(googleAIService).toBeInstanceOf(GoogleAIService);
    });

    it('should create Vertex AI service when explicitly specified', () => {
      const vertexService = createVertexAIService();
      expect(vertexService).toBeInstanceOf(MockGeminiService);
    });

    it('should create correct service based on API type', async () => {
      const vertexService = await createServiceForAPIType('vertex-ai');
      const googleAIService = await createServiceForAPIType('google-ai');
      
      expect(vertexService).toBeInstanceOf(MockGeminiService);
      expect(googleAIService).toBeInstanceOf(GoogleAIService);
    });

    it('should configure Google AI service with custom settings', async () => {
      const googleAIService = await createGoogleAIService({
        mockDelayMs: 50,
        googleAI: {
          apiKey: 'test-key',
          baseUrl: 'https://custom.url'
        }
      });
      
      expect(googleAIService).toBeInstanceOf(GoogleAIService);
    });
  });

  describe('Google AI Service', () => {
    let googleAIService: GoogleAIService;

    beforeEach(async () => {
      googleAIService = await createGoogleAIService({
        mockDelayMs: 10 // Fast tests
      });
    });

    it('should generate content with Google AI format', async () => {
      const request: GoogleAIGenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Hello, how are you?' }],
            role: 'user'
          }
        ]
      };

      const response = await googleAIService.generateContent(request);
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      expect(response.candidates[0].content.parts[0].text).toContain('Hello!');
      expect(response.candidates[0].finishReason).toBe('STOP');
    });

    it('should validate input token limits', async () => {
      const longText = 'a'.repeat(15000); // Very long text
      const request: GoogleAIGenerateContentRequest = {
        contents: [
          {
            parts: [{ text: longText }],
            role: 'user'
          }
        ]
      };

      await expect(googleAIService.generateContent(request, 'text-embedding-004')).rejects.toThrow(GoogleAITokenLimitError);
    });

    it('should count tokens', async () => {
      const request: GoogleAICountTokensRequest = {
        contents: [
          {
            parts: [{ text: 'This is a test message' }],
            role: 'user'
          }
        ]
      };

      const response = await googleAIService.countTokens(request);
      
      expect(response).toBeDefined();
      expect(response.totalTokens).toBeGreaterThan(0);
      expect(typeof response.totalTokens).toBe('number');
    });

    it('should generate embeddings', async () => {
      const request: GoogleAIEmbedContentRequest = {
        content: {
          parts: [{ text: 'Test embedding content' }],
          role: 'user'
        }
      };

      const response = await googleAIService.embedContent(request);
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(768);
      expect(response.embedding.values[0]).toBeGreaterThanOrEqual(-1);
      expect(response.embedding.values[0]).toBeLessThanOrEqual(1);
    });

    it('should stream content', async () => {
      const request: GoogleAIGenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'hello' }],
            role: 'user'
          }
        ]
      };

      const chunks: any[] = [];
      
      for await (const chunk of googleAIService.streamGenerateContent(request)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].candidates[0].finishReason).toBe('STOP');
    });

    it('should list Google AI models', () => {
      const models = googleAIService.getModels();
      
      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('displayName');
      expect(models[0]).toHaveProperty('inputTokenLimit');
      expect(models[0]).toHaveProperty('outputTokenLimit');
    });

    it('should find Google AI model by name', () => {
      const model = googleAIService.getModel('gemini-1.5-pro');
      
      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Gemini 1.5 Pro');
      expect(model?.inputTokenLimit).toBe(2097152);
    });

    it('should generate structured JSON output', async () => {
      const request: GoogleAIGenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Generate a character profile' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' }
            },
            required: ['name', 'age']
          }
        }
      };

      const response = await googleAIService.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      
      const part = response.candidates[0].content.parts[0];
      expect(part).toBeDefined();
      expect(part.text).toBeDefined();
      
      if (part.text) {
        const jsonResponse = JSON.parse(part.text);
        expect(jsonResponse).toBeDefined();
        expect(jsonResponse).toHaveProperty('name');
        expect(jsonResponse).toHaveProperty('age');
        expect(typeof jsonResponse.name).toBe('string');
        expect(typeof jsonResponse.age).toBe('number');
      } else {
        // Fail the test if there's no text response
        expect(part.text).toBeDefined();
      }
    });

    it('should generate enum responses', async () => {
      const request: GoogleAIGenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'This is an amazing product! I love it!' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'text/x.enum',
          responseSchema: {
            type: 'string',
            enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL']
          }
        }
      };

      const response = await googleAIService.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates[0].content.parts[0];
      if (part.text) {
        expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(part.text);
      }
    });
  });

  describe('configuration', () => {
    it('should create service with default configuration', () => {
      const defaultService = createMockGeminiService();
      expect(defaultService).toBeInstanceOf(MockGeminiService);
      
      const models = defaultService.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should create service with custom configuration', () => {
      const customService = createMockGeminiService({
        mockDelayMs: 50,
        defaultModel: 'gemini-2.0-flash',
        googleCloud: {
          defaultProjectId: 'test-project',
          defaultLocation: 'us-west1'
        }
      });
      
      expect(customService).toBeInstanceOf(MockGeminiService);
      const models = customService.getModels();
      expect(models[0].name).toContain('test-project');
      expect(models[0].name).toContain('us-west1');
    });

    it('should create service for specific project', () => {
      const projectService = createMockGeminiServiceForProject('my-project', 'europe-west1');
      
      const models = projectService.getModels();
      expect(models[0].name).toContain('my-project');
      expect(models[0].name).toContain('europe-west1');
    });

    it('should create service with custom presets', () => {
      const customPresets: PresetResponse[] = [
        {
          id: 'test-preset',
          name: 'Test Preset',
          description: 'A test preset',
          trigger: {
            type: 'text',
            value: 'custom test'
          },
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: 'Custom response' }],
                  role: 'model'
                },
                finishReason: FinishReason.STOP,
                index: 0
              }
            ],
            usageMetadata: {
              promptTokenCount: 2,
              candidatesTokenCount: 2,
              totalTokenCount: 4
            }
          }
        }
      ];

      const customService = createMockGeminiServiceWithPresets(customPresets);
      const presets = customService.getPresetResponses();
      
      expect(presets).toHaveLength(1);
      expect(presets[0].id).toBe('test-preset');
    });

    it('should merge configuration properly', () => {
      const customConfig = createConfig({
        mockDelayMs: 200,
        apiType: 'google-ai',
        googleCloud: {
          defaultProjectId: 'merged-project',
          defaultLocation: 'us-central1'
        }
      });

      expect(customConfig.mockDelayMs).toBe(200);
      expect(customConfig.apiType).toBe('google-ai');
      expect(customConfig.googleCloud.defaultProjectId).toBe('merged-project');
      expect(customConfig.googleCloud.defaultLocation).toBe('us-central1');
      expect(customConfig.defaultModel).toBe('gemini-1.5-pro'); // Should keep default
    });

    it('should support multiple independent service instances', async () => {
      const service1 = createMockGeminiService({
        mockDelayMs: 10,
        googleCloud: { 
          defaultProjectId: 'project1',
          defaultLocation: 'us-central1'
        }
      });

      const service2 = createMockGeminiService({
        mockDelayMs: 20,
        googleCloud: { 
          defaultProjectId: 'project2',
          defaultLocation: 'us-central1'
        }
      });

      const models1 = service1.getModels();
      const models2 = service2.getModels();

      expect(models1[0].name).toContain('project1');
      expect(models2[0].name).toContain('project2');
      expect(models1[0].name).not.toContain('project2');
      expect(models2[0].name).not.toContain('project1');
    });

    it('should support both API types with different configurations', async () => {
      const vertexService = createVertexAIService({
        mockDelayMs: 50,
        googleCloud: {
          defaultProjectId: 'vertex-project',
          defaultLocation: 'us-central1'
        }
      });

      const googleAIService = await createGoogleAIService({
        mockDelayMs: 25,
        googleAI: {
          apiKey: 'test-key',
          baseUrl: 'https://test.googleapis.com'
        }
      });

      expect(vertexService).toBeInstanceOf(MockGeminiService);
      expect(googleAIService).toBeInstanceOf(GoogleAIService);
    });
  });

  describe('generateContent', () => {
    it('should return a preset response for hello', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Hello, how are you?' }],
            role: 'user'
          }
        ]
      };

      const response = await service.generateContent(request);
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      expect(response.candidates?.[0].content.parts[0].text).toContain('Hello!');
      expect(response.candidates?.[0].finishReason).toBe('STOP');
    });

    it('should return a preset response for code request', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Write some code for me' }],
            role: 'user'
          }
        ]
      };

      const response = await service.generateContent(request);
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      expect(response.candidates?.[0].content.parts[0].text).toContain('```javascript');
      expect(response.candidates?.[0].finishReason).toBe('STOP');
    });

    it('should return fallback response for unmatched input', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Some random unmatched text' }],
            role: 'user'
          }
        ]
      };

      const response = await service.generateContent(request);
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      expect(response.candidates?.[0].content.parts[0].text).toContain('mock response');
      expect(response.candidates?.[0].finishReason).toBe('STOP');
    });
  });

  describe('token limit validation', () => {
    it('should reject input that exceeds token limit', async () => {
      const longText = 'a'.repeat(15000); // Very long text to exceed token limit (15000 chars = ~3750 tokens)
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: longText }],
            role: 'user'
          }
        ]
      };

      // Use text-embedding-004 which has a low input token limit of 3072
      await expect(service.generateContent(request, 'text-embedding-004')).rejects.toThrow(TokenLimitError);
    });

    it('should allow input within token limit', async () => {
      const shortText = 'Hello world';
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: shortText }],
            role: 'user'
          }
        ]
      };

      // Use gemini-1.5-pro which has a high input token limit
      const response = await service.generateContent(request, 'gemini-1.5-pro');
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
    });

    it('should trim output response to fit within token limit', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Write some code for me' }],
            role: 'user'
          }
        ]
      };

      // Use text-embedding-004 which has outputTokenLimit of 1 (very low)
      const response = await service.generateContent(request, 'text-embedding-004');
      
      expect(response).toBeDefined();
      expect(response.candidates).toHaveLength(1);
      
      // The response should be trimmed to fit the token limit
      const responseText = response.candidates?.[0].content.parts[0].text || '';
      const tokenCount = Math.ceil(responseText.length / 4); // Rough token estimation
      expect(tokenCount).toBeLessThanOrEqual(5); // Should be very short due to low limit
    });
  });

  describe('countTokens', () => {
    it('should count tokens approximately', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'This is a test message' }],
            role: 'user'
          }
        ]
      };

      const response = await service.countTokens(request);
      
      expect(response).toBeDefined();
      expect(response.totalTokens).toBeGreaterThan(0);
      expect(typeof response.totalTokens).toBe('number');
    });

    it('should return default token count for empty content', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: '' }],
            role: 'user'
          }
        ]
      };

      const response = await service.countTokens(request);
      
      expect(response).toBeDefined();
      expect(response.totalTokens).toBe(42); // Default fallback
    });

    it('should reject token counting for input exceeding limit', async () => {
      const longText = 'a'.repeat(15000); // Very long text to exceed token limit
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: longText }],
            role: 'user'
          }
        ]
      };

      // Use text-embedding-004 which has a low input token limit of 3072
      await expect(service.countTokens(request, 'text-embedding-004')).rejects.toThrow(TokenLimitError);
    });
  });

  describe('embedContent', () => {
    it('should generate deterministic embedding', async () => {
      const request: any = {
        content: {
          parts: [{ text: 'Test embedding content' }],
          role: 'user'
        }
      };

      const response = await service.embedContent(request);
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(768);
      expect(response.embedding.values[0]).toBeGreaterThanOrEqual(-1);
      expect(response.embedding.values[0]).toBeLessThanOrEqual(1);
    });

    it('should generate same embedding for same content', async () => {
      const request: any = {
        content: {
          parts: [{ text: 'Same content' }],
          role: 'user'
        }
      };

      const response1 = await service.embedContent(request);
      const response2 = await service.embedContent(request);
      
      expect(response1.embedding.values).toEqual(response2.embedding.values);
    });

    it('should reject embedding content exceeding token limit', async () => {
      const longText = 'a'.repeat(15000); // Very long text to exceed token limit
      const request: any = {
        content: {
          parts: [{ text: longText }],
          role: 'user'
        }
      };

      // Use text-embedding-004 which has a low input token limit of 3072
      await expect(service.embedContent(request, 'text-embedding-004')).rejects.toThrow(TokenLimitError);
    });
  });

  describe('streamGenerateContent', () => {
    it('should stream content word by word', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'hello' }],
            role: 'user'
          }
        ]
      };

      const chunks: any[] = [];
      
      for await (const chunk of service.streamGenerateContent(request)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].candidates[0].finishReason).toBe('STOP');
      expect(chunks[chunks.length - 1].usageMetadata).toBeDefined();
    });
  });

  describe('preset management', () => {
    it('should add and retrieve preset responses', () => {
      const preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        trigger: {
          type: 'text' as const,
          value: 'test trigger'
        },
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Test response' }],
                role: 'model' as const
              },
              finishReason: FinishReason.STOP,
              index: 0
            }
          ],
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 2,
            totalTokenCount: 4
          }
        }
      };

      service.addPresetResponse(preset);
      const presets = service.getPresetResponses();
      
      expect(presets).toContain(preset);
    });

    it('should update preset responses', () => {
      const preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        trigger: {
          type: 'text' as const,
          value: 'test trigger'
        },
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Test response' }],
                role: 'model' as const
              },
              finishReason: FinishReason.STOP,
              index: 0
            }
          ],
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 2,
            totalTokenCount: 4
          }
        }
      };

      service.addPresetResponse(preset);
      
      const success = service.updatePresetResponse('test-preset', {
        name: 'Updated Test Preset'
      });
      
      expect(success).toBe(true);
      
      const updatedPresets = service.getPresetResponses();
      const updatedPreset = updatedPresets.find(p => p.id === 'test-preset');
      
      expect(updatedPreset?.name).toBe('Updated Test Preset');
    });

    it('should remove preset responses', () => {
      const preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        trigger: {
          type: 'text' as const,
          value: 'test trigger'
        },
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Test response' }],
                role: 'model' as const
              },
              finishReason: FinishReason.STOP,
              index: 0
            }
          ],
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 2,
            totalTokenCount: 4
          }
        }
      };

      service.addPresetResponse(preset);
      
      const success = service.removePresetResponse('test-preset');
      expect(success).toBe(true);
      
      const presets = service.getPresetResponses();
      expect(presets.find(p => p.id === 'test-preset')).toBeUndefined();
    });
  });

  describe('models', () => {
    it('should return available models', () => {
      const models = service.getModels();
      
      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('displayName');
    });

    it('should find model by name', () => {
      const model = service.getModel('projects/mock-project/locations/us-central1/publishers/google/models/gemini-1.5-pro');
      
      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Gemini 1.5 Pro');
    });

    it('should return undefined for non-existent model', () => {
      const model = service.getModel('non-existent-model');
      
      expect(model).toBeUndefined();
    });
  });

  describe('structured output', () => {
    it('should generate JSON response with schema', async () => {
      const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          age: { type: SchemaType.INTEGER },
          occupation: { type: SchemaType.STRING }
        },
        required: ['name', 'age']
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Generate a character profile' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      expect(response.candidates?.[0]?.content?.parts?.[0]).toBeDefined();
      
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part && part.text) {
        const jsonResponse = JSON.parse(part.text);
        expect(jsonResponse).toHaveProperty('name');
        expect(jsonResponse).toHaveProperty('age');
        expect(typeof jsonResponse.name).toBe('string');
        expect(typeof jsonResponse.age).toBe('number');
      }
    });

    it('should generate array JSON response with schema', async () => {
      const schema: Schema = {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            recipeName: { type: SchemaType.STRING },
            ingredients: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            }
          },
          required: ['recipeName']
        }
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'List some cookie recipes' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part && part.text) {
        const jsonResponse = JSON.parse(part.text);
        expect(Array.isArray(jsonResponse)).toBe(true);
        expect(jsonResponse.length).toBeGreaterThan(0);
        expect(jsonResponse[0]).toHaveProperty('recipeName');
        expect(typeof jsonResponse[0].recipeName).toBe('string');
      }
    });

    it('should generate enum response', async () => {
      const schema: Schema = {
        type: SchemaType.STRING,
        enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL']
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'This is an amazing product! I love it!' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'text/x.enum',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part) {
        expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(part.text);
      }
    });

    it('should generate genre classification enum', async () => {
      const schema: Schema = {
        type: SchemaType.STRING,
        enum: ['drama', 'comedy', 'documentary']
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'This film aims to educate viewers about real-life subjects and events.' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'text/x.enum',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part) {
        expect(['drama', 'comedy', 'documentary']).toContain(part.text);
        expect(part.text).toBe('documentary'); // Should detect documentary from context
      }
    });

    it('should generate complex nested JSON structure', async () => {
      const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          characters: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                age: { type: SchemaType.INTEGER },
                playable: { type: SchemaType.BOOLEAN },
                children: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      name: { type: SchemaType.STRING },
                      age: { type: SchemaType.INTEGER }
                    },
                    required: ['name', 'age']
                  }
                }
              },
              required: ['name', 'age', 'playable']
            }
          }
        },
        required: ['characters']
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Generate character profiles for a video game' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part && part.text) {
        const jsonResponse = JSON.parse(part.text);
        expect(jsonResponse).toHaveProperty('characters');
        expect(Array.isArray(jsonResponse.characters)).toBe(true);
        expect(jsonResponse.characters.length).toBeGreaterThan(0);
        
        const character = jsonResponse.characters[0];
        expect(character).toHaveProperty('name');
        expect(character).toHaveProperty('age');
        expect(character).toHaveProperty('playable');
        expect(typeof character.name).toBe('string');
        expect(typeof character.age).toBe('number');
        expect(typeof character.playable).toBe('boolean');
        
        // Children is optional - if present, it should be an array
        if (character.children) {
          expect(Array.isArray(character.children)).toBe(true);
        }
      }
    });

    it('should handle property ordering in JSON schema', async () => {
      const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          age: { type: SchemaType.INTEGER },
          occupation: { type: SchemaType.STRING }
        },
        required: ['name']
      };

      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Generate a person profile' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part && part.text) {
        const jsonResponse = JSON.parse(part.text);
        expect(jsonResponse).toHaveProperty('name');
        expect(typeof jsonResponse.name).toBe('string');
        
        // Check that property ordering is respected in generated object
        const keys = Object.keys(jsonResponse);
        const nameIndex = keys.indexOf('name');
        const occupationIndex = keys.indexOf('occupation');
        const ageIndex = keys.indexOf('age');
        
        if (occupationIndex !== -1 && nameIndex !== -1) {
          expect(nameIndex).toBeLessThan(occupationIndex);
        }
      }
    });

    it('should fallback to regular response if schema is invalid', async () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            parts: [{ text: 'Hello there' }],
            role: 'user'
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          // Missing responseSchema
        }
      };

      const response = await service.generateContent(request);
      
      expect(response.candidates).toBeDefined();
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && 'text' in part) {
        // Should fallback to regular preset response
        expect(part.text).toContain('Hello');
      }
    });
  });
}); 