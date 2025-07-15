# Mock Gemini API

> **A comprehensive TypeScript-based mock server that replicates both Google Vertex AI and Google AI APIs for seamless testing and development.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-brightgreen.svg)](https://vitest.dev/)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mock-gemini-api

# Install dependencies
pnpm install

# Setup environment
cp env.example .env

# Start development server
pnpm dev
```

The server will start at `http://localhost:3000` with hot reload enabled.

### Basic Usage

```bash
# Test the API
curl -X POST "http://localhost:3000/v1/projects/test-project/locations/us-central1/publishers/google/models/gemini-1.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"contents":[{"parts":[{"text":"Hello!"}]}]}'
```

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [API Types & Configuration](#api-types--configuration)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### 🎯 **Dual API Support**
- **Vertex AI API**: Full Google Cloud Vertex AI compatibility
- **Google AI API**: Direct Google AI (Gemini) API compatibility
- **Configurable**: Switch between API types via environment variables

### 🔧 **Production-Ready Features**
- ✅ **Official Types**: Uses official Google AI and Vertex AI TypeScript types
- ✅ **Streaming Support**: Server-Sent Events with real-time responses
- ✅ **File Handling**: Upload, store, and reference files in API calls
- ✅ **Authentication**: Bearer token simulation
- ✅ **Error Handling**: Authentic Google Cloud error formats
- ✅ **CORS Support**: Configurable cross-origin requests
- ✅ **Health Checks**: Monitoring and status endpoints

### 🧠 **Advanced AI Features**
- ✅ **Structured Output**: JSON schema and enum response support
- ✅ **Token Counting**: Accurate token estimation
- ✅ **Embeddings**: Text embedding generation
- ✅ **Safety Settings**: Content safety simulation
- ✅ **Function Calling**: Tool use and function calling support
- ✅ **Multimodal**: Image, audio, and video processing simulation

### 🎛️ **Management & Testing**
- ✅ **Preset Responses**: Configurable mock responses with flexible matching
- ✅ **Admin Interface**: Web-based preset management
- ✅ **Integration Tests**: Compare with real APIs
- ✅ **Comprehensive Testing**: Unit, integration, and E2E test suites
- ✅ **Developer Tools**: Hot reload, logging, and debugging

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Google AI SDK     │    │   Vertex AI SDK     │
│  (@google/generative│    │ (@google-cloud/     │
│      -ai)           │    │    vertexai)        │
└─────────┬───────────┘    └─────────┬───────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────────┐
│            Mock Gemini API                      │
│  ┌─────────────────┐ ┌─────────────────────────┐│
│  │  Google AI      │ │    Vertex AI            ││
│  │  Service        │ │    Service              ││
│  │  - Simpler API  │ │    - Full Cloud API     ││
│  │  - Direct calls │ │    - Project/Location   ││
│  └─────────────────┘ └─────────────────────────┘│
│  ┌─────────────────────────────────────────────┐│
│  │         Shared Components                   ││
│  │  • Mock Response Engine                     ││
│  │  • Structured Output Generator             ││
│  │  • Token Counter                           ││
│  │  • File Manager                            ││
│  │  • Preset Response Manager                 ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Key Components

- **Service Layer**: Handles business logic for both API types
- **Route Handlers**: Express routes for different API endpoints
- **Mock Engine**: Intelligent response generation and matching
- **Type System**: Official Google types for maximum compatibility
- **Storage**: In-memory storage with optional persistence

## 🔧 API Types & Configuration

### Supported API Types

| API Type | Description | Use Case | Authentication | Endpoint Format |
|----------|-------------|----------|---------------|-----------------|
| `vertex-ai` | Full Google Cloud Vertex AI API | Enterprise, GCP integration | Bearer token | `/v1/projects/{project}/locations/{location}/...` |
| `google-ai` | Direct Google AI (Gemini) API | Simple apps, prototyping | API Key (`x-goog-api-key`) | `/v1/models/{model}:...` |

### Key Differences

| Feature | Google AI | Vertex AI |
|---------|-----------|-----------|
| **Authentication** | API Key header | Bearer token |
| **Model Names** | Simple: `gemini-pro` | Full paths: `projects/{project}/locations/{location}/publishers/google/models/{model}` |
| **Complexity** | Simpler structure | More complex with project/location context |
| **Use Case** | Individual developers | Enterprise, production |

### Configuration Examples

#### Google AI Setup
```bash
# Environment
API_TYPE=google-ai
GOOGLE_AI_API_KEY=your-api-key

# Usage
curl -H "x-goog-api-key: test-key" \
     "http://localhost:3000/v1/models/gemini-pro:generateContent"
```

#### Vertex AI Setup  
```bash
# Environment
API_TYPE=vertex-ai
GOOGLE_CLOUD_DEFAULT_PROJECT_ID=your-project
GOOGLE_CLOUD_DEFAULT_LOCATION=us-central1

# Usage
curl -H "Authorization: Bearer test-token" \
     "http://localhost:3000/v1/projects/test-project/locations/us-central1/publishers/google/models/gemini-pro:generateContent"
```

Set the API type in your environment:

```env
# Choose API type
API_TYPE=vertex-ai  # or 'google-ai'

# Vertex AI Configuration
GOOGLE_CLOUD_DEFAULT_PROJECT_ID=your-project
GOOGLE_CLOUD_DEFAULT_LOCATION=us-central1

# Google AI Configuration  
GOOGLE_AI_API_KEY=your-api-key
GOOGLE_AI_BASE_URL=https://generativelanguage.googleapis.com
```

## 🛠️ Installation & Setup

### Development Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd mock-gemini-api
pnpm install

# 2. Environment setup
cp env.example .env
# Edit .env with your configuration

# 3. Development server
pnpm dev          # Start with hot reload
```

### Production Setup

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Or use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name mock-gemini-api
```

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mock-gemini-api .
docker run -p 3000:3000 -e API_TYPE=vertex-ai mock-gemini-api
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `API_TYPE` | `vertex-ai` | API type (`vertex-ai` or `google-ai`) |
| `MOCK_DELAY_MS` | `100` | Response delay simulation |
| `ENABLE_STREAMING` | `true` | Enable streaming responses |
| `DEFAULT_MODEL` | `gemini-1.5-pro` | Default model name |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

### API-Specific Configuration

#### Vertex AI Configuration
```env
GOOGLE_CLOUD_DEFAULT_PROJECT_ID=my-project
GOOGLE_CLOUD_DEFAULT_LOCATION=us-central1
GOOGLE_CLOUD_ENFORCE_PROJECT_ID=  # Optional: restrict to specific project
GOOGLE_CLOUD_ENFORCE_LOCATION=    # Optional: restrict to specific location
```

#### Google AI Configuration
```env
GOOGLE_AI_API_KEY=your-api-key
GOOGLE_AI_BASE_URL=https://generativelanguage.googleapis.com
```

### Project and Location Flexibility

The API supports flexible project and location handling:

```bash
# Allow any project/location (default)
GOOGLE_CLOUD_ENFORCE_PROJECT_ID=
GOOGLE_CLOUD_ENFORCE_LOCATION=

# Restrict to specific project/location
GOOGLE_CLOUD_ENFORCE_PROJECT_ID=my-specific-project
GOOGLE_CLOUD_ENFORCE_LOCATION=us-central1
```

### Multiple Service Instances

Create different service configurations for various scenarios:

```typescript
import { createMockGeminiService } from './services/mock-service';

// Fast testing service
const testService = createMockGeminiService({
  mockDelayMs: 10,
  safety: { includeSafetyRatings: false }
});

// Production-like service
const prodService = createMockGeminiService({
  mockDelayMs: 200,
  googleCloud: {
    defaultProjectId: 'prod-project',
    defaultLocation: 'us-central1'
  }
});
```

Use different services via headers:
```bash
curl -H "x-mock-service-type: fast" \
     -H "Authorization: Bearer token" \
     "http://localhost:3000/v1/projects/test/locations/us-central1/publishers/google/models/gemini-pro:generateContent"
```

### Integration Test Configuration
```env
# Enable integration tests
RUN_INTEGRATION_TESTS=false
COMPARE_WITH_REAL_APIS=false

# For real API comparison
GOOGLE_AI_API_KEY=your-real-api-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## 📚 API Reference

### Vertex AI Endpoints

#### Content Generation
```
POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:streamGenerateContent
```

#### Token & Embedding
```
POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:countTokens
POST /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:embedContent
```

#### Model Management
```
GET /v1/projects/{project}/locations/{location}/publishers/google/models
GET /v1/projects/{project}/locations/{location}/publishers/google/models/{model}
```

#### File Management
```
POST /v1/projects/{project}/locations/{location}/files
GET /v1/projects/{project}/locations/{location}/files
GET /v1/projects/{project}/locations/{location}/files/{file}
DELETE /v1/projects/{project}/locations/{location}/files/{file}
```

### Google AI Endpoints

#### Content Generation
```
POST /v1/models/{model}:generateContent
POST /v1/models/{model}:streamGenerateContent
```

#### Token & Embedding
```
POST /v1/models/{model}:countTokens
POST /v1/models/{model}:embedContent
```

#### Model Management
```
GET /v1/models
GET /v1/models/{model}
```

### Admin Endpoints
```
GET /admin/health          # Health check
GET /admin/docs            # API documentation
GET /admin/presets         # List preset responses
POST /admin/presets        # Create preset response
PUT /admin/presets/{id}    # Update preset response
DELETE /admin/presets/{id} # Delete preset response
```

## 💡 Usage Examples

### Basic Content Generation

<details>
<summary><strong>Vertex AI Example</strong></summary>

```bash
curl -X POST "http://localhost:3000/v1/projects/test-project/locations/us-central1/publishers/google/models/gemini-1.5-pro:generateContent" \
  -H "Authorization: Bearer mock-token" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [{"text": "Explain quantum computing"}],
        "role": "user"
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1024
    }
  }'
