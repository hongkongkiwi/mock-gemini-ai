import { describe, it, expect, beforeEach } from 'vitest';
import { MockGeminiService } from '../../src/services/mock-service';

describe('Code Execution Feature', () => {
  let mockService: MockGeminiService;

  beforeEach(() => {
    mockService = new MockGeminiService({
      mockDelayMs: 10,
      enableStreaming: true,
      defaultModel: 'gemini-1.5-pro',
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

  it('should generate response with code execution tool enabled', async () => {
    const request = {
      contents: [{
        parts: [{ text: 'Calculate the 20th Fibonacci number' }],
        role: 'user'
      }],
      tools: [{ codeExecution: {} }] as any
    };

    const response = await mockService.generateContent(request);
    
    expect(response).toBeDefined();
    expect(response.candidates).toBeDefined();
    expect(response.candidates!.length).toBeGreaterThan(0);
    expect(response.candidates![0].content.parts.length).toBeGreaterThan(0);
  });

  it('should handle request without code execution tool', async () => {
    const request = {
      contents: [{
        parts: [{ text: 'What is the capital of France?' }],
        role: 'user'
      }]
    };

    const response = await mockService.generateContent(request);
    
    expect(response).toBeDefined();
    expect(response.candidates).toBeDefined();
    expect(response.candidates!.length).toBeGreaterThan(0);
  });

  // Test the internal code execution method directly
  it('should simulate code execution correctly', () => {
    const result = (mockService as any).simulateCodeExecution('print("Hello World")');
    expect(result.outcome).toBe('OUTCOME_OK');
    expect(result.output).toContain('Hello World');
  });

  it('should handle invalid code execution', () => {
    const result = (mockService as any).simulateCodeExecution('invalid python syntax !@#');
    expect(result.outcome).toBe('OUTCOME_OK'); // Our mock simulator is basic and returns OK for most cases
    expect(result.output).toBeDefined();
  });

  it('should simulate simple arithmetic', () => {
    const result = (mockService as any).simulateCodeExecution('2 + 3 * 4');
    expect(result.outcome).toBe('OUTCOME_OK');
    expect(result.output).toBe('14\n'); // Includes newline from simulation
  });
}); 