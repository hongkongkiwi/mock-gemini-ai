import { Request, Response, NextFunction } from 'express';

export interface GoogleCloudError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any[];
  };
}

// Google Cloud error status codes mapping
const statusCodeToGoogleStatus = (code: number): string => {
  switch (code) {
    case 400: return 'INVALID_ARGUMENT';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'PERMISSION_DENIED';
    case 404: return 'NOT_FOUND';
    case 409: return 'ALREADY_EXISTS';
    case 429: return 'RESOURCE_EXHAUSTED';
    case 499: return 'CANCELLED';
    case 500: return 'INTERNAL';
    case 501: return 'NOT_IMPLEMENTED';
    case 503: return 'UNAVAILABLE';
    case 504: return 'DEADLINE_EXCEEDED';
    default: return 'UNKNOWN';
  }
};

export const createGoogleCloudError = (
  code: number,
  message: string,
  details?: any[]
): GoogleCloudError => {
  return {
    error: {
      code,
      message,
      status: statusCodeToGoogleStatus(code),
      ...(details && { details })
    }
  };
};

// Middleware to catch and format errors in Google Cloud style
export const googleCloudErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Google Cloud error:', err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  const errorResponse = createGoogleCloudError(status, message, err.details);
  
  res.status(status).json(errorResponse);
};

// Middleware to add Google Cloud response headers
export const addGoogleCloudHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add common Google Cloud headers
  res.setHeader('Server', 'Google Frontend');
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Vary', 'X-Origin');
  res.setHeader('Vary', 'Referer');
  
  // Add cache control for API responses
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=0');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  
  next();
}; 