import { 
  Part, 
  GroundingMetadata,
  EnhancedTool
} from '../types/vertex-ai';

import { groundingService } from './grounding';
import { codeExecutionService } from './code-execution';

/**
 * Advanced Features Service for coordinating Gemini 2.0+ capabilities
 * This service orchestrates various advanced features like grounding and code execution
 */
export class AdvancedFeaturesService {

  /**
   * Process enhanced tools in a request
   */
  async processEnhancedTools(tools: EnhancedTool[], requestContent: string): Promise<{
    toolResults: any[];
    groundingMetadata?: GroundingMetadata;
    additionalContent?: string;
  }> {
    const toolResults: any[] = [];
    let groundingMetadata: GroundingMetadata | undefined;
    let additionalContent = '';

    for (const tool of tools) {
      if (groundingService.isGoogleSearchTool(tool)) {
        // Extract search query from request content
        const searchQuery = groundingService.extractSearchQuery(requestContent);
        if (searchQuery) {
          const searchResult = await groundingService.handleGoogleSearchGrounding(
            searchQuery, 
            (tool as any).googleSearchRetrieval?.disableAttribution || false
          );
          groundingMetadata = searchResult.groundingMetadata;
          additionalContent += searchResult.enhancedContent;
        }
      } else if (codeExecutionService.isCodeExecutionTool(tool)) {
        // Code execution will be handled when the model generates executable code
        toolResults.push({
          toolName: 'code_execution',
          status: 'available',
          language: 'PYTHON'
        });
      }
    }

    return {
      toolResults,
      groundingMetadata,
      additionalContent
    };
  }

  /**
   * Process code execution parts in model response
   */
  async processCodeExecutionParts(parts: Part[]): Promise<Part[]> {
    return await codeExecutionService.processCodeExecutionParts(parts);
  }
}

export const advancedFeaturesService = new AdvancedFeaturesService(); 