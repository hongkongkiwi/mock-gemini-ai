import { Content } from '../types/vertex-ai';

/**
 * System Instructions Service for managing consistent model behavior
 */
export class SystemInstructionsService {
  private defaultSystemInstruction: Content | null = null;
  private modelSpecificInstructions: Map<string, Content> = new Map();

  /**
   * Set default system instruction for all models
   */
  setDefaultSystemInstruction(instruction: Content): void {
    this.defaultSystemInstruction = instruction;
  }

  /**
   * Set system instruction for a specific model
   */
  setModelSystemInstruction(modelName: string, instruction: Content): void {
    this.modelSpecificInstructions.set(modelName, instruction);
  }

  /**
   * Get effective system instruction for a model
   */
  getSystemInstruction(modelName?: string): Content | null {
    if (modelName && this.modelSpecificInstructions.has(modelName)) {
      return this.modelSpecificInstructions.get(modelName)!;
    }
    return this.defaultSystemInstruction;
  }

  /**
   * Apply system instruction to content array
   */
  applySystemInstruction(
    contents: Content[], 
    systemInstruction?: Content, 
    modelName?: string
  ): Content[] {
    const effectiveInstruction = systemInstruction || this.getSystemInstruction(modelName);
    
    if (!effectiveInstruction) {
      return contents;
    }

    // Check if system instruction already exists in contents
    const hasSystemInstruction = contents.some(content => 
      content.role === 'system' || content.role === 'user' && 
      content.parts.some(part => 'text' in part && part.text?.toLowerCase().includes('system'))
    );

    if (hasSystemInstruction) {
      return contents;
    }

    // Prepend system instruction
    return [effectiveInstruction, ...contents];
  }

  /**
   * Create system instruction from text
   */
  createSystemInstruction(text: string): Content {
    return {
      parts: [{ text }],
      role: 'system'
    };
  }

  /**
   * Enhance response based on system instructions
   */
  enhanceResponseWithSystemBehavior(
    originalResponse: string,
    systemInstruction?: Content,
    modelName?: string
  ): string {
    const effectiveInstruction = systemInstruction || this.getSystemInstruction(modelName);
    
    if (!effectiveInstruction) {
      return originalResponse;
    }

    const instructionText = effectiveInstruction.parts
      .filter(part => 'text' in part)
      .map(part => (part as any).text)
      .join(' ')
      .toLowerCase();

    // Apply behavioral modifications based on system instruction
    let enhancedResponse = originalResponse;

    // Example: Make response more formal if system instruction requests it
    if (instructionText.includes('formal') || instructionText.includes('professional')) {
      enhancedResponse = this.makeFormal(enhancedResponse);
    }

    // Example: Make response more concise if requested
    if (instructionText.includes('concise') || instructionText.includes('brief')) {
      enhancedResponse = this.makeConcise(enhancedResponse);
    }

    // Example: Add technical details if requested
    if (instructionText.includes('technical') || instructionText.includes('detailed')) {
      enhancedResponse = this.addTechnicalDetails(enhancedResponse);
    }

    // Example: Make response more helpful if requested
    if (instructionText.includes('helpful') || instructionText.includes('assist')) {
      enhancedResponse = this.makeMoreHelpful(enhancedResponse);
    }

    return enhancedResponse;
  }

  /**
   * Initialize with common system instructions
   */
  initializeDefaultInstructions(): void {
    // Set a general helpful assistant system instruction
    const defaultInstruction = this.createSystemInstruction(
      'You are a helpful, harmless, and honest AI assistant. ' +
      'Provide accurate and useful information while being respectful and professional. ' +
      'If you don\'t know something, admit it rather than guessing. ' +
      'Focus on being genuinely helpful to the user.'
    );
    
    this.setDefaultSystemInstruction(defaultInstruction);

    // Set model-specific instructions
    this.setModelSystemInstruction('gemini-2.0-flash', this.createSystemInstruction(
      'You are Gemini 2.0 Flash, a fast and efficient AI assistant. ' +
      'Provide quick, accurate responses while maintaining high quality. ' +
      'Use your multimodal capabilities when appropriate and mention when you can help with images, audio, or code execution.'
    ));

    this.setModelSystemInstruction('gemini-1.5-pro', this.createSystemInstruction(
      'You are Gemini 1.5 Pro, a powerful AI assistant with advanced reasoning capabilities. ' +
      'Provide thorough, well-reasoned responses with detailed explanations when helpful. ' +
      'Use your large context window effectively for complex tasks.'
    ));
  }

  // Private helper methods for response enhancement

  private makeFormal(text: string): string {
    return text
      .replace(/\bi'm\b/gi, 'I am')
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\bdon't\b/gi, 'do not')
      .replace(/\bisn't\b/gi, 'is not')
      .replace(/\baren't\b/gi, 'are not')
      .replace(/\bwasn't\b/gi, 'was not')
      .replace(/\bweren't\b/gi, 'were not')
      .replace(/\bhasn't\b/gi, 'has not')
      .replace(/\bhaven't\b/gi, 'have not')
      .replace(/\bhadn't\b/gi, 'had not')
      .replace(/\bshouldn't\b/gi, 'should not')
      .replace(/\bwouldn't\b/gi, 'would not')
      .replace(/\bcouldn't\b/gi, 'could not');
  }

  private makeConcise(text: string): string {
    // Simple conciseness improvements
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length <= 2) return text;
    
    return sentences.slice(0, Math.ceil(sentences.length * 0.7)).join('. ') + '.';
  }

  private addTechnicalDetails(text: string): string {
    // Add a note about technical capabilities
    if (!text.includes('technical') && !text.includes('implementation')) {
      return text + '\n\nNote: I can provide technical implementation details, code examples, or architectural guidance if needed.';
    }
    return text;
  }

  private makeMoreHelpful(text: string): string {
    // Add helpful follow-up suggestions
    if (!text.includes('help') && !text.includes('assist')) {
      return text + '\n\nIs there anything specific about this topic you\'d like me to elaborate on or help you with?';
    }
    return text;
  }

  /**
   * Clear all system instructions
   */
  clearSystemInstructions(): void {
    this.defaultSystemInstruction = null;
    this.modelSpecificInstructions.clear();
  }

  /**
   * Get statistics about configured system instructions
   */
  getStats(): {
    hasDefault: boolean;
    modelCount: number;
    models: string[];
  } {
    return {
      hasDefault: this.defaultSystemInstruction !== null,
      modelCount: this.modelSpecificInstructions.size,
      models: Array.from(this.modelSpecificInstructions.keys())
    };
  }
}

export const systemInstructionsService = new SystemInstructionsService();

// Initialize with default instructions
systemInstructionsService.initializeDefaultInstructions(); 