import { Content, Part } from '../types/vertex-ai';

interface ThinkingPart {
  thought: {
    reasoning: string;
  };
}

/**
 * Thinking Mode Service for Gemini 2.5 Pro reasoning display
 */
export class ThinkingModeService {
  private readonly THINKING_ENABLED_MODELS = [
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  /**
   * Check if thinking mode is supported for a model
   */
  isThinkingModeSupported(modelName?: string): boolean {
    if (!modelName) return false;
    return this.THINKING_ENABLED_MODELS.some(model => 
      modelName.toLowerCase().includes(model.toLowerCase())
    );
  }

  /**
   * Generate thinking process for a request
   */
  generateThinkingProcess(
    inputText: string, 
    modelName?: string,
    responseHint?: string
  ): ThinkingPart | null {
    if (!this.isThinkingModeSupported(modelName)) {
      return null;
    }

    const reasoning = this.createReasoningProcess(inputText, responseHint);
    
    return {
      thought: {
        reasoning
      }
    };
  }

  /**
   * Add thinking process to response parts
   */
  addThinkingToResponse(
    originalParts: Part[],
    inputText: string,
    modelName?: string
  ): Part[] {
    if (!this.isThinkingModeSupported(modelName)) {
      return originalParts;
    }

    // Extract hint from original response for more contextual thinking
    const responseHint = originalParts
      .filter(part => 'text' in part)
      .map(part => (part as any).text)
      .join(' ')
      .substring(0, 100);

    const thinkingPart = this.generateThinkingProcess(inputText, modelName, responseHint);
    
    if (!thinkingPart) {
      return originalParts;
    }

    // Add thinking before the actual response
    return [thinkingPart as any, ...originalParts];
  }

  /**
   * Enable/disable thinking mode for specific requests
   */
  shouldEnableThinking(
    request: any,
    modelName?: string
  ): boolean {
    // Check if model supports thinking
    if (!this.isThinkingModeSupported(modelName)) {
      return false;
    }

    // Check if explicitly requested in generation config
    if (request.generationConfig?.enableThinking === false) {
      return false;
    }

    // Enable for complex queries
    const inputText = this.extractTextFromRequest(request);
    return this.isComplexQuery(inputText);
  }

  // Private helper methods

  private createReasoningProcess(inputText: string, responseHint?: string): string {
    const reasoningSteps: string[] = [];

    // Analyze the input
    reasoningSteps.push("Let me analyze this request step by step.");

    // Determine query type
    const queryType = this.classifyQuery(inputText);
    reasoningSteps.push(`This appears to be a ${queryType} query.`);

    // Add domain-specific reasoning
    if (queryType === 'technical') {
      reasoningSteps.push("For technical questions, I should provide accurate, detailed information with examples where helpful.");
    } else if (queryType === 'creative') {
      reasoningSteps.push("For creative tasks, I should be imaginative while maintaining coherence and quality.");
    } else if (queryType === 'analytical') {
      reasoningSteps.push("For analytical questions, I should break down the problem systematically and provide logical reasoning.");
    } else if (queryType === 'factual') {
      reasoningSteps.push("For factual questions, I should provide accurate, up-to-date information from reliable sources.");
    }

    // Consider response approach
    if (responseHint) {
      if (responseHint.includes('code') || responseHint.includes('example')) {
        reasoningSteps.push("I should include practical examples or code snippets to illustrate the concepts.");
      }
      if (responseHint.includes('step') || responseHint.includes('process')) {
        reasoningSteps.push("I should structure this as a step-by-step explanation.");
      }
    }

    // Add complexity consideration
    if (this.isComplexQuery(inputText)) {
      reasoningSteps.push("This is a complex topic, so I'll break it down into manageable parts and ensure comprehensive coverage.");
    }

    // Final approach
    reasoningSteps.push("Now let me provide a helpful and comprehensive response.");

    return reasoningSteps.join('\n\n');
  }

  private classifyQuery(inputText: string): string {
    const lowerText = inputText.toLowerCase();

    // Technical indicators
    if (lowerText.includes('code') || lowerText.includes('programming') || 
        lowerText.includes('algorithm') || lowerText.includes('api') ||
        lowerText.includes('function') || lowerText.includes('implementation')) {
      return 'technical';
    }

    // Creative indicators
    if (lowerText.includes('write') || lowerText.includes('create') || 
        lowerText.includes('story') || lowerText.includes('poem') ||
        lowerText.includes('design') || lowerText.includes('imagine')) {
      return 'creative';
    }

    // Analytical indicators
    if (lowerText.includes('analyze') || lowerText.includes('compare') || 
        lowerText.includes('evaluate') || lowerText.includes('why') ||
        lowerText.includes('how does') || lowerText.includes('explain')) {
      return 'analytical';
    }

    // Factual indicators
    if (lowerText.includes('what is') || lowerText.includes('who is') || 
        lowerText.includes('when') || lowerText.includes('where') ||
        lowerText.includes('define') || lowerText.includes('list')) {
      return 'factual';
    }

    return 'general';
  }

  private isComplexQuery(inputText: string): boolean {
    // Consider query complex if it has multiple questions or is long
    const questionMarks = (inputText.match(/\?/g) || []).length;
    const words = inputText.split(/\s+/).length;
    
    return questionMarks > 1 || words > 20 || 
           inputText.includes('comprehensive') ||
           inputText.includes('detailed') ||
           inputText.includes('thorough');
  }

  private extractTextFromRequest(request: any): string {
    if (!request.contents || !Array.isArray(request.contents)) {
      return '';
    }

    return request.contents
      .flatMap((content: any) => content.parts || [])
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join(' ');
  }

  /**
   * Get thinking mode statistics
   */
  getStats(): {
    supportedModels: string[];
    enabledByDefault: boolean;
  } {
    return {
      supportedModels: [...this.THINKING_ENABLED_MODELS],
      enabledByDefault: true
    };
  }
}

export const thinkingModeService = new ThinkingModeService(); 