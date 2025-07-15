import { 
  Part, 
  CodeExecutionTool,
  CodeExecutionPart,
  CodeExecutionResult
} from '../types/vertex-ai';

/**
 * Service for handling Python code execution simulation
 */
export class CodeExecutionService {
  private codeExecutionResults: Map<string, any> = new Map();

  /**
   * Handle Python code execution
   */
  async handleCodeExecution(code: string): Promise<CodeExecutionResult> {
    try {
      // Simulate Python code execution
      const result = await this.simulatePythonExecution(code);
      
      return {
        outcome: 'OUTCOME_OK',
        output: result
      };
    } catch (error) {
      return {
        outcome: 'OUTCOME_FAILED',
        output: `Error: ${error instanceof Error ? error.message : 'Unknown execution error'}`
      };
    }
  }

  /**
   * Process code execution parts in model response
   */
  async processCodeExecutionParts(parts: Part[]): Promise<Part[]> {
    const processedParts: Part[] = [];

    for (const part of parts) {
      if (this.isCodeExecutionPart(part)) {
        const executableCode = part.executableCode;
        if (executableCode) {
          const executionResult = await this.handleCodeExecution(executableCode.code);
          
          // Add the original code part
          processedParts.push(part);
          
          // Add the execution result part
          processedParts.push({
            codeExecutionResult: executionResult
          } as any);
        }
      } else {
        processedParts.push(part);
      }
    }

    return processedParts;
  }

  /**
   * Check if a tool is a code execution tool
   */
  isCodeExecutionTool(tool: any): tool is CodeExecutionTool {
    return tool && typeof tool === 'object' && 'codeExecution' in tool;
  }

  /**
   * Check if a part contains executable code
   */
  isCodeExecutionPart(part: any): part is CodeExecutionPart {
    return part && typeof part === 'object' && 'executableCode' in part;
  }

  // Private helper methods

  private async simulatePythonExecution(code: string): Promise<string> {
    // Simulate Python code execution with realistic outputs
    
    // Handle common Python patterns
    if (code.includes('print(')) {
      const printMatches = code.match(/print\(([^)]+)\)/g);
      if (printMatches) {
        return printMatches.map(match => {
          const content = match.slice(6, -1); // Remove 'print(' and ')'
          try {
            // Simple evaluation for basic expressions
            if (content.includes('"') || content.includes("'")) {
              return content.replace(/['"]/g, '');
            } else if (/^\d+(\.\d+)?$/.test(content.trim())) {
              return content.trim();
            } else if (content.includes('+') || content.includes('-') || content.includes('*') || content.includes('/')) {
              // Simple math evaluation (basic safety)
              const sanitized = content.replace(/[^0-9+\-*/.() ]/g, '');
              try {
                return String(eval(sanitized));
              } catch {
                return content;
              }
            }
            return content;
          } catch {
            return content;
          }
        }).join('\n');
      }
    }

    if (code.includes('import')) {
      return 'Modules imported successfully.';
    }

    if (code.includes('def ') || code.includes('class ')) {
      return 'Function/class defined successfully.';
    }

    if (code.includes('=') && !code.includes('==')) {
      return 'Variable assignment completed.';
    }

    if (code.includes('for ') || code.includes('while ')) {
      return 'Loop executed successfully.';
    }

    // Default response for other code
    return 'Code executed successfully.';
  }
}

export const codeExecutionService = new CodeExecutionService(); 