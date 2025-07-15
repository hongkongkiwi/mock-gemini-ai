export interface MockConfig {
  /** Port for the server */
  port: number;
  
  /** Node environment */
  nodeEnv: string;
  
  /** Log level */
  logLevel: string;
  
  /** Mock API delay in milliseconds */
  mockDelayMs: number;
  
  /** Whether streaming is enabled */
  enableStreaming: boolean;
  
  /** Default model name */
  defaultModel: string;
  
  /** CORS origin */
  corsOrigin: string;
  
  /** Google Cloud Project validation */
  googleCloud: {
    /** If set, only allow requests with this project ID. If not set, allow any project ID */
    enforceProjectId?: string;
    
    /** If set, only allow requests with this location. If not set, allow any location */
    enforceLocation?: string;
    
    /** Default project ID to use in model names and responses */
    defaultProjectId: string;
    
    /** Default location to use in model names and responses */
    defaultLocation: string;
  };
}

export const mockConfig: MockConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  mockDelayMs: parseInt(process.env.MOCK_DELAY_MS || '100', 10),
  enableStreaming: process.env.ENABLE_STREAMING !== 'false',
  defaultModel: process.env.DEFAULT_MODEL || 'gemini-1.5-pro',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  googleCloud: {
    enforceProjectId: process.env.GOOGLE_CLOUD_ENFORCE_PROJECT_ID || undefined,
    enforceLocation: process.env.GOOGLE_CLOUD_ENFORCE_LOCATION || undefined,
    defaultProjectId: process.env.GOOGLE_CLOUD_DEFAULT_PROJECT_ID || 'mock-project',
    defaultLocation: process.env.GOOGLE_CLOUD_DEFAULT_LOCATION || 'us-central1'
  }
};

export default mockConfig; 