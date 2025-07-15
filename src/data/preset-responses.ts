import { 
  GenerateContentResponse, 
  FinishReason, 
  HarmCategory, 
  HarmProbability,
  HarmSeverity,
  SafetyRating,
  createDefaultSafetyRatings
} from '../types/vertex-ai';
import { mockConfig } from '../config/mock-config';

export interface PresetResponse {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'text' | 'contains' | 'regex';
    value: string;
  };
  response: GenerateContentResponse;
  delay?: number;
}

// Function to generate model name with dynamic project and location
export function generateModelName(modelId: string, projectId?: string, location?: string): string {
  const project = projectId || mockConfig.googleCloud.defaultProjectId;
  const loc = location || mockConfig.googleCloud.defaultLocation;
  return `projects/${project}/locations/${loc}/publishers/google/models/${modelId}`;
}

// Function to get base model definitions (without project/location specifics)
export function getBaseModelDefinitions() {
  return [
    // Gemini 2.5 Pro Preview
    {
      id: 'gemini-2.5-pro-preview-0325',
      version: '0325',
      displayName: 'Gemini 2.5 Pro Preview',
      description: 'Enhanced thinking and reasoning, multimodal understanding, advanced coding, and more',
      inputTokenLimit: 2000000,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini 2.0 Flash
    {
      id: 'gemini-2.0-flash',
      version: '001',
      displayName: 'Gemini 2.0 Flash',
      description: 'Next generation features, speed, thinking, realtime streaming, and multimodal generation',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini 2.0 Flash-Lite
    {
      id: 'gemini-2.0-flash-lite',
      version: '001',
      displayName: 'Gemini 2.0 Flash-Lite',
      description: 'Cost efficiency and low latency',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini 1.5 Pro
    {
      id: 'gemini-1.5-pro',
      version: '001',
      displayName: 'Gemini 1.5 Pro',
      description: 'Complex reasoning tasks requiring more intelligence',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini 1.5 Flash
    {
      id: 'gemini-1.5-flash',
      version: '001',
      displayName: 'Gemini 1.5 Flash',
      description: 'Fast and versatile performance across a diverse variety of tasks',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini 1.5 Flash-8B
    {
      id: 'gemini-1.5-flash-8b',
      version: '001',
      displayName: 'Gemini 1.5 Flash-8B',
      description: 'High volume and lower intelligence tasks',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    },
    // Gemini Embedding
    {
      id: 'text-embedding-004',
      version: '004',
      displayName: 'Text Embedding 004',
      description: 'Advanced text embedding model',
      inputTokenLimit: 3072,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['embedContent'],
      temperature: 0.0,
      topP: 1.0,
      topK: 1
    },
    // Gemini Embedding Experimental
    {
      id: 'gemini-embedding-exp',
      version: '001',
      displayName: 'Gemini Embedding Experimental',
      description: 'Measuring the relatedness of text strings',
      inputTokenLimit: 3072,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['embedContent'],
      temperature: 0.0,
      topP: 1.0,
      topK: 1
    },
    // Multimodal Embedding Models
    {
      id: 'multimodalembedding@001',
      version: '001',
      displayName: 'Multimodal Embedding 001',
      description: 'Generate embeddings for text, image, video and audio content',
      inputTokenLimit: 2048,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['embedContent'],
      temperature: 0.0,
      topP: 1.0,
      topK: 1
    },
    {
      id: 'text-multilingual-embedding-002',
      version: '002',
      displayName: 'Text Multilingual Embedding 002',
      description: 'Multilingual text embedding with enhanced multimodal capabilities',
      inputTokenLimit: 2048,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['embedContent'],
      temperature: 0.0,
      topP: 1.0,
      topK: 1
    },
    // Imagen 3 - Image Generation
    {
      id: 'imagen-3.0-generate-002',
      version: '002',
      displayName: 'Imagen 3',
      description: 'Our most advanced image generation model',
      inputTokenLimit: 1024,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['generateContent'],
      temperature: 0.4,
      topP: 1.0,
      topK: 32
    },
    // Veo 2 - Video Generation
    {
      id: 'veo-2.0-generate-001',
      version: '001',
      displayName: 'Veo 2',
      description: 'Advanced video generation model',
      inputTokenLimit: 1024,
      outputTokenLimit: 1,
      supportedGenerationMethods: ['generateContent'],
      temperature: 0.4,
      topP: 1.0,
      topK: 32
    },
    // Gemini 2.0 Flash Live
    {
      id: 'gemini-2.0-flash-live-001',
      version: '001',
      displayName: 'Gemini 2.0 Flash Live',
      description: 'Real-time streaming and multimodal generation',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
      temperature: 1.0,
      topP: 0.95,
      topK: 40
    }
  ];
}

// Function to generate available models with dynamic project/location
export function getAvailableModels(projectId?: string, location?: string): any[] {
  const baseModels = getBaseModelDefinitions();
  
  return baseModels.map(model => ({
    ...model,
    name: generateModelName(model.id, projectId, location)
  }));
}

// Default export for backward compatibility
export const availableModels: any[] = getAvailableModels();

// Helper function to generate default safety ratings
const getDefaultSafetyRatings = () => [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    probability: HarmProbability.NEGLIGIBLE,
    blocked: false
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    probability: HarmProbability.NEGLIGIBLE,
    blocked: false
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    probability: HarmProbability.NEGLIGIBLE,
    blocked: false
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    probability: HarmProbability.NEGLIGIBLE,
    blocked: false
  }
];

export const defaultPresetResponses: PresetResponse[] = [
  {
    id: 'greeting',
    name: 'Greeting Response',
    description: 'Friendly greeting response',
    trigger: {
      type: 'contains',
      value: 'hello'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Hello! How can I help you today? I\'m here to assist you with any questions or tasks you might have.'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 25,
        totalTokenCount: 28
      }
    }
  },
  {
    id: 'grounding-search',
    name: 'Web Search Grounding',
    description: 'Response that triggers web search grounding',
    trigger: {
      type: 'contains',
      value: 'what is'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I can help you find current information about that topic. Let me search the web for the latest details.'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 20,
        totalTokenCount: 28
      }
    }
  },
  {
    id: 'code-execution',
    name: 'Code Execution Example',
    description: 'Response with executable Python code',
    trigger: {
      type: 'contains',
      value: 'python code'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Here\'s a Python code example that I can execute:'
              },
              {
                executableCode: {
                  language: 'PYTHON' as const,
                  code: 'print("Hello from Python!")\nresult = 2 + 2\nprint(f"2 + 2 = {result}")\n\n# Calculate fibonacci\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint(f"Fibonacci of 5: {fibonacci(5)}")'
                }
              } as any
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 30,
        totalTokenCount: 42
      }
    }
  },
  {
    id: 'coding-help',
    name: 'Coding Assistance',
    description: 'Helpful coding responses',
    trigger: {
      type: 'contains',
      value: 'code'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I\'d be happy to help you with coding! Here\'s a simple example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));\n```\n\nThis function takes a name parameter and returns a greeting message. Is there a specific programming language or concept you\'d like help with?'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 4,
        candidatesTokenCount: 65,
        totalTokenCount: 69
      }
    }
  },
  {
    id: 'image-analysis',
    name: 'Image Analysis',
    description: 'Responses for image analysis requests',
    trigger: {
      type: 'contains',
      value: 'image'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I can see you\'re asking about image analysis! I can help you understand and analyze images. I can describe what I see in images, identify objects, read text, analyze charts and graphs, and much more. Please share an image and tell me what you\'d like to know about it!'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 4,
        candidatesTokenCount: 52,
        totalTokenCount: 56
      }
    }
  },
  {
    id: 'recipe-json',
    name: 'Recipe JSON Response',
    description: 'Structured JSON response for recipe requests',
    trigger: {
      type: 'contains',
      value: 'recipe'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '[{"recipeName": "Chocolate Chip Cookies", "ingredients": ["2 cups flour", "1 cup butter", "1/2 cup sugar", "1/2 cup brown sugar", "2 eggs", "1 tsp vanilla", "1 tsp baking soda", "1/2 tsp salt", "2 cups chocolate chips"], "instructions": ["Preheat oven to 375°F", "Mix dry ingredients", "Cream butter and sugars", "Add eggs and vanilla", "Combine wet and dry ingredients", "Fold in chocolate chips", "Drop on baking sheet", "Bake 9-11 minutes"]}, {"recipeName": "Peanut Butter Cookies", "ingredients": ["1 cup peanut butter", "1/2 cup sugar", "1/2 cup brown sugar", "1 egg", "1 tsp vanilla", "1 cup flour", "1/2 tsp baking soda", "1/4 tsp salt"], "instructions": ["Preheat oven to 350°F", "Mix peanut butter and sugars", "Add egg and vanilla", "Mix in dry ingredients", "Roll into balls", "Place on baking sheet", "Press with fork", "Bake 10-12 minutes"]}]'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 185,
        totalTokenCount: 193
      }
    }
  },
  {
    id: 'sentiment-enum',
    name: 'Sentiment Classification',
    description: 'Enum response for sentiment analysis',
    trigger: {
      type: 'contains',
      value: 'sentiment'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'POSITIVE'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 1,
        totalTokenCount: 13
      }
    }
  },
  {
    id: 'character-generation',
    name: 'Character Generation',
    description: 'Structured character data for games',
    trigger: {
      type: 'contains',
      value: 'character'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '[{"name": "Aria Blackwood", "age": 28, "occupation": "Archer", "background": "A skilled ranger from the northern forests, Aria is known for her exceptional marksmanship and deep connection to nature. She left her homeland to seek adventure and help those in need.", "playable": true, "children": []}, {"name": "Marcus Steel", "age": 45, "occupation": "Blacksmith", "background": "A master craftsman who has dedicated his life to forging the finest weapons and armor. Marcus runs the local smithy and is respected throughout the village for his skill and wisdom.", "playable": false, "children": [{"name": "Elena Steel", "age": 16}, {"name": "Thomas Steel", "age": 14}]}]'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 142,
        totalTokenCount: 157
      }
    }
  },
  {
    id: 'data-extraction',
    name: 'Structured Data Extraction',
    description: 'Extract structured data from unstructured text',
    trigger: {
      type: 'contains',
      value: 'extract'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '[{"timestamp": "15:43:28", "error_code": 308, "error_message": "Could not process image upload: Unsupported file format."}, {"timestamp": "15:45:02", "error_code": 5522, "error_message": "Service dependency unavailable (payment gateway). Retrying..."}, {"timestamp": "15:45:33", "error_code": 9001, "error_message": "Application crashed due to out-of-memory exception."}]'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 25,
        candidatesTokenCount: 68,
        totalTokenCount: 93
      }
    }
  },
  {
    id: 'multimodal-analysis',
    name: 'Multimodal Analysis',
    description: 'Responses for multimodal content analysis',
    trigger: {
      type: 'contains',
      value: 'analyze'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I can analyze various types of content including text, images, audio, and video. For images, I can identify objects, read text, describe scenes, and analyze charts. For audio, I can transcribe speech and identify sounds. For video, I can describe actions and scenes. What would you like me to analyze?'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 59,
        totalTokenCount: 67
      }
    }
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Creative writing and storytelling',
    trigger: {
      type: 'contains',
      value: 'story'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I\'d love to help you with creative writing! Here\'s a short story beginning:\n\n**The Last Library**\n\nIn a world where books had been forgotten, Maya discovered a hidden room behind her grandmother\'s old bookshelf. Dust particles danced in the golden light streaming through a cracked window, illuminating rows upon rows of leather-bound volumes. As she reached for the nearest book, its pages rustled like whispered secrets, and she realized she might be holding the key to restoring knowledge to her world.\n\nWould you like me to continue this story, or would you prefer to explore a different creative writing topic?'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 6,
        candidatesTokenCount: 128,
        totalTokenCount: 134
      }
    }
  },
  {
    id: 'technical-explanation',
    name: 'Technical Explanation',
    description: 'Technical concepts and explanations',
    trigger: {
      type: 'contains',
      value: 'explain'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'I\'d be happy to explain technical concepts! I can break down complex topics into understandable explanations, provide examples, and walk through step-by-step processes. Whether you\'re interested in programming, science, mathematics, technology, or any other technical field, I can help make it clear and accessible. What would you like me to explain?'
              }
            ],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: getDefaultSafetyRatings()
        }
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 62,
        totalTokenCount: 70
      }
    }
  }
];

export const defaultTokenResponse: any = {
  totalTokens: 42
};

export const defaultEmbeddingResponse: any = {
  embedding: {
    values: Array.from({ length: 768 }, () => Math.random() * 2 - 1)
  }
};

export const defaultFallbackResponse: GenerateContentResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'I understand your request. This is a mock response from the Vertex AI Gemini API. In a real implementation, I would provide a more specific and helpful response based on your input.'
          }
        ],
        role: 'model'
      },
      finishReason: FinishReason.STOP,
      index: 0,
      safetyRatings: [
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          probability: HarmProbability.NEGLIGIBLE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          probability: HarmProbability.NEGLIGIBLE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          probability: HarmProbability.NEGLIGIBLE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          probability: HarmProbability.NEGLIGIBLE
        }
      ]
    }
  ],
  usageMetadata: {
    promptTokenCount: 25,
    candidatesTokenCount: 35,
    totalTokenCount: 60
  }
}; 