```
</details>

<details>
<summary><strong>Google AI Example</strong></summary>

```bash
curl -X POST "http://localhost:3000/v1/models/gemini-1.5-pro:generateContent" \
  -H "x-goog-api-key: mock-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [{"text": "Explain quantum computing"}]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1024
    }
  }'
```
</details>

### Structured Output (JSON Schema)

<details>
<summary><strong>Recipe Generation</strong></summary>

```javascript
const request = {
  contents: [{
    parts: [{ text: "Generate a recipe for chocolate chip cookies" }]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        recipeName: { type: "STRING" },
        ingredients: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        instructions: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        cookingTime: { type: "INTEGER" }
      },
      required: ["recipeName", "ingredients", "instructions"]
    }
  }
};
```
</details>

<details>
<summary><strong>Data Extraction</strong></summary>

```javascript
const request = {
  contents: [{
    parts: [{ text: "Extract contact info: John Doe (555) 123-4567 john@example.com" }]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          email: { type: "STRING" }
        },
        required: ["name"]
      }
    }
  }
};
```
</details>

### Enum Classification

<details>
<summary><strong>Sentiment Analysis</strong></summary>

```javascript
const request = {
  contents: [{
    parts: [{ text: "This product is absolutely amazing!" }]
  }],
  generationConfig: {
    responseMimeType: "text/x.enum",
    responseSchema: {
      type: "STRING",
      enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"]
    }
  }
};
// Response: "POSITIVE"
```
</details>

### Streaming Responses

<details>
<summary><strong>Real-time Streaming</strong></summary>

```javascript
// Using the official SDK
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: 'test-project',
  location: 'us-central1',
  apiEndpoint: 'http://localhost:3000'
});

