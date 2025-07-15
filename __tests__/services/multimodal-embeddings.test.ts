import { describe, it, expect, beforeEach } from 'vitest';
import { MockGeminiService } from '../../src/services/mock-service';

describe('Multimodal Embeddings', () => {
  let mockService: MockGeminiService;

  beforeEach(() => {
    mockService = new MockGeminiService({
      mockDelayMs: 10,
      enableStreaming: true,
      defaultModel: 'multimodalembedding@001',
      presetResponses: [],
      apiType: 'vertex-ai',
      googleCloud: {
        defaultProjectId: 'test-project',
        defaultLocation: 'us-central1'
      },
      safety: {
        includeSafetyRatings: true,
        includeUsageMetadata: true
      }
    });
  });

  describe('Text Embeddings', () => {
    it('should generate embeddings for text content', async () => {
      const request = {
        content: {
          parts: [{ text: 'Generate embedding for this text' }],
          role: 'user'
        }
      };

      const response = await mockService.embedContent(request, 'text-embedding-004');
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(768);
      expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
      
      // Check values are in valid range
      response.embedding.values.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it('should generate deterministic embeddings for same text', async () => {
      const request = {
        content: {
          parts: [{ text: 'Same text content' }],
          role: 'user'
        }
      };

      const response1 = await mockService.embedContent(request, 'text-embedding-004');
      const response2 = await mockService.embedContent(request, 'text-embedding-004');
      
      expect(response1.embedding.values).toEqual(response2.embedding.values);
    });
  });

  describe('Image Embeddings', () => {
    it('should generate embeddings for image content', async () => {
      const request = {
        content: {
          parts: [
            { text: 'Describe this image' },
            { 
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'base64imagedata...'
              }
            }
          ],
          role: 'user'
        }
      };

      const response = await mockService.embedContent(request, 'multimodalembedding@001');
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(1408); // Multimodal dimensions
      expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
      
      // Check values are in valid range
      response.embedding.values.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it('should generate different embeddings for text vs text+image', async () => {
      const textOnlyRequest = {
        content: {
          parts: [{ text: 'Describe this image' }],
          role: 'user'
        }
      };

      const textWithImageRequest = {
        content: {
          parts: [
            { text: 'Describe this image' },
            { 
              inlineData: {
                mimeType: 'image/png',
                data: 'base64imagedata...'
              }
            }
          ],
          role: 'user'
        }
      };

      const textResponse = await mockService.embedContent(textOnlyRequest, 'multimodalembedding@001');
      const multimodalResponse = await mockService.embedContent(textWithImageRequest, 'multimodalembedding@001');
      
      // Embeddings should be different when image is included
      expect(textResponse.embedding.values).not.toEqual(multimodalResponse.embedding.values);
    });
  });

  describe('Video Embeddings', () => {
    it('should generate embeddings for video content', async () => {
      const request = {
        content: {
          parts: [
            { text: 'Analyze this video' },
            { 
              fileData: {
                mimeType: 'video/mp4',
                fileUri: 'gs://bucket/video.mp4'
              }
            }
          ],
          role: 'user'
        }
      };

      const response = await mockService.embedContent(request, 'multimodalembedding@001');
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(1408);
      expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
    });

    it('should generate distinct embeddings for different video content', async () => {
      const request1 = {
        content: {
          parts: [
            { text: 'Video 1' },
            { 
              fileData: {
                mimeType: 'video/mp4',
                fileUri: 'gs://bucket/video1.mp4'
              }
            }
          ],
          role: 'user'
        }
      };

      const request2 = {
        content: {
          parts: [
            { text: 'Video 2' },
            { 
              fileData: {
                mimeType: 'video/mp4',
                fileUri: 'gs://bucket/video2.mp4'
              }
            }
          ],
          role: 'user'
        }
      };

      const response1 = await mockService.embedContent(request1, 'multimodalembedding@001');
      const response2 = await mockService.embedContent(request2, 'multimodalembedding@001');
      
      expect(response1.embedding.values).not.toEqual(response2.embedding.values);
    });
  });

  describe('Audio Embeddings', () => {
    it('should generate embeddings for audio content', async () => {
      const request = {
        content: {
          parts: [
            { text: 'Transcribe this audio' },
            { 
              inlineData: {
                mimeType: 'audio/wav',
                data: 'base64audiodata...'
              }
            }
          ],
          role: 'user'
        }
      };

      const response = await mockService.embedContent(request, 'multimodalembedding@001');
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(1408);
      expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
    });
  });

  describe('Batch Embeddings', () => {
    it('should generate batch embeddings for mixed content types', async () => {
      const batchRequest = {
        requests: [
          {
            content: {
              parts: [{ text: 'Text only content' }],
              role: 'user'
            }
          },
          {
            content: {
              parts: [
                { text: 'Text with image' },
                { 
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'base64imagedata...'
                  }
                }
              ],
              role: 'user'
            }
          },
          {
            content: {
              parts: [
                { text: 'Text with audio' },
                { 
                  inlineData: {
                    mimeType: 'audio/mp3',
                    data: 'base64audiodata...'
                  }
                }
              ],
              role: 'user'
            }
          }
        ]
      };

      const response = await mockService.batchEmbedContents(batchRequest, 'multimodalembedding@001');
      
      expect(response).toBeDefined();
      expect(response.embeddings).toHaveLength(3);
      
      // All embeddings should have the same dimensions
      response.embeddings.forEach(embedding => {
        expect(embedding.values).toHaveLength(1408);
        embedding.values.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(-1);
          expect(val).toBeLessThanOrEqual(1);
        });
      });

      // Different content types should produce different embeddings
      expect(response.embeddings[0].values).not.toEqual(response.embeddings[1].values);
      expect(response.embeddings[1].values).not.toEqual(response.embeddings[2].values);
    });
  });

  describe('Model-Specific Dimensions', () => {
    it('should return correct dimensions for different embedding models', async () => {
      const request = {
        content: {
          parts: [{ text: 'Test embedding dimensions' }],
          role: 'user'
        }
      };

      // Test text-embedding-004 (768 dimensions)
      const textResponse = await mockService.embedContent(request, 'text-embedding-004');
      expect(textResponse.embedding.values).toHaveLength(768);

      // Test multimodalembedding@001 (1408 dimensions)
      const multimodalResponse = await mockService.embedContent(request, 'multimodalembedding@001');
      expect(multimodalResponse.embedding.values).toHaveLength(1408);

      // Test text-multilingual-embedding-002 (768 dimensions)
      const multilingualResponse = await mockService.embedContent(request, 'text-multilingual-embedding-002');
      expect(multilingualResponse.embedding.values).toHaveLength(768);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid content gracefully', async () => {
      const request = {
        content: null
      };

      const response = await mockService.embedContent(request, 'text-embedding-004');
      
      expect(response).toBeDefined();
      expect(response.embedding.values).toHaveLength(768);
    });

    it('should enforce token limits', async () => {
      const longText = 'a'.repeat(20000); // Very long text
      const request = {
        content: {
          parts: [{ text: longText }],
          role: 'user'
        }
      };

      await expect(
        mockService.embedContent(request, 'text-embedding-004')
      ).rejects.toThrow('Request exceeds token limit');
    });
  });
}); 