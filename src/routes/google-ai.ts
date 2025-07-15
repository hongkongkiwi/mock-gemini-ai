import { Router, Request, Response, NextFunction } from 'express';
import { GoogleAIService, GoogleAITokenLimitError } from '../services/google-ai-service';
import { createGoogleCloudError } from '../middleware/google-cloud-errors';
import {
  GoogleAIGenerateContentRequest,
  GoogleAICountTokensRequest,
  GoogleAIEmbedContentRequest,
  GoogleAIBatchEmbedContentsRequest
} from '../types/google-ai';

// Extend the Request interface to include custom service instance
declare global {
  namespace Express {
    interface Request {
      customGoogleAIService?: GoogleAIService;
    }
  }
}

const router: Router = Router();

// Create default service instance
function getServiceInstance(req: Request): GoogleAIService {
  if (req.customGoogleAIService) {
    return req.customGoogleAIService;
  }
  throw new Error('Google AI service not configured');
}

// Middleware to simulate Google AI API key authentication
const authenticateGoogleAI = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-goog-api-key'] || req.query.key;
  
  if (!apiKey) {
    res.status(401).json({
      error: {
        code: 401,
        message: 'API key not provided. Please provide a valid API key.',
        status: 'UNAUTHENTICATED'
      }
    });
    return;
  }
  
  // In a real implementation, you would validate the API key here
  next();
};

// Apply authentication middleware to all routes
router.use(authenticateGoogleAI);

// Generate content - POST /v1beta/models/{model}:generateContent
router.post('/v1beta/models/:model\\:generateContent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const request: GoogleAIGenerateContentRequest = req.body;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request: contents field is required and must be an array',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const googleAIService = getServiceInstance(req);
    const response = await googleAIService.generateContent(request, model);
    res.json(response);
  } catch (error) {
    console.error('Error in generateContent:', error);
    
    if (error instanceof GoogleAITokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// Stream generate content - POST /v1beta/models/{model}:streamGenerateContent
router.post('/v1beta/models/:model\\:streamGenerateContent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const request: GoogleAIGenerateContentRequest = req.body;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request: contents field is required and must be an array',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const googleAIService = getServiceInstance(req);
    const stream = googleAIService.streamGenerateContent(request, model);
    
    for await (const chunk of stream) {
      res.write(JSON.stringify(chunk) + '\n');
    }
    
    res.end();
  } catch (error) {
    console.error('Error in streamGenerateContent:', error);
    
    if (error instanceof GoogleAITokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// Count tokens - POST /v1beta/models/{model}:countTokens
router.post('/v1beta/models/:model\\:countTokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const request: GoogleAICountTokensRequest = req.body;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request: contents field is required and must be an array',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const googleAIService = getServiceInstance(req);
    const response = await googleAIService.countTokens(request, model);
    res.json(response);
  } catch (error) {
    console.error('Error in countTokens:', error);
    
    if (error instanceof GoogleAITokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// Embed content - POST /v1beta/models/{model}:embedContent
router.post('/v1beta/models/:model\\:embedContent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const request: GoogleAIEmbedContentRequest = req.body;
    
    if (!request.content) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request: content field is required',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const googleAIService = getServiceInstance(req);
    const response = await googleAIService.embedContent(request, model);
    res.json(response);
  } catch (error) {
    console.error('Error in embedContent:', error);
    
    if (error instanceof GoogleAITokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// Batch embed contents - POST /v1beta/models/{model}:batchEmbedContents
router.post('/v1beta/models/:model\\:batchEmbedContents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const request: GoogleAIBatchEmbedContentsRequest = req.body;
    
    if (!request.requests || !Array.isArray(request.requests)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request: requests field is required and must be an array',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const googleAIService = getServiceInstance(req);
    const response = await googleAIService.batchEmbedContents(request, model);
    res.json(response);
  } catch (error) {
    console.error('Error in batchEmbedContents:', error);
    
    if (error instanceof GoogleAITokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// List models - GET /v1beta/models
router.get('/v1beta/models', async (req: Request, res: Response): Promise<void> => {
  try {
    const googleAIService = getServiceInstance(req);
    const models = googleAIService.getModels();
    
    res.json({
      models: models.map(model => ({
        name: `models/${model.name}`,
        version: model.version,
        displayName: model.displayName,
        description: model.description,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        supportedGenerationMethods: model.supportedGenerationMethods,
        temperature: model.temperature,
        topP: model.topP,
        topK: model.topK
      }))
    });
  } catch (error) {
    console.error('Error in listModels:', error);
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

// Get model - GET /v1beta/models/{model}
router.get('/v1beta/models/:model', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model } = req.params;
    const googleAIService = getServiceInstance(req);
    const modelInfo = googleAIService.getModel(model);
    
    if (!modelInfo) {
      res.status(404).json({
        error: {
          code: 404,
          message: `Model ${model} not found`,
          status: 'NOT_FOUND'
        }
      });
      return;
    }
    
    res.json({
      name: `models/${modelInfo.name}`,
      version: modelInfo.version,
      displayName: modelInfo.displayName,
      description: modelInfo.description,
      inputTokenLimit: modelInfo.inputTokenLimit,
      outputTokenLimit: modelInfo.outputTokenLimit,
      supportedGenerationMethods: modelInfo.supportedGenerationMethods,
      temperature: modelInfo.temperature,
      topP: modelInfo.topP,
      topK: modelInfo.topK
    });
  } catch (error) {
    console.error('Error in getModel:', error);
    
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error',
        status: 'INTERNAL'
      }
    });
  }
});

export default router; 