const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
const request = { contents: [{ parts: [{ text: 'Write a story' }] }] };

const stream = await model.generateContentStream(request);
for await (const chunk of stream.stream) {
  console.log(chunk.candidates[0].content.parts[0].text);
}
```
</details>

### File Upload and Processing

<details>
<summary><strong>Image Analysis</strong></summary>

```bash
# 1. Upload file
curl -X POST "http://localhost:3000/v1/projects/test-project/locations/us-central1/files" \
  -H "Authorization: Bearer mock-token" \
  -F "file=@image.jpg"

# Response: {"name": "files/1234567890", "uri": "files/1234567890"}

# 2. Use in generation
curl -X POST "http://localhost:3000/v1/projects/test-project/locations/us-central1/publishers/google/models/gemini-1.5-pro:generateContent" \
  -H "Authorization: Bearer mock-token" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "Describe this image"},
        {"fileData": {"mimeType": "image/jpeg", "fileUri": "files/1234567890"}}
      ]
    }]
  }'
```
</details>

## 🧪 Testing

### Test Structure

```
__tests__/
├── services/
│   ├── mock-service.test.ts      # Unit tests for mock services
│   └── integration.test.ts       # Integration tests with real APIs
└── test-setup.ts                 # Test configuration
```

### Running Tests

```bash
# Unit tests only (fast, no API keys needed)
pnpm test:unit

