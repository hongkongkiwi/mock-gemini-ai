import { Router, Request, Response } from 'express';
import { availableModels } from '../data/preset-responses';

const router: Router = Router();

// Get publisher model - /v1/publishers/google/models/{model}
router.get('/google/models/:model', (req: Request, res: Response): void => {
  try {
    const { model } = req.params;
    
    // Find model by short name or full name
    const modelInfo = availableModels.find(m => 
      m.name.includes(model) || 
      m.displayName.toLowerCase().includes(model.toLowerCase())
    );
    
    if (!modelInfo) {
      res.status(404).json({
        error: {
          code: 404,
          message: `Model publishers/google/models/${model} not found.`,
          status: 'NOT_FOUND'
        }
      });
      return;
    }
    
    // Return model in publisher format
    res.json({
      name: `publishers/google/models/${model}`,
      displayName: modelInfo.displayName,
      description: modelInfo.description,
      versionId: modelInfo.version,
      supportedActions: modelInfo.supportedGenerationMethods,
      inputTokenLimit: modelInfo.inputTokenLimit,
      outputTokenLimit: modelInfo.outputTokenLimit,
      publisher: {
        name: 'google',
        displayName: 'Google'
      }
    });
  } catch (error) {
    console.error('Error getting publisher model:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL'
      }
    });
  }
});

// List publisher models - /v1/publishers/google/models
router.get('/google/models', (req: Request, res: Response): void => {
  try {
    const models = availableModels.map(model => ({
      name: `publishers/google/models/${model.name.split('/').pop()}`,
      displayName: model.displayName,
      description: model.description,
      versionId: model.version,
      supportedActions: model.supportedGenerationMethods,
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit,
      publisher: {
        name: 'google',
        displayName: 'Google'
      }
    }));
    
    res.json({ models });
  } catch (error) {
    console.error('Error listing publisher models:', error);
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