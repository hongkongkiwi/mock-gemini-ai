import { Router, Request, Response } from 'express';
import { contextCachingService } from '../services/context-caching';
import { validateProjectAndLocation, ProjectValidationRequest } from '../middleware/project-validation';
import {
  CachedContentRequest,
  UpdateCachedContentRequest
} from '../types/vertex-ai';

const router: Router = Router();

/**
 * Create cached content
 * POST /projects/{project}/locations/{location}/cachedContents
 */
router.post('/projects/:projectId/locations/:location/cachedContents', 
  validateProjectAndLocation, 
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const request: CachedContentRequest = req.body;
      const { projectId, location } = req.validatedProject!;

      if (!request.model) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Model field is required for cached content.',
            status: 'INVALID_ARGUMENT'
          }
        });
        return;
      }

      const cachedContent = await contextCachingService.createCachedContent(
        request, 
        projectId, 
        location
      );

      res.status(201).json(cachedContent);
    } catch (error) {
      console.error('Error creating cached content:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
);

/**
 * Get cached content
 * GET /projects/{project}/locations/{location}/cachedContents/{cachedContent}
 */
router.get('/projects/:projectId/locations/:location/cachedContents/:cachedContentId',
  validateProjectAndLocation,
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const { cachedContentId } = req.params;
      const cachedContent = await contextCachingService.getCachedContent(cachedContentId);

      if (!cachedContent) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Cached content ${cachedContentId} not found or expired.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      // Convert internal format to API response format
      const response = {
        name: cachedContent.name,
        model: cachedContent.model,
        displayName: cachedContent.displayName,
        usageMetadata: cachedContent.usageMetadata,
        createTime: cachedContent.createTime,
        updateTime: cachedContent.updateTime,
        expireTime: cachedContent.expireTime
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting cached content:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
);

/**
 * Update cached content
 * PATCH /projects/{project}/locations/{location}/cachedContents/{cachedContent}
 */
router.patch('/projects/:projectId/locations/:location/cachedContents/:cachedContentId',
  validateProjectAndLocation,
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const { cachedContentId } = req.params;
      const request: UpdateCachedContentRequest = req.body;

      const updatedContent = await contextCachingService.updateCachedContent(
        cachedContentId, 
        request
      );

      if (!updatedContent) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Cached content ${cachedContentId} not found or expired.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json(updatedContent);
    } catch (error) {
      console.error('Error updating cached content:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
);

/**
 * Delete cached content
 * DELETE /projects/{project}/locations/{location}/cachedContents/{cachedContent}
 */
router.delete('/projects/:projectId/locations/:location/cachedContents/:cachedContentId',
  validateProjectAndLocation,
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const { cachedContentId } = req.params;
      const deleted = await contextCachingService.deleteCachedContent(cachedContentId);

      if (!deleted) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Cached content ${cachedContentId} not found.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting cached content:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
);

/**
 * List cached content
 * GET /projects/{project}/locations/{location}/cachedContents
 */
router.get('/projects/:projectId/locations/:location/cachedContents',
  validateProjectAndLocation,
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const { projectId, location } = req.validatedProject!;
      const cachedContents = await contextCachingService.listCachedContent(projectId, location);

      res.json({
        cachedContents,
        nextPageToken: null // Simple implementation without pagination
      });
    } catch (error) {
      console.error('Error listing cached content:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL'
        }
      });
    }
  }
);

export default router; 