# Integration tests (structure validation)
pnpm test:integration

# End-to-end tests with real APIs (requires API keys)
pnpm test:integration:real

# All tests with coverage
pnpm test:coverage
```

### Integration Testing

Our integration tests compare mock responses with real API responses:

<details>
<summary><strong>Test Categories</strong></summary>

- **Response Structure**: Validates identical response formats
- **Token Counting**: Ensures ±50% accuracy with real APIs
- **Streaming**: Compares chunk generation patterns
- **Embeddings**: Validates vector dimensions and ranges
- **JSON Schema**: Confirms structured output compatibility
- **Error Handling**: Tests consistent error behaviors
- **Performance**: Measures response time differences

</details>

<details>
<summary><strong>Setup for Real API Testing</strong></summary>

```bash
# Set up API keys
export GOOGLE_AI_API_KEY="your-api-key"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Enable real API comparison
export COMPARE_WITH_REAL_APIS=true

# Run tests
pnpm test:integration:real
```

Expected output:
```
✅ Mock and real API have similar response structures
✅ Token counts: Mock=24, Real=23, Ratio=1.04
✅ Mock is 83.1x faster
✅ Both generate valid JSON following schema
```

</details>

### Cost Considerations

⚠️ **Warning**: Real API tests consume quota and may incur charges:
- Google AI: ~20-30 requests per test run
- Vertex AI: Pay-per-use pricing applies
- Consider running only during scheduled CI builds

### Integration Test Setup

To run tests against real APIs:

1. **Google AI API**: Get API key from [Google AI Studio](https://aistudio.google.com/)
2. **Vertex AI**: Set up service account with Vertex AI permissions
3. **Environment**: Set `COMPARE_WITH_REAL_APIS=true` and API credentials

```env
# Integration test configuration
RUN_INTEGRATION_TESTS=true
COMPARE_WITH_REAL_APIS=true
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

## 👨‍💻 Development

### Development Workflow

```bash
# Start development environment
pnpm dev                 # Hot reload server

# Code quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix linting issues
pnpm test:unit          # Run unit tests
pnpm test:integration   # Run integration tests

# Build
pnpm build              # TypeScript compilation
pnpm start              # Production server
```

### Project Structure

