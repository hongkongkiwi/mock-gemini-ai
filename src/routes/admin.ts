import { Router, Request, Response } from 'express';
import { MockGeminiService, createMockGeminiService } from '../services/mock-service';
import { PresetResponse } from '../data/preset-responses';

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
function getServiceInstance(req: Request): MockGeminiService {
  // Check if request has a custom service instance
  if (req.customMockService) {
    return req.customMockService;
  }
  
  // Use default service instance
  return defaultMockService;
}

// Get all preset responses
router.get('/presets', (req: Request, res: Response): void => {
  try {
    const mockService = getServiceInstance(req);
    const presets = mockService.getPresetResponses();
    res.json({ presets });
  } catch (error) {
    console.error('Error getting presets:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get specific preset response
router.get('/presets/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const mockService = getServiceInstance(req);
    const presets = mockService.getPresetResponses();
    const preset = presets.find(p => p.id === id);
    
    if (!preset) {
      res.status(404).json({
        error: 'Preset not found'
      });
      return;
    }
    
    res.json(preset);
  } catch (error) {
    console.error('Error getting preset:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create new preset response
router.post('/presets', (req: Request, res: Response): void => {
  try {
    const preset: PresetResponse = req.body;
    
    // Validate required fields
    if (!preset.id || !preset.name || !preset.trigger || !preset.response) {
      res.status(400).json({
        error: 'Missing required fields: id, name, trigger, response'
      });
      return;
    }
    
    // Check if preset with same ID already exists
    const mockService = getServiceInstance(req);
    const existingPresets = mockService.getPresetResponses();
    if (existingPresets.some(p => p.id === preset.id)) {
      res.status(409).json({
        error: 'Preset with this ID already exists'
      });
      return;
    }
    
    mockService.addPresetResponse(preset);
    res.status(201).json({
      message: 'Preset created successfully',
      preset
    });
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update preset response
router.put('/presets/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const mockService = getServiceInstance(req);
    const success = mockService.updatePresetResponse(id, updates);
    
    if (!success) {
      res.status(404).json({
        error: 'Preset not found'
      });
      return;
    }
    
    res.json({
      message: 'Preset updated successfully'
    });
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Delete preset response
router.delete('/presets/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    
    const mockService = getServiceInstance(req);
    const success = mockService.removePresetResponse(id);
    
    if (!success) {
      res.status(404).json({
        error: 'Preset not found'
      });
      return;
    }
    
    res.json({
      message: 'Preset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mock-gemini-api'
  });
});

// API documentation endpoint
router.get('/docs', (req: Request, res: Response): void => {
  res.json({
    name: 'Mock Gemini API',
    version: '1.0.0',
    description: 'Mock Google Vertex AI Gemini API for testing',
    endpoints: {
      vertexAI: {
        generateContent: 'POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent',
        streamGenerateContent: 'POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:streamGenerateContent',
        countTokens: 'POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:countTokens',
        embedContent: 'POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:embedContent',
        batchEmbedContents: 'POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:batchEmbedContents',
        getModels: 'GET /v1/projects/{project}/locations/{location}/publishers/google/models',
        getModel: 'GET /v1/projects/{project}/locations/{location}/publishers/google/models/{model}'
      },
      admin: {
        getPresets: 'GET /admin/presets',
        getPreset: 'GET /admin/presets/{id}',
        createPreset: 'POST /admin/presets',
        updatePreset: 'PUT /admin/presets/{id}',
        deletePreset: 'DELETE /admin/presets/{id}',
        health: 'GET /admin/health',
        docs: 'GET /admin/docs'
      }
    },
    availableModels: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'text-embedding-004'
    ]
  });
});

export default router; 