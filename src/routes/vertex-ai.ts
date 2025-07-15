import { Router, Request, Response, NextFunction } from 'express';
import { MockGeminiService, TokenLimitError, createMockGeminiService } from '../services/mock-service';
import {
  GenerateContentRequest
} from '../types/vertex-ai';
import { validateProjectAndLocation, ProjectValidationRequest } from '../middleware/project-validation';

// Extend the Request interface to include custom service instance
declare global {
  namespace Express {
    interface Request {
      customMockService?: MockGeminiService;
    }
  }
}

const router: Router = Router();

// Create default service instance - can be overridden by passing custom config
const defaultMockService = createMockGeminiService();

// Function to get or create a service instance
// This allows for multiple service instances with different configurations
function getServiceInstance(req: Request): MockGeminiService {
  // Check if request has a custom service instance
  if (req.customMockService) {
    return req.customMockService;
  }
  
  // Use default service instance
  return defaultMockService;
}

// Middleware to simulate authentication
const authenticateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 401,
        message: 'Request is missing required authentication credential.',
        status: 'UNAUTHENTICATED'
      }
    });
    return;
  }
  
  // In a real implementation, you would validate the token here
  next();
};

// Apply authentication middleware to all routes
router.use(authenticateRequest);

// Apply project and location validation middleware to all routes
router.use(validateProjectAndLocation);

// Generate Content
router.post('/projects/:projectId/locations/:location/publishers/google/models/:model:generateContent', async (req: ProjectValidationRequest, res: Response): Promise<void> => {
  try {
    const request: GenerateContentRequest = req.body;
    const modelName = req.params.model;
    const { projectId, location } = req.validatedProject!;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Request must contain contents array.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const mockService = getServiceInstance(req);
    const response = await mockService.generateContent(request, modelName, projectId, location);
    res.json(response);
  } catch (error) {
    if (error instanceof TokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    console.error('Error generating content:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// Stream Generate Content
router.post('/projects/:projectId/locations/:location/publishers/google/models/:model:streamGenerateContent', async (req: ProjectValidationRequest, res: Response): Promise<void> => {
  try {
    const request: GenerateContentRequest = req.body;
    const modelName = req.params.model;
    const { projectId, location } = req.validatedProject!;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Request must contain contents array.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const mockService = getServiceInstance(req);
    const stream = mockService.streamGenerateContent(request, modelName, projectId, location);
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    
    res.end();
  } catch (error) {
    if (error instanceof TokenLimitError) {
      if (!res.headersSent) {
        res.status(error.code).json({
          error: {
            code: error.code,
            message: error.message,
            status: 'INVALID_ARGUMENT'
          }
        });
      }
      return;
    }
    
    console.error('Error streaming content:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
});

// Count Tokens
router.post('/projects/:projectId/locations/:location/publishers/google/models/:model:countTokens', async (req: ProjectValidationRequest, res: Response): Promise<void> => {
  try {
    const request: any = req.body;
    const modelName = req.params.model;
    const { projectId, location } = req.validatedProject!;
    
    if (!request.contents || !Array.isArray(request.contents)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Request must contain contents array.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const mockService = getServiceInstance(req);
    const response = await mockService.countTokens(request, modelName, projectId, location);
    res.json(response);
  } catch (error) {
    if (error instanceof TokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    console.error('Error counting tokens:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// Embed Content
router.post('/projects/:projectId/locations/:location/publishers/google/models/:model:embedContent', async (req: ProjectValidationRequest, res: Response): Promise<void> => {
  try {
    const request: any = req.body;
    const modelName = req.params.model;
    const { projectId, location } = req.validatedProject!;
    
    if (!request.content) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Request must contain content.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const mockService = getServiceInstance(req);
    const response = await mockService.embedContent(request, modelName, projectId, location);
    res.json(response);
  } catch (error) {
    if (error instanceof TokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    console.error('Error embedding content:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// Batch Embed Contents
router.post('/projects/:projectId/locations/:location/publishers/google/models/:model:batchEmbedContents', async (req: ProjectValidationRequest, res: Response): Promise<void> => {
  try {
    const request: any = req.body;
    const modelName = req.params.model;
    const { projectId, location } = req.validatedProject!;
    
    if (!request.requests || !Array.isArray(request.requests)) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Request must contain requests array.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }

    const mockService = getServiceInstance(req);
    const response = await mockService.batchEmbedContents(request, modelName, projectId, location);
    res.json(response);
  } catch (error) {
    if (error instanceof TokenLimitError) {
      res.status(error.code).json({
        error: {
          code: error.code,
          message: error.message,
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    console.error('Error batch embedding contents:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// Get Models
router.get('/projects/:projectId/locations/:location/publishers/google/models', (req: ProjectValidationRequest, res: Response): void => {
  try {
    const { projectId, location } = req.validatedProject!;
    const mockService = getServiceInstance(req);
    const models = mockService.getModels(projectId, location);
    res.json({ models });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// Get Specific Model
router.get('/projects/:projectId/locations/:location/publishers/google/models/:model', (req: ProjectValidationRequest, res: Response): void => {
  try {
    const { model } = req.params;
    const { projectId, location } = req.validatedProject!;
    const mockService = getServiceInstance(req);
    const modelInfo = mockService.getModel(model, projectId, location);
    
    if (!modelInfo) {
      res.status(404).json({
        error: {
          code: 404,
          message: `Model ${model} not found.`,
          status: 'NOT_FOUND'
        }
      });
      return;
    }

    res.json(modelInfo);
  } catch (error) {
    console.error('Error getting model:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

export default router; 