```
mock-gemini-api/
├── __tests__/            # Test files (organized separately)
│   ├── services/         # Service-specific tests
│   │   ├── mock-service.test.ts    # Unit tests
│   │   └── integration.test.ts     # Integration tests
│   └── test-setup.ts     # Test configuration
├── src/                  # Source code
│   ├── data/             # Preset responses and mock data
│   │   └── preset-responses.ts
│   ├── middleware/       # Express middleware
│   │   └── google-cloud-errors.ts
│   ├── routes/           # API route handlers
│   │   ├── admin.ts      # Admin endpoints
│   │   ├── files.ts      # File management
│   │   ├── google-ai.ts  # Google AI API routes
│   │   ├── publishers.ts # Publisher model routes
│   │   └── vertex-ai.ts  # Vertex AI routes
│   ├── services/         # Business logic
│   │   ├── mock-service.ts        # Core mock service
│   │   └── google-ai-service.ts   # Google AI implementation
│   ├── types/            # TypeScript definitions
│   │   ├── vertex-ai.ts  # Vertex AI types
│   │   ├── google-ai.ts  # Google AI types
│   │   └── cached-contents.ts
│   └── index.ts          # Application entry point
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── env.example
└── README.md
```

### Adding New Features

<details>
<summary><strong>Adding a New Endpoint</strong></summary>

1. **Define Types** (if needed):
```typescript
// src/types/vertex-ai.ts
export interface NewFeatureRequest {
  // Define request structure
}
```

2. **Add Service Method**:
```typescript
// src/services/mock-service.ts
async newFeature(request: NewFeatureRequest): Promise<NewFeatureResponse> {
  // Implementation
}
```

3. **Create Route Handler**:
```typescript
// src/routes/vertex-ai.ts
router.post('/:model:newFeature', async (req, res) => {
  const response = await mockService.newFeature(req.body);
  res.json(response);
});
```

4. **Add Tests**:
```typescript
// src/services/mock-service.test.ts
describe('newFeature', () => {
  it('should handle new feature requests', async () => {
    // Test implementation
  });
});
```

</details>

### Debugging

<details>
<summary><strong>Debug Configuration</strong></summary>

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Mock API",
  "program": "${workspaceFolder}/src/index.ts",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "runtimeArgs": ["-r", "tsx/cjs"],
  "env": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug"
  }
}
```

</details>

### Code Style

This project uses:
- **ESLint**: Code linting and style enforcement
- **TypeScript**: Type safety and modern JavaScript features
- **Prettier**: Code formatting (configured via ESLint)

## 🚀 Deployment

### Environment-Specific Configurations

<details>
<summary><strong>Development</strong></summary>

```env
NODE_ENV=development
LOG_LEVEL=debug
MOCK_DELAY_MS=10
ENABLE_STREAMING=true
```

</details>

<details>
<summary><strong>Production</strong></summary>

```env
NODE_ENV=production
LOG_LEVEL=info
MOCK_DELAY_MS=100
ENABLE_STREAMING=true
PORT=3000
```

</details>

### Docker Deployment

<details>
<summary><strong>Production Dockerfile</strong></summary>

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

</details>

<details>
<summary><strong>Docker Compose</strong></summary>

```yaml
version: '3.8'
services:
  mock-gemini-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_TYPE=vertex-ai
      - GOOGLE_CLOUD_DEFAULT_PROJECT_ID=test-project
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/admin/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

</details>

### Kubernetes Deployment

<details>
<summary><strong>Kubernetes Manifests</strong></summary>

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mock-gemini-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mock-gemini-api
  template:
    metadata:
      labels:
        app: mock-gemini-api
    spec:
      containers:
      - name: mock-gemini-api
        image: mock-gemini-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_TYPE
          value: "vertex-ai"
        livenessProbe:
          httpGet:
            path: /admin/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: mock-gemini-api-service
spec:
  selector:
    app: mock-gemini-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

</details>

### Cloud Deployment

<details>
<summary><strong>Google Cloud Run</strong></summary>

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/mock-gemini-api
gcloud run deploy mock-gemini-api \
  --image gcr.io/PROJECT_ID/mock-gemini-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars API_TYPE=vertex-ai
