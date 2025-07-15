import { Router, Request, Response } from 'express';
import { createBatchProcessingService } from '../services/batch-processing';
import { createMockGeminiService } from '../services/mock-service';
import { validateProjectAndLocation, ProjectValidationRequest } from '../middleware/project-validation';

const router: Router = Router();

// Initialize batch processing service
const mockService = createMockGeminiService();
const batchService = createBatchProcessingService(mockService);

/**
 * Submit a batch job
 * POST /projects/{project}/locations/{location}/batch
 */
router.post('/projects/:projectId/locations/:location/batch',
  validateProjectAndLocation,
  async (req: ProjectValidationRequest, res: Response): Promise<void> => {
    try {
      const { requests } = req.body;
      const { projectId, location } = req.validatedProject!;

      if (!requests || !Array.isArray(requests)) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Requests field is required and must be an array.',
            status: 'INVALID_ARGUMENT'
          }
        });
        return;
      }

      // Validate each request
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        if (!request.id || !request.request) {
          res.status(400).json({
            error: {
              code: 400,
              message: `Request at index ${i} is missing required fields: id, request`,
              status: 'INVALID_ARGUMENT'
            }
          });
          return;
        }
      }

      // Add project and location to each request
      const batchRequests = requests.map((req: any) => ({
        ...req,
        projectId,
        location
      }));

      const jobId = await batchService.submitBatchJob(batchRequests);

      res.status(201).json({
        jobId,
        status: 'PENDING',
        message: `Batch job ${jobId} submitted successfully`
      });
    } catch (error) {
      console.error('Error submitting batch job:', error);
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
 * Get batch job status
 * GET /projects/{project}/locations/{location}/batch/{jobId}
 */
router.get('/projects/:projectId/locations/:location/batch/:jobId',
  validateProjectAndLocation,
  (req: ProjectValidationRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = batchService.getBatchJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Batch job ${jobId} not found.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      // Return job status without full responses
      const jobStatus = {
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.progress
      };

      res.json(jobStatus);
    } catch (error) {
      console.error('Error getting batch job status:', error);
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
 * Get batch job results
 * GET /projects/{project}/locations/{location}/batch/{jobId}/results
 */
router.get('/projects/:projectId/locations/:location/batch/:jobId/results',
  validateProjectAndLocation,
  (req: ProjectValidationRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = batchService.getBatchJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Batch job ${jobId} not found.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      if (job.status !== 'COMPLETED') {
        res.status(400).json({
          error: {
            code: 400,
            message: `Batch job ${jobId} is not completed. Current status: ${job.status}`,
            status: 'INVALID_ARGUMENT'
          }
        });
        return;
      }

      const results = batchService.getBatchJobResults(jobId);
      res.json({
        jobId,
        status: job.status,
        progress: job.progress,
        results: results || []
      });
    } catch (error) {
      console.error('Error getting batch job results:', error);
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
 * Cancel a batch job
 * DELETE /projects/{project}/locations/{location}/batch/{jobId}
 */
router.delete('/projects/:projectId/locations/:location/batch/:jobId',
  validateProjectAndLocation,
  (req: ProjectValidationRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const cancelled = batchService.cancelBatchJob(jobId);

      if (!cancelled) {
        res.status(404).json({
          error: {
            code: 404,
            message: `Batch job ${jobId} not found or cannot be cancelled.`,
            status: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json({
        success: true,
        message: `Batch job ${jobId} cancelled successfully`
      });
    } catch (error) {
      console.error('Error cancelling batch job:', error);
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
 * List all batch jobs
 * GET /projects/{project}/locations/{location}/batch
 */
router.get('/projects/:projectId/locations/:location/batch',
  validateProjectAndLocation,
  (req: ProjectValidationRequest, res: Response) => {
    try {
      const jobs = batchService.listBatchJobs();
      
      // Return simplified job list
      const jobList = jobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.progress
      }));

      res.json({
        jobs: jobList,
        total: jobList.length
      });
    } catch (error) {
      console.error('Error listing batch jobs:', error);
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
 * Get batch processing statistics
 * GET /admin/batch/stats
 */
router.get('/admin/batch/stats', (req: Request, res: Response) => {
  try {
    const stats = batchService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting batch stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch processing statistics'
    });
  }
});

/**
 * Cleanup old batch jobs
 * POST /admin/batch/cleanup
 */
router.post('/admin/batch/cleanup', (req: Request, res: Response) => {
  try {
    const { maxAge } = req.body;
    batchService.cleanupOldJobs(maxAge);
    
    const stats = batchService.getStats();
    res.json({
      success: true,
      message: 'Batch jobs cleanup completed',
      data: stats
    });
  } catch (error) {
    console.error('Error cleaning up batch jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup batch jobs'
    });
  }
});

export default router; 