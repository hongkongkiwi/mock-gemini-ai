import { 
  GenerateContentRequest,
  GenerateContentResponse,
  BatchPredictionJob
} from '../types/vertex-ai';
import { MockGeminiService } from './mock-service';

interface BatchRequest {
  id: string;
  request: GenerateContentRequest;
  modelName?: string;
  projectId?: string;
  location?: string;
}

interface BatchResponse {
  id: string;
  response?: GenerateContentResponse;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

interface BatchJob {
  jobId: string;
  requests: BatchRequest[];
  responses: BatchResponse[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

/**
 * Batch Processing Service for high-throughput scenarios
 */
export class BatchProcessingService {
  private jobs: Map<string, BatchJob> = new Map();
  private jobIdCounter = 1;
  private mockService: MockGeminiService;
  private maxConcurrentRequests: number;
  private batchTimeout: number;

  constructor(
    mockService: MockGeminiService,
    maxConcurrentRequests: number = 10,
    batchTimeout: number = 300000 // 5 minutes
  ) {
    this.mockService = mockService;
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.batchTimeout = batchTimeout;
  }

  /**
   * Submit a batch job
   */
  async submitBatchJob(requests: BatchRequest[]): Promise<string> {
    const jobId = `batch-job-${this.jobIdCounter++}`;
    
    const job: BatchJob = {
      jobId,
      requests,
      responses: [],
      status: 'PENDING',
      createdAt: new Date(),
      progress: {
        total: requests.length,
        completed: 0,
        failed: 0
      }
    };

    this.jobs.set(jobId, job);

    // Start processing asynchronously
    this.processBatchJob(jobId).catch(error => {
      console.error(`Error processing batch job ${jobId}:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'FAILED';
        failedJob.completedAt = new Date();
      }
    });

    return jobId;
  }

  /**
   * Get batch job status
   */
  getBatchJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get batch job results
   */
  getBatchJobResults(jobId: string): BatchResponse[] | null {
    const job = this.jobs.get(jobId);
    return job ? job.responses : null;
  }

  /**
   * Cancel a batch job
   */
  cancelBatchJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'COMPLETED') {
      job.status = 'FAILED';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * List all batch jobs
   */
  listBatchJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Process multiple requests concurrently
   */
  async processRequestsBatch(
    requests: BatchRequest[],
    maxConcurrent: number = this.maxConcurrentRequests
  ): Promise<BatchResponse[]> {
    const results: BatchResponse[] = [];
    
    // Process requests in chunks
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const chunk = requests.slice(i, i + maxConcurrent);
      
      const chunkPromises = chunk.map(async (batchRequest) => {
        try {
          const response = await this.mockService.generateContent(
            batchRequest.request,
            batchRequest.modelName,
            batchRequest.projectId,
            batchRequest.location
          );

          return {
            id: batchRequest.id,
            response
          };
        } catch (error) {
          return {
            id: batchRequest.id,
            error: {
              code: 500,
              message: error instanceof Error ? error.message : 'Unknown error',
              status: 'INTERNAL'
            }
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Get batch processing statistics
   */
  getStats(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgProcessingTime: number;
  } {
    const allJobs = Array.from(this.jobs.values());
    const activeJobs = allJobs.filter(job => job.status === 'RUNNING' || job.status === 'PENDING');
    const completedJobs = allJobs.filter(job => job.status === 'COMPLETED');
    const failedJobs = allJobs.filter(job => job.status === 'FAILED');

    let totalProcessingTime = 0;
    let jobsWithTiming = 0;

    for (const job of completedJobs) {
      if (job.startedAt && job.completedAt) {
        totalProcessingTime += job.completedAt.getTime() - job.startedAt.getTime();
        jobsWithTiming++;
      }
    }

    return {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      avgProcessingTime: jobsWithTiming > 0 ? totalProcessingTime / jobsWithTiming : 0
    };
  }

  /**
   * Cleanup old completed jobs
   */
  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        const completedTime = job.completedAt || job.createdAt;
        if (now.getTime() - completedTime.getTime() > maxAge) {
          jobsToDelete.push(jobId);
        }
      }
    }

    jobsToDelete.forEach(jobId => {
      this.jobs.delete(jobId);
    });
  }

  // Private methods

  private async processBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Batch job ${jobId} not found`);
    }

    job.status = 'RUNNING';
    job.startedAt = new Date();

    // Set timeout for the entire job
    const timeoutHandle = setTimeout(() => {
      job.status = 'FAILED';
      job.completedAt = new Date();
    }, this.batchTimeout);

    try {
      const responses = await this.processRequestsBatch(job.requests);
      
      // Update progress and responses
      job.responses = responses;
      job.progress.completed = responses.filter(r => r.response).length;
      job.progress.failed = responses.filter(r => r.error).length;
      
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      
      clearTimeout(timeoutHandle);
    } catch (error) {
      job.status = 'FAILED';
      job.completedAt = new Date();
      clearTimeout(timeoutHandle);
      throw error;
    }
  }
}

// Export singleton instance factory
export function createBatchProcessingService(
  mockService: MockGeminiService,
  maxConcurrentRequests?: number,
  batchTimeout?: number
): BatchProcessingService {
  return new BatchProcessingService(mockService, maxConcurrentRequests, batchTimeout);
} 