```

</details>

## 🤝 Contributing

### Development Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Develop** your changes with tests
4. **Test** thoroughly: `pnpm test:unit && pnpm test:integration`
5. **Lint** your code: `pnpm lint:fix`
6. **Commit** with clear messages
7. **Push** and create a Pull Request

### Code Standards

- **TypeScript**: All code must be properly typed
- **Tests**: New features require unit tests
- **Documentation**: Update README and inline docs
- **Compatibility**: Maintain API compatibility
- **Performance**: Consider performance implications

### Pull Request Guidelines

<details>
<summary><strong>PR Checklist</strong></summary>

- [ ] Tests pass (`pnpm test:unit`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compiles (`pnpm build`)
- [ ] Documentation updated
- [ ] Integration tests considered
- [ ] Breaking changes documented
- [ ] Performance impact assessed

</details>

## 🔍 Troubleshooting

### Common Issues

<details>
<summary><strong>Server Won't Start</strong></summary>

**Problem**: Server fails to start or crashes immediately

**Solutions**:
```bash
# Check port availability
lsof -i :3000

# Verify environment configuration
cat .env

# Check for TypeScript errors
pnpm build

# Enable debug logging
LOG_LEVEL=debug pnpm dev
```

</details>

<details>
<summary><strong>API Compatibility Issues</strong></summary>

**Problem**: Responses don't match expected format

**Solutions**:
- Verify `API_TYPE` setting matches your client SDK
- Check model names match expected format
- Review request structure in logs
- Compare with integration test examples

</details>

<details>
<summary><strong>Integration Test Failures</strong></summary>

**Problem**: Tests fail when comparing with real APIs

**Solutions**:
```bash
# Check API key validity
curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Verify service account permissions
gcloud auth list

# Test with minimal request
pnpm test:integration:real --reporter=verbose
```

</details>

<details>
<summary><strong>Performance Issues</strong></summary>

**Problem**: Slow response times or high memory usage

**Solutions**:
- Reduce `MOCK_DELAY_MS` for faster responses
- Check for memory leaks in long-running processes
- Monitor with: `node --inspect dist/index.js`
- Use clustering: `pm2 start dist/index.js -i max`

</details>

<details>
<summary><strong>Project/Location Access Denied</strong></summary>

**Problem**: 403 errors with enforced project/location settings

**Solutions**:
- Check `GOOGLE_CLOUD_ENFORCE_PROJECT_ID` matches request
- Verify `GOOGLE_CLOUD_ENFORCE_LOCATION` allows your location
- Use correct project/location in API endpoint URLs

</details>

### Debugging Tools

<details>
<summary><strong>Health Check Endpoint</strong></summary>

```bash
curl http://localhost:3000/admin/health
```

Response includes:
- Server status
- Memory usage
- Environment configuration
- Active connections

</details>

<details>
<summary><strong>Request Logging</strong></summary>

Enable detailed request logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

</details>

## 📊 Supported Models

<details>
<summary><strong>Complete Model List</strong></summary>

| Model | Input | Output | Token Limits |
|-------|-------|--------|--------------|
| `gemini-2.5-pro-preview-0325` | Text, Image, Audio, Video | Text | 2M/8K |
| `gemini-2.0-flash` | Text, Image, Audio, Video | Text, Image, Audio | 1M/8K |
| `gemini-2.0-flash-lite` | Text, Image, Audio, Video | Text | 1M/8K |
| `gemini-1.5-flash` | Text, Image, Audio, Video | Text | 1M/8K |
| `gemini-1.5-flash-8b` | Text, Image, Audio, Video | Text | 1M/8K |
| `gemini-1.5-pro` | Text, Image, Audio, Video | Text | 2M/8K |
| `text-embedding-004` | Text | Embeddings | 3K/- |
| `gemini-embedding-exp` | Text | Embeddings | 2K/- |
| `imagen-3.0-generate-002` | Text | Images | 1K/- |
| `veo-2.0-generate-001` | Text, Images | Video | 1K/- |

All models support the same API interface with automatic token limit validation.

</details>

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Resources

- **[Google AI Documentation](https://ai.google.dev/docs)**: Official Google AI docs
- **[Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)**: Official Vertex AI docs

## 💬 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📖 **Documentation**: Available at `/admin/docs` when server is running
- 🏥 **Health Status**: Available at `/admin/health`

---

**Made with ❤️ for the AI development community**