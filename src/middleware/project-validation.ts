import { Request, Response, NextFunction } from 'express';
import { mockConfig } from '../config/mock-config';

export interface ProjectValidationRequest extends Request {
  validatedProject?: {
    projectId: string;
    location: string;
  };
}

/**
 * Middleware to validate project and location parameters
 * Only enforces validation if configured in the environment
 */
export const validateProjectAndLocation = (req: ProjectValidationRequest, res: Response, next: NextFunction): void => {
  const { projectId, location } = req.params;
  
  // Validate project ID if enforcement is enabled
  if (mockConfig.googleCloud.enforceProjectId) {
    if (!projectId) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Project ID is required.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    if (projectId !== mockConfig.googleCloud.enforceProjectId) {
      res.status(403).json({
        error: {
          code: 403,
          message: `Access denied. Expected project ID: ${mockConfig.googleCloud.enforceProjectId}`,
          status: 'PERMISSION_DENIED'
        }
      });
      return;
    }
  }
  
  // Validate location if enforcement is enabled
  if (mockConfig.googleCloud.enforceLocation) {
    if (!location) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Location is required.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    if (location !== mockConfig.googleCloud.enforceLocation) {
      res.status(403).json({
        error: {
          code: 403,
          message: `Access denied. Expected location: ${mockConfig.googleCloud.enforceLocation}`,
          status: 'PERMISSION_DENIED'
        }
      });
      return;
    }
  }
  
  // Store validated parameters for use in route handlers
  req.validatedProject = {
    projectId: projectId || mockConfig.googleCloud.defaultProjectId,
    location: location || mockConfig.googleCloud.defaultLocation
  };
  
  next();
};

/**
 * Middleware specifically for file routes that have different parameter names
 */
export const validateProjectAndLocationForFiles = (req: ProjectValidationRequest, res: Response, next: NextFunction): void => {
  const { project, location } = req.params;
  
  // Validate project ID if enforcement is enabled
  if (mockConfig.googleCloud.enforceProjectId) {
    if (!project) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Project ID is required.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    if (project !== mockConfig.googleCloud.enforceProjectId) {
      res.status(403).json({
        error: {
          code: 403,
          message: `Access denied. Expected project ID: ${mockConfig.googleCloud.enforceProjectId}`,
          status: 'PERMISSION_DENIED'
        }
      });
      return;
    }
  }
  
  // Validate location if enforcement is enabled
  if (mockConfig.googleCloud.enforceLocation) {
    if (!location) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Location is required.',
          status: 'INVALID_ARGUMENT'
        }
      });
      return;
    }
    
    if (location !== mockConfig.googleCloud.enforceLocation) {
      res.status(403).json({
        error: {
          code: 403,
          message: `Access denied. Expected location: ${mockConfig.googleCloud.enforceLocation}`,
          status: 'PERMISSION_DENIED'
        }
      });
      return;
    }
  }
  
  // Store validated parameters for use in route handlers
  req.validatedProject = {
    projectId: project || mockConfig.googleCloud.defaultProjectId,
    location: location || mockConfig.googleCloud.defaultLocation
  };
  
  next();
}; 