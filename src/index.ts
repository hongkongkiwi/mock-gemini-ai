import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import vertexAiRoutes from './routes/vertex-ai';
import googleAiRoutes from './routes/google-ai';
import adminRoutes from './routes/admin';
import filesRoutes from './routes/files';
import publisherRoutes from './routes/publishers';
import cachedContentRoutes from './routes/cached-content';
import { createGoogleCloudError } from './middleware/google-cloud-errors';
import { 
  createMockGeminiService, 
  createMockGeminiServiceForProject, 
  createMockGeminiServiceWithPresets,
  createGoogleAIService,
  createVertexAIService,
  createServiceForAPIType,
  MockGeminiService
} from './services/mock-service';
import { PresetResponse } from './data/preset-responses';
import { FinishReason } from './types/vertex-ai';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Example: Create multiple service instances with different configurations
const defaultVertexAIService = createMockGeminiService();

// API-specific service instances
const customVertexAIService = createVertexAIService({
  googleCloud: {
    defaultProjectId: 'vertex-ai-project',
    defaultLocation: 'us-central1'
  }
});

// Fast services for testing
const fastVertexAIService = createVertexAIService({
  mockDelayMs: 10,
  googleCloud: {
    defaultProjectId: 'fast-vertex-project',
    defaultLocation: 'us-central1'
  }
});

// Example: Service with custom presets
const customPresets: PresetResponse[] = [
  {
    id: 'custom-greeting',
    name: 'Custom Greeting',
    description: 'Custom greeting response',
    trigger: {
      type: 'text',
      value: 'custom hello'
    },
    response: {
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello from custom service!' }],
            role: 'model'
          },
          finishReason: FinishReason.STOP,
          index: 0
        }
      ],
      usageMetadata: {
        promptTokenCount: 2,
        candidatesTokenCount: 3,
        totalTokenCount: 5
      }
    }
  }
];

const customPresetsVertexAIService = createMockGeminiServiceWithPresets(customPresets);

// Create Google AI services asynchronously
let defaultGoogleAIService: any;
let customGoogleAIService: any;
let fastGoogleAIService: any;
let customPresetsGoogleAIService: any;

async function initializeGoogleAIServices() {
  defaultGoogleAIService = await createGoogleAIService();
  
  customGoogleAIService = await createGoogleAIService({
    mockDelayMs: 50,
    googleAI: {
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com'
    }
  });
  
  fastGoogleAIService = await createGoogleAIService({
    mockDelayMs: 10
  });
  
  customPresetsGoogleAIService = await createGoogleAIService({
    presetResponses: customPresets
  });
}

// Middleware to inject custom service instances based on headers or query params
app.use((req, res, next) => {
  const serviceType = req.headers['x-mock-service-type'] || req.query.serviceType;
  const apiType = req.headers['x-api-type'] || req.query.apiType || 'vertex-ai';
  
  if (apiType === 'google-ai') {
    if (serviceType === 'fast') {
      req.customGoogleAIService = fastGoogleAIService;
    } else if (serviceType === 'custom-presets') {
      req.customGoogleAIService = customPresetsGoogleAIService;
    } else {
      req.customGoogleAIService = defaultGoogleAIService;
    }
  } else {
    // Vertex AI (default)
    if (serviceType === 'custom-project') {
      req.customMockService = customVertexAIService;
    } else if (serviceType === 'fast') {
      req.customMockService = fastVertexAIService;
    } else if (serviceType === 'custom-presets') {
      req.customMockService = customPresetsVertexAIService;
    } else {
      req.customMockService = defaultVertexAIService;
    }
  }
  
  next();
});

// Mount routes
app.use('/v1', vertexAiRoutes);    // Vertex AI routes
app.use('/', googleAiRoutes);       // Google AI routes (mounted at root)
app.use('/v1', filesRoutes);
app.use('/v1', publisherRoutes);
app.use('/v1', cachedContentRoutes); // Context Caching routes
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    supportedAPIs: ['vertex-ai', 'google-ai']
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const googleCloudError = createGoogleCloudError(500, 'Internal server error');
  res.status(500).json(googleCloudError);
});

// 404 handler
app.use('*', (req, res) => {
  const notFoundError = createGoogleCloudError(404, `Path not found: ${req.originalUrl}`);
  res.status(404).json(notFoundError);
});

// Start server
async function startServer() {
  // Initialize Google AI services
  await initializeGoogleAIServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 Mock Gemini API server running on port ${PORT}`);
    console.log(`📖 Documentation: http://localhost:${PORT}/admin/docs`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n📊 Multiple service instances configured:`);
    console.log(`   🔹 Vertex AI (default): environment-based configuration`);
    console.log(`   🔹 Google AI (default): simple API key authentication`);
    console.log(`   🔹 Custom project services: different project/location settings`);
    console.log(`   🔹 Fast services: 10ms delay for testing`);
    console.log(`   🔹 Custom presets services: custom greeting responses`);
    console.log(`\n💡 API Selection:`);
    console.log(`   • Use header 'x-api-type' or query param 'apiType' to choose API (vertex-ai|google-ai)`);
    console.log(`   • Use header 'x-mock-service-type' or query param 'serviceType' to switch services`);
    console.log(`\n🔗 API Endpoints:`);
    console.log(`   • Vertex AI: /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`);
    console.log(`   • Google AI: /v1beta/models/{model}:generateContent`);
    console.log(`\n🔑 Authentication:`);
    console.log(`   • Vertex AI: Bearer token (Authorization: Bearer <token>)`);
    console.log(`   • Google AI: API key (x-goog-api-key: <key> or ?key=<key>)`);
  });
}

startServer().catch(console.error);

export default app; 